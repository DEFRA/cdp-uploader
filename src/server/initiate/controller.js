import * as crypto from 'node:crypto'

import { config } from '~/src/config/index.js'
import { initiateValidation } from '~/src/server/initiate/helpers/initiate-validation.js'
import { uploadStatus } from '~/src/server/common/helpers/upload-status.js'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger.js'
import { counter } from '~/src/server/common/helpers/metrics/index.js'

const appBaseUrl = config.get('appBaseUrl')
const isDevelopment = config.get('isDevelopment')

const initiateController = {
  options: {
    validate: {
      payload: initiateValidation
    },
    payload: {
      output: 'data',
      parse: true,
      allow: 'application/json'
    }
  },
  handler: async (request, h) => {
    const uploadId = crypto.randomUUID()
    const initiateRequest = request.payload

    const uploadDetails = {
      uploadId,
      uploadStatus: uploadStatus.initiated.description,
      initiated: new Date().toISOString(),
      form: {},
      fileIds: [],
      request: initiateRequest
    }

    await request.redis.storeUploadDetails(uploadId, uploadDetails)

    createUploadLogger(request.logger, uploadDetails).info(
      `Request ${uploadId} initiated`
    )

    await counter('uploads-initiated')

    const relativeUploadUrl = `/upload-and-scan/${uploadId}`

    const uploadUrl = isDevelopment
      ? `${appBaseUrl}${relativeUploadUrl}`
      : relativeUploadUrl

    return h
      .response({
        uploadId,
        uploadUrl,
        statusUrl: `${appBaseUrl}/status/${uploadId}`
      })
      .code(201)
  }
}

export { initiateController }
