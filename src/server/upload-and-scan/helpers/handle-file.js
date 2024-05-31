import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload-and-scan/helpers/upload-stream'
import { fileStatus } from '~/src/server/common/constants/file-status'
import { counter } from '~/src/server/common/helpers/metrics'
import { fileSize } from '~/src/server/common/helpers/metrics/counter'
import { fileErrorMessages } from '~/src/server/common/constants/file-error-messages'
import { filesize } from 'filesize'

const quarantineBucket = config.get('quarantineBucket')
const uploaderMaxSize = config.get('maxFileSize')

async function handleFile(
  uploadId,
  uploadDetails,
  fileId,
  fileStream,
  request,
  fileLogger
) {
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

  fileLogger.debug({ uploadResult }, `Upload complete for fileId ${fileId}`)

  const detectedContentType = uploadResult.fileTypeResult?.mime

  const files = {
    uploadId,
    fileId,
    fileStatus: fileStatus.pending,
    pending: new Date().toISOString(),
    detectedContentType,
    contentLength: uploadResult.fileLength,
    checksumSha256: uploadResult.checksumSha256,
    ...contentType,
    ...filename
  }

  if (files.contentLength === 0 && (!files.filename || files.filename === '')) {
    files.missing = true
    return files
  }

  // Reject zero length files
  if (files.contentLength === 0) {
    files.fileStatus = fileStatus.rejected
    files.hasError = true
    files.errorMessage = fileErrorMessages.empty
  }

  const maxFileSize = uploadDetails.request.maxFileSize || uploaderMaxSize

  // Reject file if its too big
  if (uploadResult.fileLength > maxFileSize) {
    files.fileStatus = fileStatus.rejected
    files.hasError = true
    files.errorMessage = fileErrorMessages.tooBig.replace(
      '$MAXSIZE',
      filesize(maxFileSize, { standard: 'jedec' })
    )
  }

  // Reject file if the mime types dont match
  // TODO: what do we do with the detected mime type
  if (
    uploadDetails.request.mimeTypes &&
    !uploadDetails.request.mimeTypes.some((m) => m === contentType.contentType)
  ) {
    files.fileStatus = fileStatus.rejected
    files.hasError = true
    files.errorMessage = fileErrorMessages.wrongType.replace(
      '$MIMETYPES',
      uploadDetails.request.mimeTypes.join(', ')
    )
  }

  await request.redis.storeFileDetails(fileId, files)
  await counter('file-received')
  await fileSize('file-size', uploadResult.fileLength)

  return files
}

export { handleFile }
