import { Consumer } from 'sqs-consumer'

import { config } from '~/src/config'
import { handleScanResult } from '~/src/server/scan/handle-scan-result'

const sqsListener = {
  plugin: {
    name: 'sqsListener',
    version: '0.1.0',
    register: async (server) => {
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
        handleMessage: async (message) =>
          await handleScanResult(server, message),
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
    }
  }
}

export { sqsListener }
