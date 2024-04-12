import {
  isReady,
  isUploadPending,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import { sendSqsMessage } from '~/src/server/common/helpers/sqs/send-sqs-message'
import { isInfected } from '~/src/server/common/helpers/file-status'
import { config } from '~/src/config'

const callbackQueueUrl = config.get('sqsScanResultsCallback')
async function processScanComplete(server, uploadId) {
  const { files, uploadDetails } =
    await server.redis.findUploadAndFiles(uploadId)
  if (
    uploadDetails &&
    isUploadPending(uploadDetails.uploadStatus) &&
    isScanningComplete(files)
  ) {
    if (uploadDetails.scanResultCallbackUrl) {
      await sendSqsMessage(server.sqs, callbackQueueUrl, { uploadId })
    }
    uploadDetails.uploadStatus = uploadStatus.ready.description
    uploadDetails.ready = new Date()
    uploadDetails.numberOfInfectedFiles = numberOfInfectedFiles(files)
    await server.redis.storeUploadDetails(uploadId, uploadDetails)
    server.logger.info(
      uploadDetails,
      `uploadId ${uploadId} has been marked as ready`
    )
  } else if (isReady(uploadDetails.uploadStatus)) {
    server.logger.error(
      uploadDetails,
      `uploadId ${uploadId} was already marked as ready`
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
