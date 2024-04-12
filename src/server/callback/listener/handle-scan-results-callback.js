import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message'
import fetch from 'node-fetch'

async function handleScanResultsCallback(message, callbackQueueUrl, server) {
  const receiptHandle = message.ReceiptHandle
  const payload = JSON.parse(message.Body)
  const uploadId = payload.uploadId
  const { files, uploadDetails } =
    await server.redis.findUploadAndFiles(uploadId)
  if (!uploadDetails) {
    await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
    server.logger.error(
      uploadDetails,
      `uploadId ${uploadId} not found. Deleting SQS message`
    )
    return
  }

  if (uploadDetails.acknowledged) {
    // Duplicate SQS message so don't attempt callback
    await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
    server.logger.warn(
      uploadDetails,
      `Duplicate SQS message - callback already acknowledged`
    )
    return
  }

  if (!uploadDetails.acknowledged) {
    const scanResultResponse = toScanResultResponse(
      uploadId,
      uploadDetails,
      files
    )
    const url = uploadDetails.scanResultCallbackUrl
    server.logger.debug(uploadDetails, `Requesting callback to ${url}`)
    const response = await fetchCallback(
      url,
      scanResultResponse,
      payload,
      server.logger
    )

    if (response?.ok) {
      await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
      uploadDetails.acknowledged = new Date()
      await server.redis.storeUploadDetails(uploadId, uploadDetails)
      server.logger.info(uploadDetails, `Callback to ${url} successful`)
    } else {
      server.logger.error(
        uploadDetails,
        `Failed to trigger callback ${url}, ${response?.status}`
      )
    }
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
