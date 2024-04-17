import Boom from '@hapi/boom'
import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'

const statusController = {
  handler: async (request, h) => {
    const uploadId = request.params.id
    if (!uploadId) {
      return Boom.notFound()
    }

    const { files, uploadDetails } =
      await request.redis.findUploadAndFiles(uploadId)

    if (!uploadDetails) {
      return Boom.notFound()
    }

    request.logger.debug(uploadDetails, `Status found for ${uploadId}`)
    const response = toScanResultResponse(uploadId, uploadDetails, files)
    return h.response(response).code(200)
  }
}

export { statusController }
