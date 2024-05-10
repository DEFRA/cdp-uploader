import crypto from 'node:crypto'
import { Stream } from 'node:stream'

import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file'
import { createFileLogger } from '~/src/server/common/helpers/logging/logger'

function isFile(formPart) {
  return formPart instanceof Stream
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
    const fileId = crypto.randomUUID()
    const fileLogger = createFileLogger(request.logger, uploadDetails, fileId)

    const { actualContentType, filename, contentType, fileStatus } =
      await handleFile(
        uploadId,
        uploadDetails,
        fileId,
        multipartValue,
        request,
        fileLogger
      )

    const responseValue = {
      fileId,
      actualContentType,
      filename,
      contentType
    }

    return { responseValue, fileId, status: fileStatus }
  }
}

export { handleMultipart }
