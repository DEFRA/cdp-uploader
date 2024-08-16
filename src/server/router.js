import inert from '@hapi/inert'

import { health } from '~/src/server/health/index.js'
import { status } from '~/src/server/status/index.js'
import { initiate } from '~/src/server/initiate/index.js'
import { uploadAndScan } from '~/src/server/upload-and-scan/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])
      await server.register([health, initiate, status, uploadAndScan])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
