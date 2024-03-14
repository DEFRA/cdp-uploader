const uploadController = {
  options: {
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
      return h.response('Failed to upload').code(404)
    }

    const init = JSON.parse(await request.redis.get(id))
    if (init === null) {
      // TODO: work out how we gracefully handle this from the user's point of view
      return h.response('Failed to upload, no init data').code(404)
    }

    const files = request.payload
    const result = {}
    for (const f in files) {
      if (files[f]) {
        const file = files[f]
        let fileSize = 0
        file.on('data', (chunk) => {
          fileSize += chunk.length
          // TODO: actually upload it to s3
        })

        await new Promise((resolve) => {
          file.on('end', () => {
            result[f] = fileSize
            resolve()
          })
        })
      }
    }

    // TODO: check all the files sizes match the size set in init
    return h.redirect(init.uploadRedirect)
  }
}

export { uploadController }
