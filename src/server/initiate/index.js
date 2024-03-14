import { initiateController } from '~/src/server/initiate/controller'

const initiate = {
  plugin: {
    name: 'initiate',
    register: async (server) => {
      server.route([
        {
          method: 'POST',
          path: '/initiate',
          ...initiateController
        }
      ])
    }
  }
}

export { initiate }
