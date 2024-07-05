import { config } from '~/src/config'

import { createServer } from '~/src/server'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

async function startServer() {
  try {
    const server = await createServer()
    await server.start()

    server.logger.info('Server started successfully')
    server.logger.info(
      `Access your backend on http://localhost:${config.get('port')}`
    )
    return server
  } catch (error) {
    const logger = createLogger()
    logger.info('Server failed to start :(')
    logger.error(error)
  }
}

export { startServer }
