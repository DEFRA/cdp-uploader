import pino from 'pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options'

function createLogger() {
  return pino(loggerOptions)
}

function createUploadLogger(logger, uploadDetails) {
  return logger.child({
    uploadId: uploadDetails?.uploadId,
    uploadStatus: uploadDetails?.uploadStatus,
    fileIds: uploadDetails?.fileIds
  })
}

function createFileLogger(logger, uploadDetails, fileId) {
  return createUploadLogger(logger, uploadDetails).child({ fileId })
}

export { createLogger, createUploadLogger, createFileLogger }
