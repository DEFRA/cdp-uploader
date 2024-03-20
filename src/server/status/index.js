import { statusController } from '~/src/server/status/controller'

const status = {
  plugin: {
    name: 'status',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/status/{id}',
          ...statusController
        }
      ])
    }
  }
}

export { status }
