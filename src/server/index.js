import path from 'node:path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config'
import { router } from '~/src/server/router'
import { catchAll } from '~/src/server/common/helpers/errors'
import { failAction } from '~/src/server/common/helpers/fail-action'
import {
  mockClamavListener,
  scanResultCallbackListener,
  scanResultListener
} from '~/src/server/common/helpers/sqs/sqs-listener'
import { secureContext } from '~/src/server/common/helpers/secure-context'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger'
import { redis } from '~/src/server/common/helpers/redis/redis'
import { s3Client } from '~/src/server/common/helpers/s3/s3-client'
import { sqsClient } from '~/src/server/common/helpers/sqs/sqs-client'

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

  await server.register([
    requestLogger,
    redis,
    s3Client,
    sqsClient,
    router,
    scanResultListener,
    scanResultCallbackListener
  ])

  if (isProduction) {
    await server.register(secureContext)
  }

  // Local development & testing only
  if (!isProduction && config.get('mockVirusScanEnabled')) {
    await server.register(mockClamavListener)
  }

  server.ext('onPreResponse', catchAll)

  return server
}

export { createServer }
