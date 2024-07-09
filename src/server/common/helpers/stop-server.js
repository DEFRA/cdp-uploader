import process from 'node:process'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

async function stopServer(server) {
  const logger = createLogger()

  if (server) {
    try {
      await server.stop({ timeout: 10000 })
      logger.info('Stopped hapi server')
      process.exitCode = 0
    } catch (error) {
      logger.error(error, 'Error encountered when stopping hapi server')
      process.exitCode = 1
    }
  } else {
    logger.error('Hapi server not running - exiting')
    process.exitCode = 1
  }
}

export { stopServer }
