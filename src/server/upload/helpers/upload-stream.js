import { Upload } from '@aws-sdk/lib-storage'
import stream from 'stream'
import { createLogger } from '~/src/server/common/helpers/logging/logger'
import FileType from 'file-type'

const logger = createLogger()

async function uploadStream(s3Client, Bucket, Key, fileStream, metadata) {
  const s3Stream = new stream.PassThrough()
  const mimeStream = new stream.PassThrough()

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket,
      Key,
      Metadata: {
        callback: metadata.callback,
        destination: metadata.destination
      },
      Body: s3Stream
    },
    // tags:[],

    queueSize: 4,
    partSize: 1024 * 1024 * 5,
    leavePartsOnError: false
  })

  upload.on('httpUploadProgress', (progress) => {
    logger.debug(progress)
  })

  const fileTypePromise = FileType.fromStream(mimeStream)

  fileStream.on('data', (chunk) => {
    s3Stream.write(chunk)
    mimeStream.write(chunk)
  })

  fileStream.on('end', () => {
    s3Stream.end()
    mimeStream.end()
  })

  const uploadResult = await upload.done() // TODO: do we need to call abort on exceptions?
  const fileType = await fileTypePromise
  return {
    uploadResult, // upload result has fields like Key, Bucket and Location
    contentType: fileType?.mime // if the type isn't detectable (by looking at bytes) its null
  }
}

export { uploadStream }
