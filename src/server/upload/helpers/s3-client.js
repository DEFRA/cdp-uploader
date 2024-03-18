// import { config } from '~/src/config'
import { S3Client } from '@aws-sdk/client-s3'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'

const s3client = new S3Client({
  credentials: fromNodeProviderChain(),
  region: 'eu-west-2',
  endpoint: 'http://localhost:4566',
  forcePathStyle: true
})

export { s3client }
