import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message'
import {
  isAcknowledged,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import fetch from 'node-fetch'

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
      server.logger.debug(payload, `Requesting callback to ${url}`)
      const response = await fetchCallback(
        url,
        scanResult,
        payload,
        server.logger
      )

      if (response && response.ok) {
        await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
        uploadDetails.uploadStatus = uploadStatus.acknowledged.description
        await server.redis.storeUploadDetails(payload.uploadId, uploadDetails)
        server.logger.info(payload, `Callback to ${url} successful`)
      } else {
        server.logger.error(
          payload,
          `Failed to trigger callback ${url}, ${response.status}`
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

async function fetchCallback(url, scanResultResponse, sqsMessage, logger) {
  let response
  try {
    response = await fetch(url, {
      method: 'post',
      body: JSON.stringify(scanResultResponse),
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    logger.error(sqsMessage, `Could not make callback. Error: ${error}`)
  }
  return response
}

export { handleScanResultsCallback }
