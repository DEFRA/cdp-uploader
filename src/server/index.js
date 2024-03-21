import path from 'path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config'
import { router } from './router'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger'
import { catchAll } from '~/src/server/common/helpers/errors'
import { secureContext } from '~/src/server/common/helpers/secure-context'
import { buildRedisClient } from '~/src/server/common/helpers/redis-client'
import { SQSClient } from '@aws-sdk/client-sqs'
import { failAction } from '~/src/server/common/helpers/fail-action'

const isProduction = config.get('isProduction')

async function createServer() {
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  await server.register(requestLogger)

  if (isProduction) {
    await server.register(secureContext)
  }

  await server.register(router)

  const redisClient = buildRedisClient()
  server.decorate('request', 'redis', redisClient)
  server.decorate('server', 'redis', redisClient)
  server.ext('onPreResponse', catchAll)

  const sqsClient = new SQSClient({
    region: config.get('awsRegion'),
    endpoint: config.get('sqsEndpoint')
  })

  server.decorate('server', 'sqs', sqsClient)

  return server
}

export { createServer }
