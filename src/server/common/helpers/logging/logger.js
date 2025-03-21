import { pino } from 'pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

function createLogger() {
  return pino(loggerOptions)
}

function createUploadLogger(logger, uploadDetails) {
  return logger.child({
    'cdp-uploader': {
      uploadId: uploadDetails?.uploadId,
      uploadStatus: uploadDetails?.uploadStatus,
      fileIds: uploadDetails?.fileIds
    }
  })
}

function createFileLogger(logger, uploadDetails, fileId) {
  return logger.child({
    'cdp-uploader': {
      uploadId: uploadDetails?.uploadId,
      uploadStatus: uploadDetails?.uploadStatus,
      fileIds: uploadDetails?.fileIds,
      fileId
    }
  })
}

export { createLogger, createUploadLogger, createFileLogger }
