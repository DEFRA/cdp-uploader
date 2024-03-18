import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload/helpers/upload-stream'
import {
  uploadPathValidation,
  uploadValidation
} from '~/src/server/upload/helpers/upload-validation'

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
      maxBytes: 209715200,
      uploads: 'uploads'
    }
  },
  handler: async (request, h) => {

    const id = request.params.id
    if (!id) {
      return h.response('Failed to upload. No id').code(404)
    }

    const init = JSON.parse(await request.redis.get(id))
    if (init === null) {
      // TODO: work out how we gracefully handle this from the user's point of view
      return h.response('Failed to upload, no init data').code(404)
    }

    try {
      // check redis token matches form token
      // this is assuming only a file is uploaded in form data
      const files = request.payload
      const result = {}
      for (const f in files) {
        if (files[f]) {
          const file = files[f]
          if (file.hapi?.filename) {
            throw new Error("invalid file!!")
            console.log(`Uploading ${JSON.stringify(file.hapi.filename)}`)
            const res = await uploadStream(
              quarantineBucket,
              `${id}/${file.hapi.filename}`,
              file
            )
            result[f] = res
          }
        }
      }

      console.log(`Uploaded to ${JSON.stringify(result.data?.Location)}`)
      // TODO: check all the files sizes match the size set in init
      return h.redirect(init.successRedirect)
    } catch (e) {
      return h.redirect(init.failureRedirect)
    }
  }
}

export { uploadController }
