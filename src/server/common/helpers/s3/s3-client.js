import { S3Client } from '@aws-sdk/client-s3'
import { config } from '~/src/config/index.js'

const s3Client = {
  plugin: {
    name: 's3Client',
    version: '0.1.0',
    register(server, options) {
      const s3Client = new S3Client({
        region: config.get('awsRegion'),
        endpoint: config.get('s3Endpoint'),
        ...(config.get('isDevelopment') && {
          forcePathStyle: true
        })
      })

      server.decorate('request', 's3', s3Client)
      server.decorate('server', 's3', s3Client)

      server.events.on('stop', () => {
        server.logger.info(`Closing S3 client`)
        s3Client.destroy()
      })
    }
  }
}

export { s3Client }
