import inert from '@hapi/inert'

import { health } from '~/src/server/health.js'
import { status } from '~/src/server/status.js'
import { initiate } from '~/src/server/initiate.js'
import { uploadAndScan } from '~/src/server/upload-and-scan.js'

const router = {
  plugin: {
    name: 'router',
    register: async (server) => {
      await server.register([inert])
      await server.register([health, initiate, status, uploadAndScan])
    }
  }
}

export { router }
