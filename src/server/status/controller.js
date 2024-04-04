import Boom from '@hapi/boom'

const statusController = {
  handler: async (request, h) => {
    const id = request.params.id
    if (!id) {
      return Boom.notFound()
    }

    const result = await request.redis.findUploadWithFiles(id)

    if (!result) {
      return Boom.notFound()
    }

    return h.response(result).code(200)
  }
}

export { statusController }
