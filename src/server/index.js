import path from 'node:path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config'
import { router } from '~/src/server/router'
import { catchAll } from '~/src/server/common/helpers/errors'
import { failAction } from '~/src/server/common/helpers/fail-action'
import { buildS3client } from '~/src/server/common/helpers/s3/s3-client'
import { RedisHelper } from '~/src/server/common/helpers/redis-helper'

import { sqsListener } from '~/src/server/common/helpers/sqs/build-sqs-listener'
import { buildSqsClient } from '~/src/server/common/helpers/sqs/sqs-client'

import { secureContext } from '~/src/server/common/helpers/secure-context'
import { buildRedisClient } from '~/src/server/common/helpers/redis-client'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger'
import { handleScanResult } from '~/src/server/scan/listener/handle-scan-result'
import { handleScanResultsCallback } from '~/src/server/callback/listener/handle-scan-results-callback'
import { handleMockVirusScanner } from '~/src/server/test-harness/mock-virus-scanner'

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

  server.app.shutdownHooks = []

  await server.register(requestLogger)

  const redisHelper = new RedisHelper(
    buildRedisClient(),
    config.get('redisTtl')
  )
  server.decorate('request', 'redis', redisHelper)
  server.decorate('server', 'redis', redisHelper)

  server.app.shutdownHooks.push(() => {
    redisHelper.disconnect()
  })

  const s3Client = buildS3client()
  server.decorate('request', 's3', s3Client)
  server.decorate('server', 's3', s3Client)

  server.decorate('server', 'sqs', buildSqsClient())

  if (isProduction) {
    await server.register(secureContext)
  }

  await server.register([router])

  await server.register({
    plugin: sqsListener,
    options: {
      config: config.get('sqsScanResults'),
      messageHandler: async (message, queueUrl, server) =>
        await handleScanResult(message, queueUrl, server)
    }
  })

  await server.register({
    plugin: sqsListener,
    options: {
      config: config.get('sqsScanResultsCallback'),
      messageHandler: async (message, queueUrl, server) =>
        await handleScanResultsCallback(message, queueUrl, server)
    }
  })

  // Local development & testing only
  if (!isProduction && config.get('mockVirusScanEnabled')) {
    await server.register({
      plugin: sqsListener,
      options: {
        config: {
          queueUrl: 'mock-clamav',
          visibilityTimeout: 5,
          waitTimeSeconds: 20,
          pollingWaitTimeMs: 10,
          batchSize: 1
        },
        messageHandler: async (message, queueUrl, server) =>
          await handleMockVirusScanner(message, queueUrl, server)
      }
    })
  }

  server.ext('onPreResponse', catchAll)

  server.events.on('stop', () => {
    for (const hook of server.app.shutdownHooks) {
      hook()
    }
  })

  return server
}

export { createServer }
