import FileType from 'file-type'
import { PassThrough } from 'node:stream'
import { Upload } from '@aws-sdk/lib-storage'

import { findS3ContentLength } from '~/src/server/common/helpers/s3/find-s3-content-length'

async function uploadStream(
  s3Client,
  bucket,
  key,
  fileStream,
  metadata,
  fileLogger
) {
  const fileTypeStream = fileStream.pipe(new PassThrough())

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Metadata: {
        ...metadata
      },
      Body: fileStream,
      ContentType: metadata.contentType
    },
    queueSize: 4,
    partSize: 1024 * 1024 * 5,
    leavePartsOnError: false
  })

  fileStream.on('error', (error) => {
    fileLogger.error(error, `Error: ${error}`)

    fileTypeStream.end()
  })

  const uploadResult = await upload.done()
  const fileTypeResult = await FileType.fromStream(fileTypeStream)

  const fileLength = await findS3ContentLength(
    s3Client,
    bucket,
    key,
    fileLogger
  )

  return {
    ...uploadResult,
    fileTypeResult,
    fileLength
  }
}

export { uploadStream }
