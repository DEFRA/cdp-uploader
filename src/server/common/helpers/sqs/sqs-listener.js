import { Consumer } from 'sqs-consumer'

import { config } from '~/src/config/index.js'
import { handleScanResult } from '~/src/server/scan/listener/handle-scan-result.js'
import { handleScanResultsCallback } from '~/src/server/callback/listener/handle-scan-results-callback.js'
import { handleMockVirusScanner } from '~/src/server/test-harness/mock-virus-scanner.js'

const sqsListener = {
  plugin: {
    name: 'sqsListener',
    multiple: true,
    version: '0.1.0',
    register: async (server, options) => {
      const queueUrl = options.config.queueUrl

      const batchMessageHandler = async function (messages) {
        const messageHandlerPromises = messages.map((message) =>
          options.messageHandler(message, queueUrl, server)
        )
        await Promise.all(messageHandlerPromises)
      }

      server.logger.info(`Listening for scan result events on ${queueUrl}`)

      const listener = Consumer.create({
        queueUrl,
        attributeNames: ['SentTimestamp'],
        messageAttributeNames: ['All'],
        waitTimeSeconds: options.config.waitTimeSeconds,
        pollingWaitTimeMs: options.config.pollingWaitTimeMs,
        shouldDeleteMessages: false,
        batchSize: options.config.batchSize,
        handleMessageBatch: (messages) => batchMessageHandler(messages),
        sqs: server.sqs
      })

      listener.on('error', (error) => {
        server.logger.error(`error ${queueUrl} : ${error.message}`)
      })

      listener.on('processing_error', (error) => {
        server.logger.error(`processing error ${queueUrl} : ${error.message}`)
      })

      listener.on('timeout_error', (error) => {
        server.logger.error(`timeout error ${queueUrl} : ${error.message}`)
      })

      server.events.on('closing', () => {
        server.logger.info(`Closing sqs listener for ${queueUrl}`)
        listener.stop()
      })

      listener.start()
    }
  }
}

const scanResultListener = {
  plugin: sqsListener,
  options: {
    config: config.get('sqsScanResults'),
    messageHandler: async (message, queueUrl, server) =>
      await handleScanResult(message, queueUrl, server)
  }
}

const scanResultCallbackListener = {
  plugin: sqsListener,
  options: {
    config: config.get('sqsScanResultsCallback'),
    messageHandler: async (message, queueUrl, server) =>
      await handleScanResultsCallback(message, queueUrl, server)
  }
}

const mockClamavListener = {
  plugin: sqsListener,
  options: {
    config: {
      queueUrl: 'mock-clamav',
      visibilityTimeout: 5,
      waitTimeSeconds: 20,
      pollingWaitTimeMs: 10,
      batchSize: 1
    },
    messageHandler: async (message, queueUrl, server) =>
      await handleMockVirusScanner(message, queueUrl, server)
  }
}

export { scanResultListener, scanResultCallbackListener, mockClamavListener }
