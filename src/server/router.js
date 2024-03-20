import inert from '@hapi/inert'

import { health } from '~/src/server/health'
import { initiate } from '~/src/server/initiate'
import { upload } from '~/src/server/upload'
import { status } from '~/src/server/status'

const router = {
  plugin: {
    name: 'router',
    register: async (server) => {
      await server.register([inert])
      await server.register([health, initiate, status, upload])
    }
  }
}

export { router }
