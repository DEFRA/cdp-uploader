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
    if (!canBeQuarantined(uploadDetails)) {
      // TODO: how do we communicate this failure reason?
      request.logger.info(
        `upload id ${id} has already been used to upload a file.`
      )
      return h.redirect(uploadDetails.failureRedirect)
    }

    uploadDetails.fields = {}

    try {
      const payload = request.payload
      const result = {}

      for (const f in payload) {
        // what is this?
        if (payload[f]) {
          const field = payload[f]
          if (field.hapi?.filename) {
            const filename = field.hapi.filename
            request.logger.info(`Uploading ${JSON.stringify(filename)}`)
            const fileKey = `${id}/${filename}`

            // TODO: check result of upload and redirect on error
            await uploadStream(request.s3, quarantineBucket, fileKey, field, {
              callback: uploadDetails.scanResultCallback,
              destination: uploadDetails.destinationBucket
            })
            uploadDetails.fields[f] = {
              fileName: filename,
              contentType: field.hapi?.headers['content-type'] ?? ''
            }
          } else {
            // save non-file fields
            uploadDetails.fields[f] = payload[f]
          }
        }
      }
      request.logger.info(
        `Uploaded to ${JSON.stringify(result.data?.Location)}`
      )

      // update the record in redis
      uploadDetails.uploadStatus = uploadStatus.quarantined

      // uploadDetails.quarantined = new Date()

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
