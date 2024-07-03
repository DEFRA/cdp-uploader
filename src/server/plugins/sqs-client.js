import { buildSqsClient } from '~/src/server/common/helpers/sqs/sqs-client'

const sqsClient = {
  plugin: {
    name: 'sqsClient',
    version: '0.1.0',
    register: async (server, options) => {
      const sqsClient = buildSqsClient()

      server.decorate('server', 'sqs', sqsClient)

      server.events.on('stop', () => {
        server.logger.info(`Closing sqs client`)
        sqsClient.destroy()
      })
    }
  }
}

export { sqsClient }
