import { config } from '~/src/config'
import { S3Client } from '@aws-sdk/client-s3'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'

function buildS3client() {
  return new S3Client({
    credentials: fromNodeProviderChain(),
    ...(config.get('isDevelopment') && {
      endpoint: config.get('localstackEndpoint'),
      forcePathStyle: true
    })
  })
}

export { buildS3client }
