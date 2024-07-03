import { config } from '~/src/config'
import { createServer } from '~/src/server'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

const logger = createLogger()

let server

process.on('unhandledRejection', (error) => {
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exit(1)
})

process.on('SIGINT', () => {
  stopServer(server)
})

process.on('SIGTERM', () => {
  stopServer(server)
})

startServer().catch((error) => {
  logger.info('Server failed to start :(')
  logger.error(error)
})

async function startServer() {
  server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )
}

function stopServer(server) {
  if (server) {
    server
      .stop({ timeout: 10000 })
      .then(() => {
        server.logger.info('Stopped hapi server')
        process.exit(0)
      })
      .catch((error) => {
        server.logger.error(
          error,
          'Error encountered when stopping hapi server'
        )
        process.exit(1)
      })
  } else {
    process.exit(0)
  }
}
