import * as crypto from 'node:crypto'

import { config } from '~/src/config'
import { initiateValidation } from '~/src/server/initiate/helpers/initiate-validation'
import { uploadStatus } from '~/src/server/common/helpers/upload-status'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger'
import { withQueryParams } from '~/src/server/common/helpers/with-query-params'

const appBaseUrl = config.get('appBaseUrl')

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
    const uploadDetails = request.payload

    uploadDetails.uploadId = uploadId
    uploadDetails.uploadStatus = uploadStatus.initiated.description
    uploadDetails.initiated = new Date().toISOString()
    uploadDetails.fields = {}
    uploadDetails.fileIds = []
    uploadDetails.redirect = withQueryParams(uploadDetails.redirect, {
      uploadId
    })

    await request.redis.storeUploadDetails(uploadId, uploadDetails)

    createUploadLogger(request.logger, uploadDetails).info(
      `Request ${uploadId} initiated`
    )

    return h
      .response({
        statusUrl: `${appBaseUrl}/status/${uploadId}`,
        uploadAndScanUrl: `${appBaseUrl}/upload-and-scan/${uploadId}`,
        uploadId
      })
      .code(200)
  }
}

export { initiateController }
