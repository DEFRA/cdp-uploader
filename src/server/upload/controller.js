import Boom from '@hapi/boom'

import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload/helpers/upload-stream'
import { uploadPathValidation } from '~/src/server/upload/helpers/upload-validation'
import {
  uploadStatus,
  canBeQuarantined
} from '~/src/server/common/helpers/upload-status'

const quarantineBucket = config.get('quarantineBucket')

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
    const id = request.params.id
    if (!id) {
      request.logger.info('Failed to upload, no id')
      return h.response(Boom.notFound('Failed to upload. No id'))
    }

    const uploadDetails = await request.redis.findUploadDetails(id)

    if (uploadDetails === null) {
      request.logger.info('Failed to upload, no uploadDetails data')
      // TODO: Show user-friendly error page
      return h.response(
        Boom.notFound('Failed to upload, no uploadDetails data')
      )
    }

    // Upload link has already been used
    if (!canBeQuarantined(uploadDetails?.uploadStatus)) {
      // TODO: how do we communicate this failure reason?
      request.logger.info(
        `upload id ${id} has already been used to upload a file.`
      )
      return h.redirect(uploadDetails.failureRedirect)
    }

    uploadDetails.fields = {}

    try {
      const files = request.payload
      const result = {}
      for (const f in files) {
        if (files[f]) {
          const file = files[f]
          if (file.hapi?.filename) {
            request.logger.info(
              `Uploading ${JSON.stringify(file.hapi.filename)}`
            )
            const fileKey = `${id}/${file.hapi.filename}`

            // TODO: check result of upload and redirect on error
            await uploadStream(request.s3, quarantineBucket, fileKey, file, {
              callback: uploadDetails.scanResultCallback,
              destination: uploadDetails.destinationBucket
            })
            uploadDetails.fields[f] = {
              fileName: file.hapi?.filename,
              contentType: file.hapi?.headers['content-type'] ?? ''
            }
          } else {
            // save non-file fields
            uploadDetails.fields[f] = files[f]
          }
        }
      }
      request.logger.info(
        `Uploaded to ${JSON.stringify(result.data?.Location)}`
      )

      // update the record in redis
      uploadDetails.uploadStatus = uploadStatus.quarantined
      uploadDetails.quarantined = new Date()

      await request.redis.storeUploadDetails(id, uploadDetails)

      // TODO: check all the files sizes match the size set in uploadDetails
      return h.redirect(uploadDetails.successRedirect)
    } catch (e) {
      request.logger.error(e)
      return h.redirect(uploadDetails.failureRedirect)
    }
  }
}

export { uploadController }
