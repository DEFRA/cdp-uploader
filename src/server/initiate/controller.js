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
    const uuid = crypto.randomUUID()
    const initiateRequest = request.payload

    initiateRequest.uploadStatus = uploadStatus.initiated
    initiateRequest.initiated = new Date()
    await request.redis.client.set(uuid, JSON.stringify(initiateRequest))

    request.logger.info({ initiateRequest }, `request ${uuid}`)

    return h
      .response({
        url: `${appBaseUrl}/upload/${uuid}`,
        id: uuid
      })
      .code(200)
  }
}

export { initiateController }
