import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload-and-scan/helpers/upload-stream'
import { fileStatus } from '~/src/server/common/constants/file-status'

async function handleFile(
  uploadId,
  uploadDetails,
  fileId,
  fileStream,
  request,
  fileLogger
) {
  const quarantineBucket = config.get('quarantineBucket')
  const hapiFilename = fileStream.hapi?.filename
  const filename = { ...(hapiFilename && { filename: hapiFilename }) }
  const hapiContentType = fileStream.hapi?.headers['content-type']
  const contentType = {
    ...(hapiContentType && { contentType: hapiContentType })
  }
  const fileKey = `${uploadId}/${fileId}`

  fileLogger.debug({ uploadDetails }, `Uploading fileId ${fileId}`)

  // TODO: check result of upload and redirect on error
  const uploadResult = await uploadStream(
    request.s3,
    quarantineBucket,
    fileKey,
    fileStream,
    {
      uploadId,
      fileId,
      ...contentType,
      ...filename
    },
    fileLogger
  )

  if (uploadResult.fileLength === 0) {
    fileLogger.warn(
      `uploadId ${uploadId} - fileId ${fileId} uploaded with unknown size`
    )

    return null
  }

  const actualContentType = uploadResult.fileTypeResult?.mime
  const files = {
    uploadId,
    fileId,
    fileStatus: fileStatus.pending,
    pending: new Date().toISOString(),
    actualContentType,
    contentLength: uploadResult.fileLength,
    ...contentType,
    ...filename
  }
  await request.redis.storeFileDetails(fileId, files)

  return {
    fileId,
    actualContentType,
    ...filename,
    ...contentType
  }
}

export { handleFile }
