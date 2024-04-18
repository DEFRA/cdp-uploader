import * as crypto from 'node:crypto'

import { config } from '~/src/config'
import { initiateValidation } from '~/src/server/initiate/helpers/initiate-validation'
import { uploadStatus } from '~/src/server/common/helpers/upload-status'

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
    uploadDetails.initiated = new Date()
    await request.redis.storeUploadDetails(uploadId, uploadDetails)

    const childLogger = request.logger.child({
      uploadId,
      uploadDetails
    })

    childLogger.debug(`request ${uploadId}`)

    return h
      .response({
        url: `${appBaseUrl}/upload/${uploadId}`,
        uploadId
      })
      .code(200)
  }
}

export { initiateController }
