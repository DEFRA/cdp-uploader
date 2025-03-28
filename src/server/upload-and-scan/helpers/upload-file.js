import { ChecksumAlgorithm, PutObjectCommand } from '@aws-sdk/client-s3'
import { findS3ContentLength } from '~/src/server/common/helpers/s3/find-s3-content-length.js'
import { readFile } from 'node:fs/promises'

async function uploadFile(
  s3Client,
  bucket,
  key,
  filePath,
  metadata,
  fileLogger
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Metadata: { ...metadata },
    Body: await readFile(filePath),
    ContentType: metadata.contentType,
    ChecksumAlgorithm: ChecksumAlgorithm.SHA256
  })

  const uploadResult = await s3Client.send(command)
  const fileLength = await findS3ContentLength(
    s3Client,
    bucket,
    key,
    fileLogger
  )
  const checksumSha256 = uploadResult.ChecksumSHA256

  return { fileLength, checksumSha256 }
}

export { uploadFile }
