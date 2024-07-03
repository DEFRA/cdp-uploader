import { buildS3client } from '~/src/server/common/helpers/s3/s3-client'

const s3Client = {
  plugin: {
    name: 's3Client',
    version: '0.1.0',
    register: async (server, options) => {
      const s3Client = buildS3client()
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
