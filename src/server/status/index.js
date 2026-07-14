import { statusController } from '~/src/server/status/controller.js'

const status = {
  plugin: {
    name: 'status',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/status/{uploadId}',
          ...statusController
        }
      ])
    }
  }
}

export { status }
