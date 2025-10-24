import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { registerTempFileCleanup } from '~/src/server/common/helpers/temp-file-cleanup.js'

async function startServer() {
  try {
    const server = await createServer()
    await server.start()

    server.logger.info('Server started successfully')
    server.logger.info(
      `Access your frontend on http://localhost:${config.get('port')}`
    )
    registerTempFileCleanup(server)
    return server
  } catch (error) {
    const logger = createLogger()
    logger.info('Server failed to start :(')
    logger.error(error)
  }
}

export { startServer }
