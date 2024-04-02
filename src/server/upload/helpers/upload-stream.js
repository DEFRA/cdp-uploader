import { Upload } from '@aws-sdk/lib-storage'

import stream from 'stream'

import { createLogger } from '~/src/server/common/helpers/logging/logger'

const logger = createLogger()

async function uploadStream(s3Client, Bucket, Key, fileStream, metadata) {
  const passThrough = new stream.PassThrough()
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket,
      Key,
      Metadata: {
        ...metadata
      },
      Body: passThrough
    },
    // tags:[],
    queueSize: 4,
    partSize: 1024 * 1024 * 5,
    leavePartsOnError: false
  })

  upload.on('httpUploadProgress', (progress) => {
    logger.debug(progress)
  })

  fileStream.pipe(passThrough)
  return await upload.done()
}

export { uploadStream }
