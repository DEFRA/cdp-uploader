import * as crypto from 'crypto'
import { initiateValidation } from '~/src/server/initiate/helpers/initiate-validation'

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
  handler: (request, h) => {
    const uuid = crypto.randomUUID()
    const initiateRequest = request.payload
    request.redis.set(uuid, JSON.stringify(initiateRequest))
    request.logger.info(`request ${uuid} ${initiateRequest}`)
    const payload = {
      url: `/file-upload/${uuid}`
    }
    return h.response(payload).code(200)
  }
}

export { initiateController }
