import Boom from '@hapi/boom'

import { getUploadStatus } from '~/src/server/status/helpers/get-upload-status'

const statusController = {
  handler: async (request, h) => {
    const id = request.params.id
    if (!id) {
      return h.response(Boom.notFound())
    }

    const result = await getUploadStatus(request.redis.client, id)

    if (result) {
      return h.response(result).code(200)
    }

    return h.response(Boom.notFound())
  }
}

export { statusController }
