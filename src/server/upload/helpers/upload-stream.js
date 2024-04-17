import { PassThrough } from 'node:stream'
import FileType from 'file-type'

import { Upload } from '@aws-sdk/lib-storage'

import { findS3ContentLength } from '~/src/server/common/helpers/s3/find-s3-content-length'

async function uploadStream(
  s3Client,
  bucket,
  key,
  fileStream,
  metadata,
  logger
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

  //   upload.on('httpUploadProgress', (progress) => {
  //     logger.info(progress, 'Progress:')
  //   })

  fileStream.on('error', (error) => {
    logger.info(error, 'Error:')

    fileTypeStream.end()
  })

  const uploadResult = await upload.done()
  const fileTypeResult = await FileType.fromStream(fileTypeStream)

  const fileLength = await findS3ContentLength(s3Client, bucket, key, logger)

  return {
    ...uploadResult,
    fileTypeResult,
    fileLength
  }
}

export { uploadStream }
