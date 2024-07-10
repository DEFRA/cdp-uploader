import process from 'node:process'

import { createLogger } from '~/src/server/common/helpers/logging/logger'
import { startServer } from '~/src/server/common/helpers/start-server'

startServer()

process.on('unhandledRejection', (error) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
