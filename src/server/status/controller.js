import Boom from '@hapi/boom'

const statusController = {
  handler: async (request, h) => {
    const id = request.params.id
    if (!id) {
      return h.response(Boom.notFound())
    }

    const result = await request.redis.findUploadWithFiles(id)

    if (result) {
      return h.response(result).code(200)
    }

    return h.response(Boom.notFound())
  }
}

export { statusController }
