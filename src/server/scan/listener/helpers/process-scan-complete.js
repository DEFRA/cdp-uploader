import { config } from '~/src/config/index.js'
import {
  isReady,
  isUploadPending,
  uploadStatus
} from '~/src/server/common/helpers/upload-status.js'
import { fileStatus } from '~/src/server/common/constants/file-status.js'
import { sendSqsMessageFifo } from '~/src/server/common/helpers/sqs/send-sqs-message.js'
import { createFileLogger } from '~/src/server/common/helpers/logging/logger.js'
import { millis } from '~/src/server/common/helpers/metrics/counter.js'

const callbackQueueUrl = config.get('sqsScanResultsCallback.queueUrl')

async function processScanComplete(uploadId, fileId, { redis, logger, sqs }) {
  const uploadAndFiles = await redis.findUploadAndFiles(uploadId)
  const files = uploadAndFiles?.files
  const uploadDetails = uploadAndFiles?.uploadDetails
  const fileLogger = createFileLogger(logger, uploadDetails, fileId)
  const isPending = isUploadPending(uploadDetails.uploadStatus)

  if (isPending && isScanningComplete(files)) {
    uploadDetails.uploadStatus = uploadStatus.ready.description

    const readyDate = new Date()
    const pendingTimeMillis = new Date(uploadDetails.pending).getTime()
    const processingTime = readyDate.getTime() - pendingTimeMillis

    await millis('upload-processing-time', processingTime)

    uploadDetails.ready = readyDate.toISOString()
    uploadDetails.numberOfRejectedFiles = numberOfRejectedFiles(files)
    uploadDetails.uploadProcessingTime = processingTime

    await redis.storeUploadDetails(uploadId, uploadDetails)

    const readyFileLogger = createFileLogger(logger, uploadDetails, fileId)
    const fileSizes = files
      .filter((file) => file?.contentLength)
      .map((file) => file.contentLength)

    readyFileLogger.info(
      {
        fileSizes,
        uploadProcessingTime: processingTime
      },
      'Upload marked as ready'
    )

    if (uploadDetails.request.callback) {
      try {
        await sendSqsMessageFifo(sqs, callbackQueueUrl, { uploadId }, uploadId)
      } catch (error) {
        readyFileLogger.error(
          error,
          `Failed to send SQS for scan result callback. Error ${error}`
        )
      }
    }
  } else if (isPending && !isScanningComplete(files)) {
    fileLogger.debug({ uploadDetails }, `scans not yet completed`)
  } else if (isReady(uploadDetails.uploadStatus)) {
    fileLogger.warn(`Upload was already marked as ready`)
  } else {
    fileLogger.error(`Unexpected upload status: ${uploadDetails.uploadStatus}`)
  }
}

function isScanningComplete(files) {
  return files.every(
    (file) => file.fileStatus === fileStatus.rejected || file.delivered
  )
}

function numberOfRejectedFiles(files) {
  return files.filter((file) => file.hasError ?? false).length
}

export { processScanComplete, numberOfRejectedFiles }
