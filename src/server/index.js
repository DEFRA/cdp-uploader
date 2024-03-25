import path from 'path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config'
import { router } from '~/src/server/router'
import { catchAll } from '~/src/server/common/helpers/errors'
import { failAction } from '~/src/server/common/helpers/fail-action'
import { buildS3client } from '~/src/server/common/helpers/s3-client'
import { RedisHelper } from '~/src/server/common/helpers/redis-helper'
import { buildSqsClient } from '~/src/server/common/helpers/sqs-client'
import { secureContext } from '~/src/server/common/helpers/secure-context'
import { buildRedisClient } from '~/src/server/common/helpers/redis-client'
import { buildScanResultListener } from '~/src/server/scan/build-sqs-listener'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger'

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

  const redisHelper = new RedisHelper(buildRedisClient())
  const s3Client = buildS3client()

  server.decorate('request', 'redis', redisHelper)
  server.decorate('server', 'redis', redisHelper)

  server.decorate('request', 's3', s3Client)
  server.decorate('server', 's3', s3Client)

  server.decorate('server', 'sqs', buildSqsClient())
  server.decorate('server', 'sqsListener', buildScanResultListener(server))

  if (isProduction) {
    await server.register(secureContext)
  }

  await server.register(router)

  server.ext('onPreResponse', catchAll)

  return server
}

export { createServer }
