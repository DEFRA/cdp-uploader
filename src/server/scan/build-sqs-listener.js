import { Consumer } from 'sqs-consumer'
import { config } from '~/src/config'
import { handleScanResult } from '~/src/server/scan/handle-scan-result'

function buildSqsListener(server, queueUrl, handleMessageFn) {
  server.logger.info(`Listening for scan result events on ${queueUrl}`)

  const listener = Consumer.create({
    queueUrl,
    attributeNames: ['SentTimestamp'],
    messageAttributeNames: ['All'],
    waitTimeSeconds: 10,
    visibilityTimeout: 400,
    pollingWaitTimeMs: 1000,
    shouldDeleteMessages: false,
    handleMessage: handleMessageFn,
    sqs: server.sqs
  })

  listener.on('error', (error) => {
    server.logger.error(error.message)
  })

  listener.on('processing_error', (error) => {
    server.logger.error(error.message)
  })

  listener.on('timeout_error', (error) => {
    server.logger.error(error.message)
  })

  listener.start()

  return listener
}

function buildScanResultListener(server) {
  const queueUrl = config.get('sqsScanResults')
  const handleMessage = async (message) => {
    const payload = JSON.parse(message.Body)
    await handleScanResult(server, payload, message.ReceiptHandle)
    return message
  }

  return buildSqsListener(server, queueUrl, handleMessage)
}

export { buildScanResultListener }
