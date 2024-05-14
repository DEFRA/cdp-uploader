import Boom from '@hapi/boom'

import { createUploadLogger } from '~/src/server/common/helpers/logging/logger'
import { handleMultipart } from '~/src/server/upload-and-scan/helpers/handle-multipart'
import { uploadPathValidation } from '~/src/server/upload-and-scan/helpers/upload-validation'
import {
  isInitiated,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import { stringArrayToObject } from '~/src/server/common/helpers/stringArrayToObject'
import { counter } from '~/src/server/common/helpers/metrics'
import { config } from '~/src/config'
import { fileStatus } from '~/src/server/common/constants/file-status'
import { processScanComplete } from '~/src/server/scan/listener/helpers/process-scan-complete'

// Todo return a nice error message for http://localhost:7337/upload-and-scan (uuid missing)
const uploadController = {
  options: {
    validate: {
      params: uploadPathValidation
    },
    payload: {
      allow: 'multipart/form-data',
      multipart: true,
      output: 'stream',
      parse: true,
      maxBytes: config.get('maxFileSize'),
      uploads: 'uploads'
    }
  },
  handler: async (request, h) => {
    const uploadId = request.params.id
    if (!uploadId) {
      request.logger.info('Failed to upload, no uploadId')
      return Boom.notFound('Failed to upload. No uploadId provided')
    }

    const uploadDetails = await request.redis.findUploadDetails(uploadId)

    const uploadLogger = createUploadLogger(request.logger, uploadDetails)

    if (!uploadDetails) {
      uploadLogger.info(`uploadId ${uploadId} does not exist - upload failed`)
      return Boom.notFound('Failed to upload. UploadId does not exist')
    }

    uploadLogger.debug({ uploadDetails }, `Upload request received`)

    // Upload link has already been used
    if (!isInitiated(uploadDetails.uploadStatus)) {
      uploadLogger.warn(
        `uploadId ${uploadId} has already been used to upload files`
      )
      return h.redirect(uploadDetails.redirect) // TODO: how do we communicate this failure reason?
    }

    try {
      const multipart = stringArrayToObject(request.payload)

      const fileStatuses = []
      for (const [partKey, mValue] of Object.entries(multipart)) {
        const partValues = Array.isArray(mValue) ? mValue : [mValue]
        const elemFields = []
        for (const partValue of partValues) {
          const { responseValue, fileId, status } = await handleMultipart(
            partValue,
            uploadId,
            uploadDetails,
            request
          )

          if (responseValue) {
            elemFields.push(responseValue)
          }
          if (fileId && status) {
            uploadDetails.fileIds.push(fileId)
            fileStatuses.push({ fileId, status })
          }
        }
        if (elemFields.length > 1) {
          uploadDetails.fields[partKey] = elemFields
        } else if (elemFields.length === 1) {
          uploadDetails.fields[partKey] = elemFields[0]
        }
      }

      uploadDetails.pending = new Date().toISOString()
      uploadDetails.uploadStatus = uploadStatus.pending.description

      // If no files are submitted jump straight to 'ready'.
      if (fileStatuses.length === 0) {
        uploadDetails.uploadStatus = uploadStatus.ready.description
      }

      await request.redis.storeUploadDetails(uploadId, uploadDetails)

      // If a file was rejected during the upload trigger processScanComplete
      // This will ensure the overall status gets updated.
      for (const s of fileStatuses) {
        if (s.status === fileStatus.rejected) {
          await processScanComplete(request.server, uploadId, s.fileId)
        }
      }

      await counter('upload-received')

      return h.redirect(uploadDetails.redirect)
    } catch (error) {
      createUploadLogger(uploadLogger, uploadDetails).error(error, 'Error')
      return h.redirect(uploadDetails.redirect) // TODO: how do we communicate this failure reason?
    }
  }
}

export { uploadController }
