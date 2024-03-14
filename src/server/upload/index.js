import { initiateController } from '~/src/server/initiate/controller'

const upload = {
  plugin: {
    name: 'upload',
    register: async (server) => {
      server.route([
        {
          method: 'POST',
          path: '/cdp/upload/{id}',
          ...initiateController
        }
      ])
    }
  }
}

export { upload }
