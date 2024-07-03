import inert from '@hapi/inert'

import { health } from '~/src/server/health'
import { status } from '~/src/server/status'
import { initiate } from '~/src/server/initiate'
import { uploadAndScan } from '~/src/server/upload-and-scan'

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
