import { config } from '~/src/config'
import {
  isReady,
  isUploadPending,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import { fileStatus } from '~/src/server/common/constants/file-status'
import { sendSqsMessage } from '~/src/server/common/helpers/sqs/send-sqs-message'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger'

const callbackQueueUrl = config.get('sqsScanResultsCallback')

async function processScanComplete(server, uploadId) {
  const uploadAndFiles = await server.redis.findUploadAndFiles(uploadId)
  const files = uploadAndFiles?.files
  const uploadDetails = uploadAndFiles?.uploadDetails
  const uploadLogger = createUploadLogger(server.logger, uploadDetails)
  const isPending = isUploadPending(uploadDetails.uploadStatus)

  if (isPending && isScanningComplete(files)) {
    uploadDetails.uploadStatus = uploadStatus.ready.description
    uploadDetails.ready = new Date().toISOString()
    uploadDetails.numberOfRejectedFiles = numberOfRejectedFiles(files)

    await server.redis.storeUploadDetails(uploadId, uploadDetails)
    server.logger.info({ uploadDetails }, 'Upload marked as ready')

    if (uploadDetails.scanResultCallbackUrl) {
      try {
        await sendSqsMessage(server.sqs, callbackQueueUrl, { uploadId })
      } catch (error) {
        server.logger.error(
          { uploadDetails, error },
          `Failed to send SQS for scan result callback. Error ${error}`
        )
      }
    }
  } else if (isPending && !isScanningComplete(files)) {
    uploadLogger.debug({ uploadDetails }, `scans not yet completed`)
  } else if (isReady(uploadDetails.uploadStatus)) {
    uploadLogger.warn(`Upload was already marked as ready`)
  } else {
    uploadLogger.error(
      `Unexpected upload status: ${uploadDetails.uploadStatus}`
    )
  }
}

function isScanningComplete(files) {
  return files.every(
    (file) => file.fileStatus === fileStatus.complete || file.delivered
  )
}

function numberOfRejectedFiles(files) {
  return files.filter((file) => file.hasError ?? false).length
}

export { processScanComplete }
