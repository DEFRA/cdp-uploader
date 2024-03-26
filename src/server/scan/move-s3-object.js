import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

import { createLogger } from '~/src/server/common/helpers/logging/logger'

const logger = createLogger()

async function moveS3Object(
  s3Client,
  sourceBucket,
  sourceKey,
  destinationBucket,
  destinationKey
) {
  const sourceObject = `${sourceBucket}/${sourceKey}`

  const fileCopied = await copyObject(
    s3Client,
    sourceObject,
    destinationBucket,
    destinationKey
  )
  if (!fileCopied) {
    return false
  }

  return await deleteObject(s3Client, sourceBucket, sourceKey)
}

async function copyObject(s3Client, sourceObject, bucket, key) {
  const command = new CopyObjectCommand({
    CopySource: sourceObject,
    Bucket: bucket,
    Key: key
  })

  try {
    await s3Client.send(command)
    logger.info(`File copied from ${sourceObject} to ${bucket}/${key}`)
    return true
  } catch (err) {
    logger.error(
      { err },
      `File from ${sourceObject} could not be copied to ${bucket}/${key}`
    )
    return false
  }
}

async function deleteObject(s3Client, bucket, key) {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: bucket
  })

  try {
    await s3Client.send(deleteCommand)
    logger.info(`File deleted from ${bucket}/${key}`)
    return true
  } catch (err) {
    logger.error({ err }, `File could not be deleted from ${bucket}/${key}`)
    return false
  }
}

export { moveS3Object }
