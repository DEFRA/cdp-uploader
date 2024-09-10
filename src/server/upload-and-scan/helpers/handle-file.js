import { config } from '~/src/config/index.js'
import { uploadFile } from '~/src/server/upload-and-scan/helpers/upload-file.js'
import { fileStatus } from '~/src/server/common/constants/file-status.js'
import { counter } from '~/src/server/common/helpers/metrics/index.js'
import { fileSize } from '~/src/server/common/helpers/metrics/counter.js'
import { fileErrorMessages } from '~/src/server/common/constants/file-error-messages.js'
import { filesize } from 'filesize'
import { unlink } from 'node:fs/promises'
import FileType from 'file-type'
import crypto from 'node:crypto'
import { createFileLogger } from '~/src/server/common/helpers/logging/logger.js'
import mime from 'mime-types'

const quarantineBucket = config.get('quarantineBucket')
const uploaderMaxSize = config.get('maxFileSize')

async function handleFile(uploadId, uploadDetails, file, request) {
  const fileId = crypto.randomUUID()
  const fileLogger = createFileLogger(request.logger, uploadDetails, fileId)

  try {
    const filename = file?.filename
    const contentType = file?.headers?.['content-type']
    const fileKey = `${uploadId}/${fileId}`

    await counter('file-received')
    const maxFileSize = uploadDetails.request.maxFileSize || uploaderMaxSize
    const mimeTypes = uploadDetails.request?.mimeTypes

    const response = {
      uploadId,
      fileId,
      fileStatus: fileStatus.pending,
      pending: new Date().toISOString(),
      contentLength: file.bytes,
      ...(contentType && { contentType }),
      ...(filename && { filename }),
      ...rejectMissingFile(file),
      ...rejectZeroLengthFile(file),
      ...rejectTooBigFile(file, maxFileSize),
      ...rejectWrongMimeType(file, contentType, mimeTypes)
    }

    const shouldUploadFile =
      !response.missing && !response.hasError && file?.path

    if (shouldUploadFile) {
      fileLogger.info({ uploadDetails }, `Uploading fileId ${fileId}`)
      const metadata = {
        uploadId,
        fileId,
        ...(contentType && { contentType }),
        ...(filename && { filename })
      }

      // TODO: check result of upload and redirect on error
      const uploadResult = await uploadFile(
        request.s3,
        quarantineBucket,
        fileKey,
        file.path,
        metadata,
        fileLogger
      )
      const fileTypeResult = await FileType.fromFile(file.path)
      fileLogger.debug({ uploadResult }, `Upload complete for fileId ${fileId}`)

      response.detectedContentType = fileTypeResult?.mime
      response.contentLength = uploadResult.fileLength
      response.checksumSha256 = uploadResult.checksumSha256
      await fileSize('file-size', uploadResult.fileLength)
    }

    if (!response.missing) {
      await request.redis.storeFileDetails(fileId, response)
    }
    return response
  } finally {
    try {
      await unlink(file.path)
    } catch (error) {
      fileLogger.error({ uploadDetails, error }, 'Error deleting file')
    }
  }
}

function rejectMissingFile(file) {
  const missingFile =
    file.bytes === 0 && (!file.filename || file.filename === '')
  return missingFile ? { missing: true } : {}
}

function rejectZeroLengthFile(file) {
  const zeroLengthFile = file.bytes === 0 && file?.filename !== ''
  // Reject zero length response
  return zeroLengthFile
    ? {
        fileStatus: fileStatus.rejected,
        hasError: true,
        errorMessage: fileErrorMessages.empty
      }
    : {}
}

function rejectTooBigFile(file, maxFileSize) {
  // Reject file if it's too big
  return file.bytes > maxFileSize
    ? {
        fileStatus: fileStatus.rejected,
        hasError: true,
        errorMessage: fileErrorMessages.tooBig.replace(
          '$MAXSIZE',
          filesize(maxFileSize, { standard: 'si' })
        )
      }
    : {}
}

function rejectWrongMimeType(file, contentType, mimeTypes) {
  // Reject file if the mime types dont match
  // TODO: what do we do with the detected mime type
  const mimeTypeMismatch =
    mimeTypes && !mimeTypes.some((m) => m === contentType)

  const createMessage = () => {
    const extensions = mimeTypes
      .map((mimeType) => mime.extension(mimeType))
      .filter(Boolean)
      .map((mimeType) => mimeType.toUpperCase())
    const uniqueExtensions = Array.from(new Set(extensions))

    const last = uniqueExtensions.pop()
    return uniqueExtensions.length
      ? uniqueExtensions.join(', ') + ' or ' + last
      : last
  }

  return mimeTypeMismatch
    ? {
        fileStatus: fileStatus.rejected,
        hasError: true,
        errorMessage: fileErrorMessages.wrongType.replace(
          '$MIMETYPES',
          createMessage()
        )
      }
    : {}
}

export { handleFile }
