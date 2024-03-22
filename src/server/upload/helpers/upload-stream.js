import { Upload } from '@aws-sdk/lib-storage'

import stream from 'stream'

import { s3client } from '~/src/server/common/helpers/s3-client'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

const logger = createLogger()

async function uploadStream(Bucket, Key, fileStream, metadata) {
  const passThrough = new stream.PassThrough()
  const upload = new Upload({
    client: s3client,
    params: {
      Bucket,
      Key,
      Metadata: {
        callback: metadata.callback,
        destination: metadata.destination
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
