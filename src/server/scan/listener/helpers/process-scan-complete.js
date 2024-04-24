import {
  isReady,
  isUploadPending,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import { sendSqsMessage } from '~/src/server/common/helpers/sqs/send-sqs-message'
import { isInfected } from '~/src/server/common/helpers/file-status'
import { config } from '~/src/config'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger'

const callbackQueueUrl = config.get('sqsScanResultsCallback')
async function processScanComplete(server, uploadId, fileId) {
  const { files, uploadDetails } =
    await server.redis.findUploadAndFiles(uploadId)

  const uploadLogger = createUploadLogger(server.logger, uploadDetails)
  const isPending = isUploadPending(uploadDetails.uploadStatus)

  if (isPending && isScanningComplete(files)) {
    uploadDetails.uploadStatus = uploadStatus.ready.description
    uploadDetails.ready = new Date()
    uploadDetails.numberOfInfectedFiles = numberOfInfectedFiles(files)
    await server.redis.storeUploadDetails(uploadId, uploadDetails)

    const readyUploadLogger = createUploadLogger(server.logger, uploadDetails)
    readyUploadLogger.info(`Upload marked as ready`)

    if (uploadDetails.scanResultCallbackUrl) {
      try {
        await sendSqsMessage(server.sqs, callbackQueueUrl, { uploadId })
      } catch (error) {
        readyUploadLogger.error(
          error,
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
  return files.every((f) => isInfected(f.fileStatus) || f.delivered)
}

function numberOfInfectedFiles(files) {
  return files.filter((f) => isInfected(f.fileStatus)).length
}

export { processScanComplete }
