import { uploadController } from '~/src/server/upload/controller'

const upload = {
  plugin: {
    name: 'upload',
    register: async (server) => {
      server.route([
        {
          method: 'POST',
          path: '/cdp/upload/{id}',
          ...uploadController
        }
      ])
    }
  }
}

export { upload }
