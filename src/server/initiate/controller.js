import * as crypto from 'node:crypto'

import { config } from '~/src/config/index.js'
import { initiateValidation } from '~/src/server/initiate/helpers/initiate-validation.js'
import { uploadStatus } from '~/src/server/common/helpers/upload-status.js'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger.js'
import { counter } from '~/src/server/common/helpers/metrics/index.js'
import { sendSqsMessageStandard } from '~/src/server/common/helpers/sqs/send-sqs-message.js'

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

    await counter('uploads-initiated')

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
