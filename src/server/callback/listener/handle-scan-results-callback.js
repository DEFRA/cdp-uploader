import { fetcher } from '~/src/server/common/helpers/fetcher'
import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message'
import {
  isAcknowledged,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'

async function handleScanResultsCallback(message, callbackQueueUrl, server) {
  try {
    const receiptHandle = message.ReceiptHandle
    const payload = JSON.parse(message.Body)
    const uploadDetails = await server.redis.findUploadWithFiles(
      payload.uploadId
    )
    if (!uploadDetails) {
      server.logger.error(payload, `Upload Id not found. Deleting SQS message`)
      await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
    } else if (!isAcknowledged(uploadDetails.uploadStatus)) {
      const scanResult = toScanResultResponse(payload.uploadId, uploadDetails)
      const url = uploadDetails.scanResultCallbackUrl
      const { json, response } = await fetcher(url, {
        method: 'post',
        body: JSON.stringify(scanResult)
      })

      if (response.ok) {
        await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
        uploadDetails.uploadStatus = uploadStatus.acknowledged.description
        await server.redis.storeUploadDetails(uploadDetails)
      } else {
        server.logger.error(
          payload,
          `Failed to trigger callback ${url}, ${json}`
        )
      }
    } else if (isAcknowledged(uploadDetails.uploadStatus)) {
      // Duplicate SQS message so don't attempt callback
      await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
    }
  } catch (error) {
    server.logger.error(error)
  }
}

export { handleScanResultsCallback }
