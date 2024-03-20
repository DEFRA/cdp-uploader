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
  handler: async (request, h) => {
    const uuid = crypto.randomUUID()
    const initiateRequest = request.payload
    initiateRequest.done = false
    await request.redis.set(uuid, JSON.stringify(initiateRequest))

    request.logger.info({ initiateRequest }, `request ${uuid}`)

    const payload = {
      url: `http://localhost:7337/upload/${uuid}`
    }
    return h.response(payload).code(200)
  }
}

export { initiateController }
