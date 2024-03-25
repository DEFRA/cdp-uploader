const statusController = {
  handler: async (request, h) => {
    const id = request.params.id
    if (!id) {
      return h.response({ message: 'Not Found' }).code(404)
    }

    const result = await request.redis.client.get(id)

    if (result) {
      return h.response(JSON.parse(result)).code(200)
    }

    return h.response({ message: 'Not Found' }).code(404)
  }
}

export { statusController }
