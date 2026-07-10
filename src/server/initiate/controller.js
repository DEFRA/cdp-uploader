import * as crypto from 'node:crypto'

import { config } from '~/src/config/index.js'
import { initiateValidation } from '~/src/server/initiate/helpers/initiate-validation.js'
import { uploadStatus } from '~/src/server/common/helpers/upload-status.js'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger.js'
import { sendSqsMessageStandard } from '~/src/server/common/helpers/sqs/send-sqs-message.js'
import Joi from 'joi'
import {
  initiateBadRequestResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/server/common/helpers/error-response-schema.js'

const appBaseUrl = config.get('appBaseUrl')
const isDevelopment = config.get('isDevelopment')

const downloadRequestQueueUrl = config.get('sqsDownloadRequests.queueUrl')

const initiateController = {
  options: {
    validate: {
      payload: initiateValidation
    },
    payload: {
      output: 'data',
      parse: true,
      allow: 'application/json'
    },
    tags: ['api', 'Initiate'],
    description: 'Initiate an upload request',
    notes:
      'Initiates a new upload request. Returns URLs and an upload ID required for subsequent upload and status requests.',
    response: {
      status: {
        201: Joi.object({
          uploadId: Joi.string().example(
            '7f3c9b12-4d8e-4a6f-9c21-8b5e3d7a2f10'
          ),
          uploadUrl: Joi.string().example(
            '/upload-and-scan/7f3c9b12-4d8e-4a6f-9c21-8b5e3d7a2f10'
          ),
          statusUrl: Joi.string().example(
            'https://cdp-uploader..example.com/status/7f3c9b12-4d8e-4a6f-9c21-8b5e3d7a2f10'
          )
        }).label('InitiateUploadSuccessResponse'),
        400: initiateBadRequestResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },
  async handler(request, h) {
    const uploadId = crypto.randomUUID()
    const initiateRequest = request.payload

    const isDownloadRequest = !!request.payload.downloadUrls

    const uploadDetails = {
      uploadId,
      uploadStatus: uploadStatus.initiated.description,
      initiated: new Date().toISOString(),
      isDownloadRequest,
      form: {},
      fileIds: [],
      request: initiateRequest
    }

    await request.redis.storeUploadDetails(uploadId, uploadDetails)

    const logger = createUploadLogger(request.logger, uploadDetails)

    logger.info(`Request ${uploadId} initiated`)

    if (isDownloadRequest) {
      await sendSqsMessageStandard(
        request.server.sqs,
        downloadRequestQueueUrl,
        { uploadId }
      )
    }

    await request.metrics().counter('uploads-initiated')

    const relativeUploadUrl = `/upload-and-scan/${uploadId}`

    let uploadUrl
    if (!isDownloadRequest) {
      uploadUrl = isDevelopment
        ? `${appBaseUrl}${relativeUploadUrl}`
        : relativeUploadUrl
    }

    return h
      .response({
        uploadId,
        ...(uploadUrl && { uploadUrl }),
        statusUrl: `${appBaseUrl}/status/${uploadId}`
      })
      .code(201)
  }
}

export { initiateController }
