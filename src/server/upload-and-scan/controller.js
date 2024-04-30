import Boom from '@hapi/boom'

import { createUploadLogger } from '~/src/server/common/helpers/logging/logger'
import { handleMultipart } from '~/src/server/upload-and-scan/helpers/handle-multipart'
import { uploadPathValidation } from '~/src/server/upload-and-scan/helpers/upload-validation'
import {
  isInitiated,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import { hasErrors } from '~/src/server/common/helpers/has-errors'

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
      maxBytes: 200 * 1024 * 1024, // 200MB
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
      return h.redirect(uploadDetails.failureRedirect) // TODO: how do we communicate this failure reason?
    }

    try {
      const multipart = request.payload

      for (const [partKey, mValue] of Object.entries(multipart)) {
        const partValues = Array.isArray(mValue) ? mValue : [mValue]
        const elemFields = []
        for (const partValue of partValues) {
          const { responseValue, fileId } = await handleMultipart(
            partValue,
            uploadId,
            uploadDetails,
            request
          )
          if (responseValue && fileId) {
            uploadDetails.fileIds.push(fileId)
          }
          if (responseValue) {
            elemFields.push(responseValue)
          }
        }
        if (elemFields.length > 1) {
          uploadDetails.fields[partKey] = elemFields
        } else if (elemFields.length === 1) {
          uploadDetails.fields[partKey] = elemFields[0]
        }
      }

      uploadDetails.uploadStatus = hasErrors(uploadDetails.fields)
        ? uploadStatus.ready.description
        : uploadStatus.pending.description
      uploadDetails.pending = new Date().toISOString()
      await request.redis.storeUploadDetails(uploadId, uploadDetails)

      // TODO: check all the files sizes match the size set in uploadDetails
      return h.redirect(uploadDetails.redirect)
    } catch (error) {
      createUploadLogger(uploadLogger, uploadDetails).error(error, 'Error')
      return h.redirect(uploadDetails.redirect) // TODO: how do we communicate this failure reason?
    }
  }
}

export { uploadController }
