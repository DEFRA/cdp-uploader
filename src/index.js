import { createLogger } from '~/src/server/common/helpers/logging/logger'
import process from 'node:process'
import { startServer } from '~/src/server/common/helpers/start-server'
import { stopServer } from '~/src/server/common/helpers/stop-server'

const logger = createLogger()
const serverPromise = startServer()

process.on('unhandledRejection', (error) => {
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
process.on('SIGINT', () => serverPromise.then(stopServer))
process.on('SIGTERM', () => serverPromise.then(stopServer))
