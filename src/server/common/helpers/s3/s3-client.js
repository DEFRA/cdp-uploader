import { S3Client } from '@aws-sdk/client-s3'
import { config } from '~/src/config'

const s3Client = {
  plugin: {
    name: 's3Client',
    version: '0.1.0',
    register: async (server, options) => {
      const s3Client = new S3Client({
        region: options.region,
        endpoint: options.endpoint,
        forcePathStyle: options.isDevelopment
      })

      server.decorate('request', 's3', s3Client)
      server.decorate('server', 's3', s3Client)

      server.events.on('stop', () => {
        server.logger.info(`Closing S3 client`)
        s3Client.destroy()
      })
    }
  },
  options: {
    region: config.get('awsRegion'),
    endpoint: config.get('s3Endpoint'),
    isDevelopment: config.get('isDevelopment')
  }
}

export { s3Client }
