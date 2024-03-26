import Boom from '@hapi/boom'
import * as crypto from 'node:crypto'

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
    const uploadId = request.params.id
    if (!uploadId) {
      request.logger.info('Failed to upload, no id')
      return h.response(Boom.notFound('Failed to upload. No id'))
    }

    const uploadDetails = await request.redis.findUploadDetails(uploadId)

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
        `upload id ${uploadId} has already been used to upload a file.`
      )
      return h.redirect(uploadDetails.failureRedirect)
    }

    uploadDetails.fields = {}
    uploadDetails.files = []

    try {
      const payload = request.payload
      const result = {}

      for (const f in payload) {
        // what is this?
        if (payload[f]) {
          const field = payload[f]
          if (field.hapi?.filename) {
            const filename = field.hapi.filename
            const fileId = crypto.randomUUID()
            request.logger.info(
              `Uploading ${JSON.stringify(filename)} as ${fileId}`
            )
            const fileKey = `${uploadId}/${filename}`

            // TODO: check result of upload and redirect on error
            await uploadStream(request.s3, quarantineBucket, fileKey, field, {
              callback: uploadDetails.scanResultCallback,
              destination: uploadDetails.destinationBucket
            })
            uploadDetails.fields[f] = {
              filename,
              fileId,
              contentType: field.hapi?.headers['content-type'] ?? ''
            }
            uploadDetails.files.push(fileId)
            const fileDetails = {
              uploadId,
              fileId,
              filename,
              uploadStatus: uploadStatus.quarantined,
              quarantined: new Date()
            }
            await request.redis.storeScanDetails(fileId, fileDetails)
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

      await request.redis.storeUploadDetails(uploadId, uploadDetails)

      // TODO: check all the files sizes match the size set in uploadDetails
      return h.redirect(uploadDetails.successRedirect)
    } catch (e) {
      request.logger.error(e)
      return h.redirect(uploadDetails.failureRedirect)
    }
  }
}

export { uploadController }
