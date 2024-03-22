import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload/helpers/upload-stream'
import {
  uploadPathValidation,
  uploadValidation
} from '~/src/server/upload/helpers/upload-validation'
import { UploadStatus } from '~/src/server/common/upload-status'

const quarantineBucket = config.get('quarantineBucket')

const uploadController = {
  options: {
    validate: {
      params: uploadPathValidation,
      payload: uploadValidation
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
      return h.response('Failed to upload. No id').code(404)
    }

    const init = JSON.parse(await request.redis.get(id))
    if (init === null) {
      request.logger.info('Failed to upload, no init data')
      // TODO: Show user-friendly error page
      return h.response('Failed to upload, no init data').code(404)
    }

    // Upload link has already been used
    if (init.uploadStatus || init.uploadStatus === UploadStatus.Initialised) {
      // TODO: how do we communicate this failure reason?
      request.logger.info(
        `upload id ${id} has already been used to upload a file.`
      )
      await request.redis.set(id, JSON.stringify(init)) // refresh the TTL ?
      return h.redirect(init.failureRedirect)
    }

    init.fields = {}

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
            await uploadStream(quarantineBucket, fileKey, file, {
              callback: init.scanResultCallback,
              destination: init.destinationBucket
            })
            init.fields[f] = {
              fileName: file.hapi?.filename,
              contentType: file.hapi?.headers['content-type'] ?? ''
            }
          } else {
            // save non-file fields
            init.fields[f] = files[f]
          }
        }
      }
      request.logger.info(
        `Uploaded to ${JSON.stringify(result.data?.Location)}`
      )

      // update the record in redis
      init.done = true
      init.quarentined = new Date()
      await request.redis.set(id, JSON.stringify(init))

      // TODO: check all the files sizes match the size set in init
      return h.redirect(init.successRedirect)
    } catch (e) {
      request.logger.error(e)
      return h.redirect(init.failureRedirect)
    }
  }
}

export { uploadController }
