import { HeadObjectCommand } from '@aws-sdk/client-s3'

async function findS3ContentLength(s3Client, bucket, key, fileLogger) {
  const headObjectCommand = new HeadObjectCommand({
    Bucket: bucket,
    Key: key
  })

  try {
    const headObjectResult = await s3Client.send(headObjectCommand)
    return headObjectResult.ContentLength
  } catch (error) {
    fileLogger.error(
      error,
      `Could not find content type for object ${bucket}/${key}. Error: ${error}`
    )
    return null
  }
}

export { findS3ContentLength }
