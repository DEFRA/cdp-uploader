import { Consumer } from 'sqs-consumer'

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
        visibilityTimeout: options.config.visibilityTimeout,
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

      server.app.shutdownHooks.push(() => {
        listener.stop()
      })

      listener.start()
    }
  }
}

export { sqsListener }
