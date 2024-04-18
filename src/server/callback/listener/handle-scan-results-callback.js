import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message'
import fetch from 'node-fetch'

async function handleScanResultsCallback(message, callbackQueueUrl, server) {
  const receiptHandle = message.ReceiptHandle
  const payload = JSON.parse(message.Body)
  const uploadId = payload.uploadId
  const { files, uploadDetails } =
    await server.redis.findUploadAndFiles(uploadId)
  const childLogger = server.logger.child({
    uploadId,
    uploadDetails
  })
  if (!uploadDetails) {
    await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
    childLogger.debug(`uploadId ${uploadId} not found. Deleting SQS message`)
    return
  }

  if (uploadDetails.acknowledged) {
    // Duplicate SQS message so don't attempt callback
    await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
    childLogger.warn(`Duplicate SQS message - callback already acknowledged`)
    return
  }

  if (!uploadDetails.acknowledged) {
    const scanResultResponse = toScanResultResponse(
      uploadId,
      uploadDetails,
      files
    )
    const url = uploadDetails.scanResultCallbackUrl
    childLogger.debug(`Requesting callback to ${url}`)
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
      childLogger.debug(`Callback to ${url} successful`)
    } else {
      childLogger.debug(
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
