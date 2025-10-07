import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file.js'
import { createReadStream } from 'fs'
import { unlink } from 'node:fs/promises'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger.js'

function isFile(formPart) {
  return formPart instanceof Object
}

async function handleMultipart(
  multipartValue,
  uploadId,
  uploadDetails,
  request
) {
  if (!isFile(multipartValue)) {
    return { responseValue: multipartValue }
  } else {
    const fileStream = multipartValue.path
      ? createReadStream(multipartValue.path)
      : undefined

    try {
      const file = {
        filename: multipartValue.filename,
        contentType: multipartValue.headers?.['content-type'],
        contentLength: multipartValue.bytes,
        fileStream
      }
      const { fileId, filename, contentType, fileStatus, missing } =
        await handleFile(uploadId, uploadDetails, file, request)

      if (missing) {
        return {}
      }

      // This will update the uploadDetails - add file information to file stored in redis (not here)
      const responseValue = { fileId, filename, contentType }

      return { responseValue, fileId, status: fileStatus }
    } finally {
      try {
        if (multipartValue.path) {
          await unlink(multipartValue.path)
        }
      } catch (error) {
        createUploadLogger(request.logger, uploadDetails).error(
          { uploadDetails, error },
          'Error deleting file'
        )
      }
    }
  }
}

export { handleMultipart }
