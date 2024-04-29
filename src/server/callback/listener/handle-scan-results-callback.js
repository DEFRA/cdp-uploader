import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message'
import fetch from 'node-fetch'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger'

async function handleScanResultsCallback(message, callbackQueueUrl, server) {
  const receiptHandle = message.ReceiptHandle
  const payload = JSON.parse(message.Body)
  const uploadId = payload.uploadId
  const uploadAndFiles = await server.redis.findUploadAndFiles(uploadId)
  const files = uploadAndFiles?.files
  const uploadDetails = uploadAndFiles?.uploadDetails

  const uploadLogger = createUploadLogger(server.logger, uploadDetails)

  if (!uploadDetails) {
    await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
    uploadLogger.error(`uploadId ${uploadId} not found. Deleting SQS message`)
    return
  }

  if (uploadDetails.acknowledged) {
    // Duplicate SQS message so don't attempt callback
    await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
    uploadLogger.warn(`Duplicate SQS message - callback already acknowledged`)
    return
  }

  if (!uploadDetails.acknowledged) {
    const scanResultResponse = toScanResultResponse(
      uploadId,
      uploadDetails,
      files
    )
    const url = uploadDetails.scanResultCallbackUrl
    uploadLogger.debug({ uploadDetails }, `Requesting callback to ${url}`)
    const response = await fetchCallback(url, scanResultResponse, uploadLogger)

    if (response?.ok) {
      await deleteSqsMessage(server.sqs, callbackQueueUrl, receiptHandle)
      uploadDetails.acknowledged = new Date().toISOString()
      await server.redis.storeUploadDetails(uploadId, uploadDetails)
      uploadLogger.info(`Callback to ${url} successful`)
    } else {
      uploadLogger.error(
        `Failed to trigger callback ${url}, ${response?.status}`
      )
    }
  }
}

async function fetchCallback(url, scanResultResponse, uploadLogger) {
  let response
  try {
    response = await fetch(url, {
      method: 'post',
      body: JSON.stringify(scanResultResponse),
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    uploadLogger.error(error, `Could not make callback. Error: ${error}`)
  }
  return response
}

export { handleScanResultsCallback }
