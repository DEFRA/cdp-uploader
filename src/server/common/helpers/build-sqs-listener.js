import { Consumer } from 'sqs-consumer'

import { config } from '~/src/config'
import { handleScanResult } from '~/src/server/scan/listener/handle-scan-result'
import { handleScanResultsCallback } from '~/src/server/callback/listener/handle-scan-results-callback'

function sqsListener(name, queueUrl, messageHandler) {
  return {
    plugin: {
      name,
      version: '0.1.0',
      register: async (server) => {
        server.logger.info(`Listening for scan result events on ${queueUrl}`)

        const listener = Consumer.create({
          queueUrl,
          attributeNames: ['SentTimestamp'],
          messageAttributeNames: ['All'],
          waitTimeSeconds: 10,
          visibilityTimeout: 400,
          pollingWaitTimeMs: 1000,
          shouldDeleteMessages: false,
          handleMessage: (message) => messageHandler(message, queueUrl, server),
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
}

const scanResultListener = sqsListener(
  'scanResultListener',
  config.get('sqsScanResults'),
  async (message, queueUrl, server) =>
    await handleScanResult(message, queueUrl, server)
)

const scanResultsCallbackListener = sqsListener(
  'ScanResultsCallbackListener',
  config.get('sqsScanResultsCallback'),
  async (message, queueUrl, server) =>
    await handleScanResultsCallback(message, queueUrl, server)
)

export { scanResultListener, scanResultsCallbackListener }
