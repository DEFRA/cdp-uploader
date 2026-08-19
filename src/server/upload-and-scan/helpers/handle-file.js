import { config } from '~/src/config/index.js'
import { uploadFile } from '~/src/server/upload-and-scan/helpers/upload-file.js'
import { fileStatus } from '~/src/server/common/constants/file-status.js'
import { fileErrors } from '~/src/server/common/constants/file-errors.js'
import { filesize } from 'filesize'
import crypto from 'node:crypto'
import { createFileLogger } from '~/src/server/common/helpers/logging/logger.js'
import mime from 'mime-types'
import rfc2047 from 'rfc2047'

const quarantineBucket = config.get('quarantineBucket')
const uploaderMaxSize = config.get('maxFileSize')

async function handleFile(
  uploadId,
  uploadDetails,
  file,
  { logger, s3, redis, metrics },
  customRejection = {}
) {
  const fileId = crypto.randomUUID()
  const fileLogger = createFileLogger(logger, uploadDetails, fileId)
  const { filename, contentType, contentLength, fileStream } = file
  const fileKey = `${uploadId}/${fileId}`
  const mimeTypes = uploadDetails.request?.mimeTypes
  const maxFileSize = uploadDetails.request?.maxFileSize || uploaderMaxSize

  const encodedFilename = rfc2047.encode(filename)
  await metrics().counter('file-received')

  const response = {
    uploadId,
    fileId,
    fileStatus: fileStatus.pending,
    pending: new Date().toISOString(),
    contentLength,
    ...(contentType && { contentType }),
    ...(filename && { filename }),
    ...rejectMissingFile(file),
    ...rejectZeroLengthFile(file),
    ...rejectTooBigFile(file, maxFileSize),
    ...rejectWrongMimeType(contentType, mimeTypes),
    ...(customRejection && { ...customRejection })
  }

  const shouldUploadFile = !response.missing && !response.hasError && fileStream

  if (shouldUploadFile) {
    fileLogger.info({ uploadDetails }, `Uploading fileId ${fileId}`)
    const metadata = {
      uploadId,
      fileId,
      ...(contentType && { contentType }),
      ...(encodedFilename && { encodedFilename })
    }

    // TODO: check result of upload and redirect on error
    const uploadResult = await uploadFile(
      s3,
      quarantineBucket,
      fileKey,
      fileStream,
      contentLength,
      metadata,
      fileLogger
    )

    fileLogger.debug({ uploadResult }, `Upload complete for fileId ${fileId}`)

    if (uploadResult.fileLength == null && contentLength != null) {
      fileLogger.warn(
        `Could not verify content length via HeadObject for fileId ${fileId}, ` +
          `falling back to the length reported at upload time (${contentLength})`
      )
    } else if (
      uploadResult.fileLength != null &&
      contentLength != null &&
      uploadResult.fileLength !== contentLength
    ) {
      // Both values are known but disagree - shouldn't happen since contentLength is
      // measured from the exact bytes we uploaded, but log it if it ever does so we
      // can confirm (or disprove) that assumption.
      fileLogger.warn(
        `Content length mismatch for fileId ${fileId}: HeadObject reported ` +
          `${uploadResult.fileLength} bytes, but ${contentLength} bytes were reported at upload time`
      )
    }

    response.detectedContentType = uploadResult.detectedType
    // Prefer the length verified via HeadObject, but fall back to the length we already
    // knew before upload if that check fails - HeadObject can intermittently fail under
    // load, and previously left contentLength as null, which tenants' schemas may reject.
    response.contentLength = uploadResult.fileLength ?? contentLength
    response.checksumSha256 = uploadResult.checksumSha256
    if (response.contentLength) {
      await metrics().byteSize('file-size', response.contentLength)
    }
  }

  if (!response.missing) {
    await redis.storeFileDetails(fileId, response)
  }
  return response
}

function rejectMissingFile(file) {
  const missingFile =
    file.contentLength === 0 && (!file.filename || file.filename === '')
  return missingFile ? { missing: true } : {}
}

function rejectZeroLengthFile(file) {
  const zeroLengthFile = file.contentLength === 0 && file.filename !== ''
  // Reject zero length response
  return zeroLengthFile
    ? {
        fileStatus: fileStatus.rejected,
        hasError: true,
        errorMessage: fileErrors.empty.message,
        errorCode: fileErrors.empty.code
      }
    : {}
}

function rejectTooBigFile(file, maxFileSize) {
  // Reject file if it's too big
  const maxFileSizeFormatted = filesize(maxFileSize, { standard: 'si' })

  return file.contentLength > maxFileSize
    ? {
        fileStatus: fileStatus.rejected,
        hasError: true,
        errorMessage: fileErrors.tooBig.message.replace(
          '$MAXSIZE',
          maxFileSizeFormatted
        ),
        errorCode: fileErrors.tooBig.code,
        errorParams: {
          maxFileSize,
          maxFileSizeFormatted
        }
      }
    : {}
}

function rejectWrongMimeType(contentType, mimeTypes) {
  // Reject file if the mime types dont match
  // TODO: what do we do with the detected mime type
  const mimeTypeMismatch =
    mimeTypes && !mimeTypes.some((m) => m === contentType)

  if (!mimeTypeMismatch) {
    return {}
  }

  const fileExtensions = Array.from(
    new Set(
      mimeTypes
        .map((mimeType) => mime.extension(mimeType))
        .filter(Boolean)
        .map((extension) => extension.toUpperCase())
    )
  )

  const createMessage = () => {
    const extensions = [...fileExtensions]
    const last = extensions.pop()

    return extensions.length ? `${extensions.join(', ')} or ${last}` : last
  }

  return {
    fileStatus: fileStatus.rejected,
    hasError: true,
    errorMessage: fileErrors.wrongType.message.replace(
      '$MIMETYPES',
      createMessage()
    ),
    errorCode: fileErrors.wrongType.code,
    errorParams: {
      mimeTypes,
      fileExtensions
    }
  }
}

export { handleFile }
