import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

import { s3client } from '~/src/server/common/helpers/s3-client'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

const logger = createLogger()

async function moveS3File(
  sourceBucket,
  sourceKey,
  destinationBucket,
  destinationKey
) {
  const source = `s3://${sourceBucket}/${sourceKey}`
  const fileCopied = await copyFile(source, destinationBucket, destinationKey)
  if (!fileCopied) {
    return false
  }

  const fileDeleted = await deleteFile(sourceBucket, sourceKey)
  return fileDeleted
}

async function copyFile(source, Bucket, Key) {
  const copyCommand = new CopyObjectCommand({ CopySource: source, Bucket, Key })

  try {
    //  const response = // do something with response ?
    await s3client.send(copyCommand)
    logger.info(`File copied from ${source} to ${Bucket}/${Key}`)
    return true
  } catch (err) {
    logger.error(`File from ${source} could not be copied to ${Bucket}/${Key}`)
    return false
  }
}

async function deleteFile(Bucket, Key) {
  const deleteCommand = new DeleteObjectCommand({ Bucket, Key })

  try {
    //  const response = // do something with response ?
    await s3client.send(deleteCommand)
    logger.info(`File deleted from ${Bucket}/${Key}`)
    return true
  } catch (err) {
    logger.error(`File could not be deleted from ${Bucket}/${Key}`)
    return false
  }
}

export { moveS3File }
