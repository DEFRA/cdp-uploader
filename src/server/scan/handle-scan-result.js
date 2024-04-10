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
} from '~/src/server/common/helpers/upload-status'

const logger = createLogger()
const quarantineBucket = config.get('quarantineBucket')
const scanResultQueue = config.get('sqsScanResults')

async function handleScanResult(server, message) {
  try {
    const receiptHandle = message.ReceiptHandle
    const payload = JSON.parse(message.Body)
    const uploadId = findUploadId(payload.key)

    const uploadDetails = await server.redis.findUploadDetails(uploadId)
    if (uploadDetails === null) {
      logger.info(
        `No record of ID in ${payload.key} found in Redis, ignoring scan result. May be expired.`
      )
      return
    }

    const destinationKey = [uploadDetails.destinationPath, payload.key]
      .filter(Boolean)
      .join('/')
    const destination = [uploadDetails.destinationBucket, destinationKey].join(
      '/'
    )

    if (canBeScanned(uploadDetails.uploadStatus)) {
      const scanResult = {
        ...(payload.status === 'CLEAN' ? { safe: true } : { safe: false })
      }
      if (scanResult.safe) {
        scanResult.fileUrl = destination
      }
      uploadDetails.scanResult = scanResult
      uploadDetails.uploadStatus = uploadStatus.scanned.description
      uploadDetails.scanned = new Date()
      await server.redis.storeUploadDetails(uploadId, uploadDetails)
    }

    if (
      canBeDelivered(uploadDetails.scanResult.safe, uploadDetails.uploadStatus)
    ) {
      // assume this will throw exception if it fails
      const delivered = await moveS3Object(
        server.s3,
        quarantineBucket,
        payload.key,
        uploadDetails.destinationBucket,
        destinationKey
      )
      if (delivered) {
        uploadDetails.uploadStatus = uploadStatus.delivered.description
        uploadDetails.delivered = new Date()
        await server.redis.storeUploadDetails(uploadId, uploadDetails)
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

    if (
      !canBeAcknowledged(
        uploadDetails.scanResult.safe,
        uploadDetails.uploadStatus
      )
    ) {
      return
    }
    const callbackResponse = await triggerCallback(
      uploadDetails.scanResultCallback,
      uploadDetails.scanResult
    )

    if (callbackResponse) {
      uploadDetails.uploadStatus = uploadStatus.acknowledged.description
      uploadDetails.acknowledged = new Date()
      await server.redis.storeUploadDetails(uploadId, uploadDetails)
      await DeleteSqsMessage(server.sqs, scanResultQueue, receiptHandle)
    } else {
      logger.warn(
        `Callback to ${uploadDetails.scanResultCallback} failed, will retry...`
      )
    }
  } catch (error) {
    server.logger.error(error)
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
