import { Consumer } from 'sqs-consumer'

const sqsListener = {
  plugin: {
    name: 'sqsListener',
    multiple: true,
    version: '0.1.0',
    register: async (server, options) => {
      server.logger.info(
        `Listening for scan result events on ${options.queueUrl}`
      )

      const listener = Consumer.create({
        queueUrl: options.queueUrl,
        attributeNames: ['SentTimestamp'],
        messageAttributeNames: ['All'],
        waitTimeSeconds: 10,
        visibilityTimeout: options.visibilityTimeout,
        pollingWaitTimeMs: 1000,
        shouldDeleteMessages: false,
        handleMessage: (message) =>
          options.messageHandler(message, options.queueUrl, server),
        sqs: server.sqs
      })

      listener.on('error', (error) => {
        server.logger.error(`error ${options.queueUrl} : ${error.message}`)
      })

      listener.on('processing_error', (error) => {
        server.logger.error(
          `processing error ${options.queueUrl} : ${error.message}`
        )
      })

      listener.on('timeout_error', (error) => {
        server.logger.error(
          `timeout error ${options.queueUrl} : ${error.message}`
        )
      })

      server.app.shutdownHooks.push(() => {
        listener.stop()
      })

      listener.start()
    }
  }
}

export { sqsListener }
