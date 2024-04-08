import {
  isUploadPending,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import { sendSqsMessage } from '~/src/server/scan/listener/helper/send-sqs-message'
import { isInfected } from '~/src/server/common/helpers/file-status'
import { config } from '~/src/config'

const callbackQueue = config.get('sqsScanResultsCallback')
async function processScanComplete(server, uploadId) {
  const uploadDetails = await server.redis.findUploadWithFiles(uploadId)
  if (
    isUploadPending(uploadDetails.uploadStatus) &&
    isScanningComplete(uploadDetails)
  ) {
    uploadDetails.uploadStatus = uploadStatus.ready.description
    uploadDetails.numberOfInfectedFiles = numberOfInfectedFiles(uploadDetails)
    await server.redis.storeUploadDetails(uploadId, uploadDetails)
    if (uploadDetails.scanResultCallbackUrl) {
      await sendSqsMessage(server.sqs, callbackQueue, { uploadId })
    }
    server.logger.info(`UploadId ${uploadId} has been marked as ready`)
  }
}

function isScanningComplete(uploadDetails) {
  return Object.values(uploadDetails.files).every(
    (f) => isInfected(f.fileStatus) || f.delivered
  )
}

function numberOfInfectedFiles(uploadDetails) {
  return Object.values(uploadDetails.files).filter((f) =>
    isInfected(f.fileStatus)
  ).length
}

export { processScanComplete }
