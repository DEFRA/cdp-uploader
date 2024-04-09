import {
  isUploadPending,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import { sendSqsMessage } from '~/src/server/common/helpers/sqs/send-sqs-message'
import { isInfected } from '~/src/server/common/helpers/file-status'
import { config } from '~/src/config'

const callbackQueue = config.get('sqsScanResultsCallback')
async function processScanComplete(server, uploadId) {
  const upload = await server.redis.findUploadWithFiles(uploadId)
  if (isUploadPending(upload.uploadStatus) && isScanningComplete(upload)) {
    upload.uploadStatus = uploadStatus.ready.description
    upload.numberOfInfectedFiles = numberOfInfectedFiles(upload)
    await server.redis.storeUploadDetails(uploadId, upload)
    if (upload.scanResultCallbackUrl) {
      await sendSqsMessage(server.sqs, callbackQueue, { uploadId })
    }
    server.logger.info(`uploadId ${uploadId} has been marked as ready`)
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
