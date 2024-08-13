import crypto from 'node:crypto'
import { Stream } from 'node:stream'

import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file.js'
import { createFileLogger } from '~/src/server/common/helpers/logging/logger.js'

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

    const { filename, contentType, fileStatus, missing } = await handleFile(
      uploadId,
      uploadDetails,
      fileId,
      multipartValue,
      request,
      fileLogger
    )

    if (missing) {
      return {}
    }

    // This will update the uploadDetails - add file information to file stored in redis (not here)
    const responseValue = {
      fileId,
      filename,
      contentType
    }

    return { responseValue, fileId, status: fileStatus }
  }
}

export { handleMultipart }
