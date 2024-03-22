import path from 'path'
import { v4 as uuid } from 'uuid'

import { moveS3Object } from '~/src/server/scan/move-s3-object'
import { DeleteSqsMessage } from '~/src/server/scan/delete-sqs-message'
import { config } from '~/src/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'
import { triggerCallback } from '~/src/server/scan/trigger-callback'
import { buildS3client } from '~/src/server/common/helpers/s3-client'
import { UploadStatus, canBeMoved } from '~/src/server/common/upload-status'

const logger = createLogger()
const quarantineBucket = config.get('quarantineBucket')
const scanResultQueue = config.get('sqsScanResults')

async function handleScanResult(server, payload, receiptHandle) {
  const uploadId = findUploadUuid(payload.key)

  const init = JSON.parse(await server.redis.get(uploadId))
  if (init == null) {
    logger.info(
      `No record of ID in ${payload.key} found in Redis, ignoring scan result. May be expired.`
    )
    return
  }

  const destinationKey = `${init.destinationPath}/${payload.key}`
  const destination = `${init.destinationBucket}/${destinationKey}`

  if (canBeMoved(payload.safe, init.uploadStatus)) {
    // assume this will throw exception if it fails
    const delivered = await moveS3Object(
      buildS3client(),
      quarantineBucket,
      payload.key,
      init.destinationBucket,
      destinationKey
    )
    if (delivered) {
      init.uploadStatus = UploadStatus.Moved
      await server.redis.set(payload.key, JSON.stringify(init))
    } else {
      logger.error(
        `File from ${quarantineBucket}/${payload.key} could not be delivered to ${destination}`
      )
      // if we fail to deliver, do we really want to delete the message?
      // maybe a callback and message on the DLQ
      return
    }
  }

  const scanResult = {
    safe: payload.safe,
    error: payload.error
  }
  if (payload.safe) {
    scanResult.fileUrl = destination
  }

  const callbackOk = await triggerCallback(init.scanResultCallback, scanResult)

  if (callbackOk) {
    init.uploadStatus = UploadStatus.Calledback
    await server.redis.set(payload.key, JSON.stringify(init))
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
}

function findUploadUuid(key) {
  const id = findUploadId(key)
  if (!uuid.validate(id)) {
    logger.warn(`Id is not uuid ${key}.`)
  }
  return id
}

export { handleScanResult }
