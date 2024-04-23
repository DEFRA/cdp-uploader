import path from 'path'

import { moveS3Object } from '~/src/server/common/helpers/s3/move-s3-object'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message'
import { config } from '~/src/config'
import {
  isClean,
  isFilePending,
  isInfected,
  toFileStatus
} from '~/src/server/common/helpers/file-status'
import { processScanComplete } from '~/src/server/scan/listener/helpers/process-scan-complete'

const quarantineBucket = config.get('quarantineBucket')

async function handleScanResult(message, scanResultQueueUrl, server) {
  const receiptHandle = message.ReceiptHandle
  const payload = JSON.parse(message.Body)
  const uploadId = findUploadId(payload.key)
  const fileId = findFileId(payload.key)

  const uploadDetails = await server.redis.findUploadDetails(uploadId)
  const fileDetails = await server.redis.findFileDetails(fileId)

  const childLogger = server.logger.child({
    payLoadKey: payload.key,
    uploadId,
    //  uploadStatus: uploadDetails.uploadStatus,
    fileIds: uploadDetails.fileIds,
    fileId
    //  fileStatus: fileDetails.fileStatus
  })

  if (!uploadDetails) {
    childLogger.error(
      `No record of uploadId found in Redis for ${payload.key}, ignoring scan result. May be expired`
    )
    return
  }

  if (!fileDetails) {
    childLogger.error(
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
  if (isInfected(fileDetails.fileStatus)) {
    await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
    childLogger.warn(`Duplicate SQS message - Infected file`)
    return
  }
  if (fileDetails.delivered) {
    await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
    childLogger.warn(`Duplicate SQS message - Clean file (already delivered)`)
    return
  }

  if (isFilePending(fileDetails.fileStatus)) {
    fileDetails.fileStatus = toFileStatus(payload.status)
    fileDetails.scanned = new Date()

    await server.redis.storeFileDetails(fileId, fileDetails)

    if (isInfected(fileDetails.fileStatus)) {
      await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
      childLogger.info(`Virus found. Message: ${payload.message}`)
    } else if (isClean(fileDetails.fileStatus)) {
      // assume this will throw exception if it fails
      const delivered = await moveS3Object(
        server.s3,
        quarantineBucket,
        payload.key,
        uploadDetails.destinationBucket,
        destinationKey
      )
      if (delivered) {
        fileDetails.delivered = new Date()
        fileDetails.s3Bucket = uploadDetails.destinationBucket
        fileDetails.s3Key = destinationKey
        await server.redis.storeFileDetails(fileId, fileDetails)
        await deleteSqsMessage(server.sqs, scanResultQueueUrl, receiptHandle)
        childLogger.info(`File ${fileId} was delivered to ${destination}`)
      } else {
        childLogger.error(
          `File ${fileId} could not be delivered to ${destination}`
        )
      }
    } else {
      childLogger.error(`Unexpected status ${fileDetails.fileStatus}`)
    }
  }
  await processScanComplete(server, uploadId)
}

function findUploadId(key) {
  const uploadId = path.dirname(key)
  if (!uploadId) {
    return key
  }
  return uploadId
}

function findFileId(key) {
  const fileId = path.basename(key)
  if (!fileId) {
    return key
  }
  return fileId
}

export { handleScanResult }
