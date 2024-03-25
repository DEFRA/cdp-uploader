import path from 'path'

import { moveS3Object } from '~/src/server/scan/move-s3-object'
import { DeleteSqsMessage } from '~/src/server/scan/delete-sqs-message'
import { config } from '~/src/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'
import { triggerCallback } from '~/src/server/scan/trigger-callback'
import {
  uploadStatus,
  canBeScanned,
  canBeDelivered,
  canBeAcknowledged
} from '~/src/server/common/upload-status'
import {
  storeUploadDetails,
  findUploadDetails
} from '~/src/server/common/helpers/upload-details-redis'

const logger = createLogger()
const quarantineBucket = config.get('quarantineBucket')
const scanResultQueue = config.get('sqsScanResults')

async function handleScanResult(server, payload, receiptHandle) {
  const uploadId = findUploadId(payload.key)

  const init = await findUploadDetails(server.redis, uploadId)
  if (init == null) {
    logger.info(
      `No record of ID in ${payload.key} found in Redis, ignoring scan result. May be expired.`
    )
    return
  }

  const destinationKey = `${init.destinationPath}/${payload.key}`
  const destination = `${init.destinationBucket}/${destinationKey}`

  if (canBeScanned(init.uploadStatus)) {
    const scanResult = {
      safe: payload.safe,
      error: payload.error
    }
    if (payload.safe) {
      scanResult.fileUrl = destination
    }
    init.scanResult = scanResult
    init.uploadStatus = uploadStatus.scanned
    init.scanned = new Date()
    await storeUploadDetails(server.redis, uploadId, init)
  }

  if (canBeDelivered(payload.safe, init.uploadStatus)) {
    // assume this will throw exception if it fails
    const delivered = await moveS3Object(
      server.s3,
      quarantineBucket,
      payload.key,
      init.destinationBucket,
      destinationKey
    )
    if (delivered) {
      init.uploadStatus = uploadStatus.delivered
      init.delivered = new Date()
      await storeUploadDetails(server.redis, uploadId, init)
      logger.info(
        `File from ${quarantineBucket}/${payload.key} was delivered to ${destination}`
      )
    } else {
      logger.error(
        `File from ${quarantineBucket}/${payload.key} could not be delivered to ${destination}`
      )
      return
    }
  } else {
    logger.info(
      `File from ${quarantineBucket}/${payload.key} should not be delivered to ${destination}`
    )
  }

  if (!canBeAcknowledged(payload.safe, init.uploadStatus)) {
    return
  }
  const callbackResponse = await triggerCallback(
    init.scanResultCallback,
    init.scanResult
  )

  if (callbackResponse) {
    init.uploadStatus = uploadStatus.acknowledged
    init.acknowledged = new Date()
    await storeUploadDetails(server.redis, uploadId, init)
    await DeleteSqsMessage(server.sqs, scanResultQueue, receiptHandle)
  } else {
    logger.warn(`Callback to ${init.scanResultCallback} failed, will retry...`)
  }
}

function findUploadId(key) {
  const id = path.dirname(key)
  if (!id) {
    return key
  }
  return id
}

export { handleScanResult }
