import IoRedis from 'ioredis'

import { config } from '~/src/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

/**
 * Setup Redis and provide a redis client
 *
 * Local development - 1 Redis instance
 * Out in the wild - Elasticache / Redis Cluster with username and password
 *
 * @returns {Cluster | Redis}
 */
function buildRedisClient() {
  const logger = createLogger()
  const port = 6379
  const db = 0
  let redisClient

  if (config.get('useSingleInstanceCache')) {
    redisClient = new IoRedis({
      port,
      host: config.get('redisHost'),
      db,
      keyPrefix: config.get('redisKeyPrefix')
    })
  } else {
    redisClient = new IoRedis.Cluster(
      [
        {
          host: config.get('redisHost'),
          port
        }
      ],
      {
        keyPrefix: config.get('redisKeyPrefix'),
        slotsRefreshTimeout: 2000,
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          username: config.get('redisUsername'),
          password: config.get('redisPassword'),
          db,
          tls: {}
        }
      }
    )
  }

  redisClient.on('connect', () => {
    logger.info('Connected to Redis server')
  })

  redisClient.on('close', () => {
    logger.info('Redis connection closed attempting reconnect')
    redisClient.connect()
  })

  redisClient.on('error', (error) => {
    logger.error(`Redis connection error ${error}`)
  })

  return redisClient
}

export { buildRedisClient }
