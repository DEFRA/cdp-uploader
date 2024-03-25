import { Upload } from '@aws-sdk/lib-storage'

import stream from 'stream'

import { createLogger } from '~/src/server/common/helpers/logging/logger'
import FileType from 'file-type'

const logger = createLogger()

async function uploadStream(s3Client, Bucket, Key, fileStream, metadata) {
  const passThrough = new stream.PassThrough()
  const pass2 = new stream.PassThrough()

  const upload = new Upload({
    client: s3Client,
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

  fileStream.pipe(passThrough).pipe(pass2)

  console.log(await FileType.fromStream(pass2))

  return await upload.done()
}

export { uploadStream }
