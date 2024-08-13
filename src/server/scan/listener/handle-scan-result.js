import path from 'node:path'

import { config } from '~/src/config/index.js'
import { fileStatus } from '~/src/server/common/constants/file-status.js'
import { scanStatus } from '~/src/server/common/constants/scan-status.js'
import { moveS3Object } from '~/src/server/common/helpers/s3/move-s3-object.js'
import { createFileLogger } from '~/src/server/common/helpers/logging/logger.js'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message.js'
import { fileErrorMessages } from '~/src/server/common/constants/file-error-messages.js'
import { processScanComplete } from '~/src/server/scan/listener/helpers/process-scan-complete.js'
import { counter } from '~/src/server/common/helpers/metrics/index.js'

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

  const destinationKey = [uploadDetails.request.s3Path || '', payload.key]
    .filter(Boolean)
    .join('/')
  const destination = [uploadDetails.request.s3Bucket, destinationKey].join('/')

  if (fileDetails.hasError) {
    await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
    fileLogger.warn(
      `Duplicate SQS message - has error: ${fileDetails.errorMessage}`
    )
    return
  }

  if (fileDetails.delivered) {
    await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
    fileLogger.warn(
      `Deleting duplicate SQS message - Clean file (already delivered)`
    )
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

      await counter('file-infected')

      fileLogger.info(`Virus found. Message: ${payload.message}`)
    }

    if (virusStatus === scanStatus.clean) {
      // assume this will throw exception if it fails
      const delivered = await moveS3Object(
        server.s3,
        quarantineBucket,
        payload.key,
        uploadDetails.request.s3Bucket,
        destinationKey,
        fileLogger
      )
      await counter('file-clean')

      if (delivered) {
        fileDetails.delivered = new Date().toISOString()
        fileDetails.fileStatus = fileStatus.complete
        fileDetails.s3Bucket = uploadDetails.request.s3Bucket
        fileDetails.s3Key = destinationKey
        await server.redis.storeFileDetails(fileId, fileDetails)
        // If we fail to delete the message (e.g. receipt handle has expired), we don't want a failure to stop the
        // upload from being marked as ready. Duplicate delivered message code will delete the message
        try {
          await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
        } catch (err) {
          fileLogger.error({ err }, `Failed to delete SQS message`)
        }
        fileLogger.info(`File ${fileId} was delivered to ${destination}`)
      } else {
        fileLogger.error(
          `File ${fileId} could not be delivered to ${destination}`
        )
      }
    }
  }

  await processScanComplete(server, uploadId, fileId)
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
