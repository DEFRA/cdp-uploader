import { config } from '~/src/config'
import { S3Client } from '@aws-sdk/client-s3'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'

function buildS3client() {
  return new S3Client({
    credentials: fromNodeProviderChain(),
    region: config.get('awsRegion'),
    endpoint: config.get('s3Endpoint'),
    forcePathStyle: true
  })
}

export { buildS3client }
