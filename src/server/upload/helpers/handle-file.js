import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload/helpers/upload-stream'
import { uploadStatus } from '~/src/server/common/helpers/upload-status'
import { fileErrorMessages } from '~/src/server/common/constants/file-error-messages'

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
  const errorDetail = { hasError: false }

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

    errorDetail.errorMessage = fileErrorMessages.empty
    errorDetail.hasError = true
  }

  const actualContentType = uploadResult.fileTypeResult?.mime
  const files = {
    uploadId,
    fileId,
    fileStatus: uploadStatus.pending.description,
    pending: new Date().toISOString(),
    actualContentType,
    contentLength: uploadResult.fileLength,
    ...contentType,
    ...filename,
    ...errorDetail
  }
  await request.redis.storeFileDetails(fileId, files)

  return {
    fileId,
    actualContentType,
    ...filename,
    ...contentType,
    ...errorDetail
  }
}

export { handleFile }
