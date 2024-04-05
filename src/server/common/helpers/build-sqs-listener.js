import { Consumer } from 'sqs-consumer'

import { config } from '~/src/config'
import { handleScanResult } from '~/src/server/scan/listener/handle-scan-result'
import { handleScanResultsCallback } from '~/src/server/callback/listener/helpers/handle-scan-results-callback'

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
          handleMessage: (message) => messageHandler(server, message),
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
  async (server, message) => await handleScanResult(server, message)
)

const uploadReadyListener = sqsListener(
  'uploadReadyListener',
  config.get('sqsUploadReady'),
  async (server, message) => await handleScanResultsCallback(server, message)
)

export { scanResultListener, uploadReadyListener }
