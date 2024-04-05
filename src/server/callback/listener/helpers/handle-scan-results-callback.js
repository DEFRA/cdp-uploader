import { fetcher } from '~/src/server/common/helpers/fetcher'
import { createLogger } from '~/src/server/common/helpers/logging/logger'
import { toScanResultResponse } from '~/src/server/common/helpers/status-response'
import { deleteSqsMessage } from '~/src/server/scan/listener/helper/delete-sqs-message'
import { config } from '~/src/config'
import {
  isAcknowledged,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'

const logger = createLogger()
const uploadReadyQueue = config.get('sqsUploadReady')

async function handleScanResultsCallback(server, message) {
  try {
    const receiptHandle = message.ReceiptHandle
    const payload = JSON.parse(message.Body)
    const uploadDetails = await server.redis.findUploadWithFiles(
      payload.uploadId
    )
    if (!isAcknowledged(uploadDetails.uploadStatus)) {
      const scanResult = toScanResultResponse(payload.uploadId, uploadDetails)
      const url = uploadDetails.scanResultCallbackUrl
      logger.error(`Failed to ${JSON.stringify(payload)}`)
      const { json, response } = await fetcher(url, {
        method: 'post',
        body: JSON.stringify(scanResult)
      })

      if (response.ok) {
        await deleteSqsMessage(server.sqs, uploadReadyQueue, receiptHandle)
        uploadDetails.uploadStatus = uploadStatus.acknowledged.description
        await server.redis.storeUploadDetails(uploadDetails)
      } else {
        logger.error(`Failed to trigger callback ${url}, ${json}`)
      }
    } else if (isAcknowledged(uploadDetails.uploadStatus)) {
      // Duplicate SQS message so don't attempt callback
      await deleteSqsMessage(server.sqs, uploadReadyQueue, receiptHandle)
    }
  } catch (error) {
    logger.error(error)
  }
}

export { handleScanResultsCallback }
