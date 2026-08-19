import { HeadObjectCommand } from '@aws-sdk/client-s3'

async function retryWithDelay(fn, { retries = 3, delayMs = 200 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      if (attempt >= retries) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

function logS3Error(
  fileLogger,
  level,
  error,
  { bucket, key, attempt, retries }
) {
  fileLogger[level](
    error,
    `HeadObject failed for ${bucket}/${key} (attempt ${attempt}/${retries}). ` +
      `Error: ${error} [requestId=${error?.$metadata?.requestId}, ` +
      `httpStatusCode=${error?.$metadata?.httpStatusCode}, ` +
      `code=${error?.Code ?? error?.name}]`
  )
}

async function findS3ContentLength(s3Client, bucket, key, fileLogger) {
  const headObjectCommand = new HeadObjectCommand({
    Bucket: bucket,
    Key: key
  })
  const retries = 10

  try {
    const headObjectResult = await retryWithDelay(
      async (attempt) => {
        try {
          return await s3Client.send(headObjectCommand)
        } catch (error) {
          logS3Error(fileLogger, attempt >= retries ? 'error' : 'warn', error, {
            bucket,
            key,
            attempt,
            retries
          })
          throw error
        }
      },
      { retries }
    )
    return headObjectResult.ContentLength
  } catch {
    return null
  }
}

export { findS3ContentLength }
