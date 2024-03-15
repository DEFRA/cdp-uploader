import { S3Client } from '@aws-sdk/client-s3'

const s3client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  region: process.env.AWS_DEFAULT_REGION
})

export { s3client }
