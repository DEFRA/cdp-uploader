import { healthController } from '~/src/server/health/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const health = {
  plugin: {
    name: 'health',
    register(server) {
      server.route({
        method: 'GET',
        path: '/health',
        ...healthController
      })
    }
  }
}

export { health }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
