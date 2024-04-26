import crypto from 'node:crypto'
import { Stream } from 'node:stream'

import { handleFile } from '~/src/server/upload/helpers/handle-file'
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

    const filePart = await handleFile(
      uploadId,
      uploadDetails,
      fileId,
      multipartValue,
      request,
      fileLogger
    )

    return { responseValue: filePart, fileId }
  }
}

export { handleMultipart }
