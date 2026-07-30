import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response.js'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger.js'
import Joi from 'joi'

const statusController = {
  options: {
    tags: ['api', 'Status'],
    description: 'Get upload status',
    notes:
      'Retrieves the current status of an upload session, including the upload status, metadata and details of uploaded files. The uploadId is provided via the /initiate call.',
    validate: {
      params: Joi.object({
        uploadId: Joi.string()
          .required()
          .example('7f3c9b12-4d8e-4a6f-b512-9a6d3f8c1e25')
      }),
      query: Joi.object({
        debug: Joi.boolean()
          .optional()
          .description(
            'Set to true to include debug information (the original initiate request payload).'
          )
          .example(false)
      })
    },
    response: {
      status: {
        200: Joi.object({
          uploadStatus: Joi.string()
            .valid('initiated', 'pending', 'ready')
            .example('ready'),

          metadata: Joi.object().unknown(true).example({
            customerId: '1234',
            accountId: '5678'
          }),

          form: Joi.object()
            .unknown(true)
            .example({
              successfulFile: {
                fileId: '9fcaabe5-77ec-44db-8356-3a6e8dc51b13',
                filename: 'document.pdf',
                contentType: 'application/pdf',
                fileStatus: 'complete',
                contentLength: 204800,
                checksumSha256: 'bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=',
                detectedContentType: 'application/pdf',
                s3Key: 'scanned/9fcaabe5-77ec-44db-8356-3a6e8dc51b13',
                s3Bucket: 'my-service'
              },
              rejectedFile: {
                fileId: 'f45d0dd4-dd3f-4235-9c45-da2edd5c89fd',
                filename: 'large-document.pdf',
                contentType: 'application/pdf',
                fileStatus: 'rejected',
                contentLength: 20480000,
                hasError: true,
                errorMessage: 'The selected file must be smaller than 10 MB',
                errorCode: 'FILE_TOO_LARGE',
                errorParams: {
                  maxFileSize: 10000000
                }
              }
            }),

          numberOfRejectedFiles: Joi.number().integer().example(0),

          debug: Joi.object()
            .unknown(true)
            .optional()
            .description('Only returned when debug=true.')
        }).label('UploadStatusResponse')
      }
    }
  },
  async handler(request, h) {
    const uploadId = request.params.uploadId

    const debug = request.query.debug === true

    const uploadAndFiles = await request.redis.findUploadAndFiles(uploadId)
    const files = uploadAndFiles?.files
    const uploadDetails = uploadAndFiles?.uploadDetails

    if (!uploadDetails) {
      return h
        .response({
          message: 'UploadId not found'
        })
        .code(404)
    }

    createUploadLogger(request.logger, uploadDetails).debug(
      { uploadDetails, files },
      `Status found for ${uploadId}`
    )

    const response = toScanResultResponse(uploadId, uploadDetails, files, debug)
    return h.response(response).code(200)
  }
}

export { statusController }
