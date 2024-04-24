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
  const childLogger = server.logger.child({
    uploadId,
    fileIds: uploadDetails.fileIds
  })

  if (!uploadDetails) {
    childLogger.error(
      `uploadId ${uploadId} not found, can not process scan completion.`
    )
    return
  }
  if (uploadDetails && isUploadPending(uploadDetails.uploadStatus)) {
    if (isScanningComplete(files)) {
      uploadDetails.uploadStatus = uploadStatus.ready.description
      uploadDetails.ready = new Date()
      uploadDetails.numberOfInfectedFiles = numberOfInfectedFiles(files)
      await server.redis.storeUploadDetails(uploadId, uploadDetails)
      childLogger.info(
        { uploadDetails },
        `uploadId ${uploadId} has been marked as ready`
      )
      if (uploadDetails.scanResultCallbackUrl) {
        try {
          await sendSqsMessage(server.sqs, callbackQueueUrl, { uploadId })
        } catch (error) {
          childLogger.error(
            { uploadDetails, error },
            `Failed to send SQS for scan result callback. Error: ${error}`
          )
        }
      }
    } else {
      childLogger.debug(
        { uploadDetails },
        `uploadId ${uploadId} scans not yet completed`
      )
    }
  } else if (isReady(uploadDetails.uploadStatus)) {
    childLogger.warn(
      { uploadDetails },
      `uploadId ${uploadId} was already marked as ready`
    )
  } else {
    childLogger.error(
      { uploadDetails },
      `uploadId ${uploadId} unexpected upload status: ${uploadDetails.uploadStatus}`
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
