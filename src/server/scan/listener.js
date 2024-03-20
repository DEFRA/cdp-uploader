import { Consumer } from 'sqs-consumer'
import { config } from '~/src/config'
import { handleScanResult } from '~/src/server/scan/handle-scan-result'

function listener(server) {
  const queueUrl = config.get('sqsScanResults')

  server.logger.info(`Listening for scan result events on ${queueUrl}`)

  const listener = Consumer.create({
    queueUrl,
    attributeNames: ['SentTimestamp'],
    messageAttributeNames: ['All'],
    waitTimeSeconds: 10,
    visibilityTimeout: 400,
    pollingWaitTimeMs: 1000,
    shouldDeleteMessages: false,
    handleMessage: async (message) => {
      const payload = JSON.parse(message.Body)
      await handleScanResult(server, payload, message.ReceiptHandle)
      return message
    },
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

export { listener }
