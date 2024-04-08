import Boom from '@hapi/boom'
import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'

const statusController = {
  handler: async (request, h) => {
    const uploadId = request.params.id
    if (!uploadId) {
      return Boom.notFound()
    }

    const result = await request.redis.findUploadWithFiles(uploadId)

    if (!result) {
      return Boom.notFound()
    }
    const response = toScanResultResponse(uploadId, result)
    return h.response(response).code(200)
  }
}

export { statusController }
