/**
 * @satisfies {Partial<ServerRoute>}
 */
const healthController = {
  handler(request, h) {
    return h.response({ message: 'success' }).code(200)
  }
}

export { healthController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
