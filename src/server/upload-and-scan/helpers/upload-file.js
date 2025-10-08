import { ChecksumAlgorithm } from '@aws-sdk/client-s3'
import { findS3ContentLength } from '~/src/server/common/helpers/s3/find-s3-content-length.js'
import { Upload } from '@aws-sdk/lib-storage'
import FileType from 'file-type'
import { PassThrough } from 'stream'

async function uploadFile(
  s3Client,
  bucket,
  key,
  fileStream,
  contentLength,
  metadata,
  fileLogger
) {
  const pass = new PassThrough()
  const buffer = []

  let bytesCollected = 0
  fileStream.on('data', (chunk) => {
    if (buffer.length < 4100) {
      const remaining = 4100 - bytesCollected
      const slice = chunk.slice(0, remaining)
      buffer.push(slice)
      bytesCollected += slice.length
    }
    pass.write(chunk)
  })
  fileStream.on('end', () => pass.end())

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: pass,
      ContentType: metadata.contentType,
      Metadata: metadata,
      ChecksumAlgorithm: ChecksumAlgorithm.SHA256,
      ContentLength: contentLength.toString()
    },
    queueSize: 2,
    partSize: 10 * 1024 * 1024
  })
  const uploadResult = await upload.done()
  const type = await FileType.fromBuffer(Buffer.concat(buffer))

  const fileLength = await findS3ContentLength(
    s3Client,
    bucket,
    key,
    fileLogger
  )
  const checksumSha256 = uploadResult.ChecksumSHA256

  return { fileLength, checksumSha256, detectedType: type?.mime }
}

export { uploadFile }
