import { ChecksumAlgorithm } from '@aws-sdk/client-s3'
import { findS3ContentLength } from '~/src/server/common/helpers/s3/find-s3-content-length.js'
import { Upload } from '@aws-sdk/lib-storage'

async function uploadFile(
  s3Client,
  bucket,
  key,
  fileStream,
  metadata,
  fileLogger
) {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: metadata.contentType,
      Metadata: metadata,
      ChecksumAlgorithm: ChecksumAlgorithm.SHA256
    },
    queueSize: 2,
    partSize: 10 * 1024 * 1024
  })

  const uploadResult = await upload.done()

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
