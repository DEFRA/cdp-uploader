import path from 'node:path'

import { config } from '~/src/config'
import { fileStatus } from '~/src/server/common/constants/file-status'
import { scanStatus } from '~/src/server/common/constants/scan-status'
import { moveS3Object } from '~/src/server/common/helpers/s3/move-s3-object'
import { createFileLogger } from '~/src/server/common/helpers/logging/logger'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message'
import { fileErrorMessages } from '~/src/server/common/constants/file-error-messages'
import { processScanComplete } from '~/src/server/scan/listener/helpers/process-scan-complete'

const quarantineBucket = config.get('quarantineBucket')

async function handleScanResult(message, scanResultQueueUrl, server) {
  const receiptHandle = message.ReceiptHandle
  const payload = JSON.parse(message.Body)
  const uploadId = findUploadId(payload.key)
  const fileId = findFileId(payload.key)

  const uploadDetails = await server.redis.findUploadDetails(uploadId)
  const fileDetails = await server.redis.findFileDetails(fileId)

  const fileLogger = createFileLogger(server.logger, uploadDetails, fileId)

  if (!uploadDetails) {
    fileLogger.error(
      `No record of uploadId found in Redis for ${payload.key}, ignoring scan result. May be expired`
    )
    return
  }

  if (!fileDetails) {
    fileLogger.error(
      `uploadId ${uploadId} - No record of ${payload.key} found in Redis, ignoring scan result. May be expired`
    )
    return
  }

  const destinationKey = [uploadDetails.destinationPath, payload.key]
    .filter(Boolean)
    .join('/')
  const destination = [uploadDetails.destinationBucket, destinationKey].join(
    '/'
  )

  if (fileDetails.hasError) {
    await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
    fileLogger.warn(
      `Duplicate SQS message - has error: ${fileDetails.errorMessage}`
    )
    return
  }

  if (fileDetails.delivered) {
    await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
    fileLogger.warn(`Duplicate SQS message - Clean file (already delivered)`)
    return
  }

  if (fileDetails.fileStatus === fileStatus.pending) {
    const virusStatus = payload.status?.toLowerCase()

    fileDetails.scanned = new Date().toISOString()

    if (virusStatus === scanStatus.infected) {
      fileDetails.hasError = true
      fileDetails.errorMessage = fileErrorMessages.virus
      fileDetails.fileStatus = fileStatus.rejected

      await server.redis.storeFileDetails(fileId, fileDetails)
      await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)

      fileLogger.info(`Virus found. Message: ${payload.message}`)
    }

    if (virusStatus === scanStatus.clean) {
      // assume this will throw exception if it fails
      const delivered = await moveS3Object(
        server.s3,
        quarantineBucket,
        payload.key,
        uploadDetails.destinationBucket,
        destinationKey,
        fileLogger
      )

      if (delivered) {
        fileDetails.delivered = new Date().toISOString()
        fileDetails.fileStatus = fileStatus.complete
        fileDetails.s3Bucket = uploadDetails.destinationBucket
        fileDetails.s3Key = destinationKey
        await server.redis.storeFileDetails(fileId, fileDetails)
        await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
        fileLogger.info(`File ${fileId} was delivered to ${destination}`)
      } else {
        fileLogger.error(
          `File ${fileId} could not be delivered to ${destination}`
        )
      }
    }
  }

  await processScanComplete(server, uploadId)
}

function findUploadId(key) {
  const uploadId = path.dirname(key)

  return uploadId || key
}

function findFileId(key) {
  const fileId = path.basename(key)

  return fileId || key
}

export { handleScanResult }
