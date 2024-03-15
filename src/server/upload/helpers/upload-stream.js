import { Upload } from '@aws-sdk/lib-storage'

import stream from 'stream'

import { s3client } from '~/src/server/upload/helpers/s3-client'

async function uploadStream(Bucket, Key, fileStream) {
  const passThrough = new stream.PassThrough()
  let res
  try {
    const upload = new Upload({
      s3client,
      params: {
        Bucket,
        Key,
        Body: passThrough
      },
      // tags:[],
      queueSize: 4,
      partSize: 1024 * 1024 * 5,
      leavePartsOnError: false
    })

    //  upload.on('httpUploadProgress', (progress) => {
    //    console.log(progress)
    //  })

    fileStream.pipe(passThrough)
    res = await upload.done()
  } catch (e) {
    //  console.log(e)
  }

  return res
}

export { uploadStream }
