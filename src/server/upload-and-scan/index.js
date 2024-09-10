import { uploadController } from '~/src/server/upload-and-scan/controller.js'

const uploadAndScan = {
  plugin: {
    name: 'upload-and-scan',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/upload-and-scan/{uploadId}',
          ...uploadController
        }
      ])
    }
  }
}

export { uploadAndScan }
