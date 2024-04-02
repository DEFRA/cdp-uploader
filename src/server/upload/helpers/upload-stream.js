import { Upload } from '@aws-sdk/lib-storage'

import stream from 'stream'

import { createLogger } from '~/src/server/common/helpers/logging/logger'
import FileType from 'file-type'

const logger = createLogger()

async function uploadStream(s3Client, Bucket, Key, fileStream, metadata) {
  const passThrough = new stream.PassThrough()
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

  const fileTypeStream = await FileType.stream(fileStream.pipe(passThrough))
  // TODO: if we want to prevent certain mime types we should do the check here and call upload.abort()
  const uploadResult = await upload.done()

  return {
    uploadResult,
    contentType: fileTypeStream.fileType // if the type isn't detectable (by looking at bytes) its null
  }
}

export { uploadStream }
