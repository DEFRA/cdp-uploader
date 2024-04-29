import Boom from '@hapi/boom'
import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger'

const statusController = {
  handler: async (request, h) => {
    const uploadId = request.params.id
    if (!uploadId) {
      return Boom.notFound()
    }

    const uploadAndFiles = await request.redis.findUploadAndFiles(uploadId)
    const files = uploadAndFiles?.files
    const uploadDetails = uploadAndFiles?.uploadDetails

    if (!uploadDetails) {
      return Boom.notFound()
    }

    createUploadLogger(request.logger, uploadDetails).debug(
      { uploadDetails },
      `Status found for ${uploadId}`
    )

    const response = toScanResultResponse(uploadId, uploadDetails, files)
    return h.response(response).code(200)
  }
}

export { statusController }
