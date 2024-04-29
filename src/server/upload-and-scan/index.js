import { uploadController } from '~/src/server/upload-and-scan/controller'

const uploadAndScan = {
  plugin: {
    name: 'upload-and-scan',
    register: async (server) => {
      server.route([
        {
          method: 'POST',
          path: '/upload-and-scan/{id}',
          ...uploadController
        }
      ])
    }
  }
}

export { uploadAndScan }
