import path from 'node:path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config/index.js'
import { router } from '~/src/server/router.js'
import { catchAll } from '~/src/server/common/helpers/errors.js'
import { failAction } from '~/src/server/common/helpers/fail-action.js'
import {
  mockClamavListener,
  scanResultCallbackListener,
  scanResultListener
} from '~/src/server/common/helpers/sqs/sqs-listener.js'
import { secureContext } from '~/src/server/common/helpers/secure-context/index.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { redis } from '~/src/server/common/helpers/redis/redis.js'
import { s3Client } from '~/src/server/common/helpers/s3/s3-client.js'
import { sqsClient } from '~/src/server/common/helpers/sqs/sqs-client.js'
import { pulse } from '~/src/server/common/helpers/pulse.js'

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

  await server.register([requestLogger])

  if (isProduction) {
    await server.register(secureContext)
  }

  await server.register([
    pulse,
    redis,
    s3Client,
    sqsClient,
    router,
    scanResultListener,
    scanResultCallbackListener
  ])

  // Local development & testing only
  if (!isProduction && config.get('mockVirusScanEnabled')) {
    await server.register(mockClamavListener)
  }

  server.ext('onPreResponse', catchAll)

  return server
}

export { createServer }
