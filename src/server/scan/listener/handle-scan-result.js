import path from 'path'

import { moveS3Object } from '~/src/server/scan/listener/helper/move-s3-object'
import { deleteSqsMessage } from '~/src/server/scan/listener/helper/delete-sqs-message'
import { config } from '~/src/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'
import {
  isClean,
  isFilePending,
  isInfected,
  toFileStatus
} from '~/src/server/common/helpers/file-status'
import { processScanComplete } from '~/src/server/scan/listener/helper/process-scan-complete'

const logger = createLogger()
const quarantineBucket = config.get('quarantineBucket')
const scanResultQueue = config.get('sqsScanResults')

async function handleScanResult(server, message) {
  const receiptHandle = message.ReceiptHandle
  const payload = JSON.parse(message.Body)
  const uploadId = findUploadId(payload.key)
  const fileId = findFileId(payload.key)

  const uploadDetails = await server.redis.findUploadDetails(uploadId)
  const fileDetails = await server.redis.findFileDetails(fileId)

  if (!uploadDetails || !fileDetails) {
    logger.warn(
      `No record of upload or file ID in ${payload.key} found in Redis, ignoring scan result. May be expired.`
    )
    return
  }

  if (isFilePending(fileDetails.fileStatus)) {
    fileDetails.fileStatus = toFileStatus(payload.status)
    fileDetails.scanned = new Date()

    await server.redis.storeFileDetails(fileId, fileDetails)

    if (isInfected(fileDetails.fileStatus)) {
      await deleteSqsMessage(server.sqs, scanResultQueue, receiptHandle)
      logger.warn(
        `UploadId: ${uploadId}, fileId: ${fileId} - Virus found. message: ${payload.message}`
      )
    }
  }

  const destinationKey = [uploadDetails.destinationPath, payload.key]
    .filter(Boolean)
    .join('/')
  const destination = [uploadDetails.destinationBucket, destinationKey].join(
    '/'
  )

  if (isClean(fileDetails.fileStatus) && !fileDetails.delivered) {
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
      fileDetails.destination = `s3://${destination}`
      await server.redis.storeFileDetails(fileId, fileDetails)
      await deleteSqsMessage(server.sqs, scanResultQueue, receiptHandle)
      logger.info(
        `UploadId ${uploadId} - File from ${quarantineBucket}/${payload.key} was delivered to ${destination}`
      )
    } else {
      logger.error(
        `UploadId ${uploadId} - File from ${quarantineBucket}/${payload.key} could not be delivered to ${destination}`
      )
    }
  } else {
    logger.info(
      `UploadId ${uploadId} - File from ${quarantineBucket}/${payload.key} should not be delivered to ${destination}`
    )
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
