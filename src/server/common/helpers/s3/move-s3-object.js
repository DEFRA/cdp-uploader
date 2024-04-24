import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

async function moveS3Object(
  s3Client,
  sourceBucket,
  sourceKey,
  destinationBucket,
  destinationKey,
  fileLogger
) {
  const sourceObject = `${sourceBucket}/${sourceKey}`

  const fileCopied = await copyObject(
    s3Client,
    sourceObject,
    destinationBucket,
    destinationKey,
    fileLogger
  )
  if (!fileCopied) {
    return false
  }

  return await deleteObject(s3Client, sourceBucket, sourceKey, fileLogger)
}

async function copyObject(s3Client, sourceObject, bucket, key, fileLogger) {
  const command = new CopyObjectCommand({
    CopySource: sourceObject,
    Bucket: bucket,
    Key: key,
    ContentType: sourceObject.ContentType
  })

  try {
    await s3Client.send(command)
    fileLogger.info(`File copied from ${sourceObject} to ${bucket}/${key}`)
    return true
  } catch (err) {
    fileLogger.error(
      { err },
      `File from ${sourceObject} could not be copied to ${bucket}/${key}`
    )
    return false
  }
}

async function deleteObject(s3Client, bucket, key, fileLogger) {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  })

  try {
    await s3Client.send(deleteCommand)
    fileLogger.info(`File deleted from ${bucket}/${key}`)
    return true
  } catch (err) {
    fileLogger.error({ err }, `File could not be deleted from ${bucket}/${key}`)
    return false
  }
}

export { moveS3Object }
