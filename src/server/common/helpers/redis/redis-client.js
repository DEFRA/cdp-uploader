import IoRedis from 'ioredis'

import { createLogger } from '~/src/server/common/helpers/logging/logger'

/**
 * Setup Redis and provide a redis client
 *
 * Local development - 1 Redis instance
 * Out in the wild - Elasticache / Redis Cluster with username and password
 *
 * @returns {Cluster | Redis}
 */
function buildRedisClient(config) {
  const logger = createLogger()
  const port = 6379
  const db = 0
  const keyPrefix = config.keyPrefix
  const host = config.host
  let redisClient

  if (config.useSingleInstanceCache) {
    redisClient = new IoRedis({
      port,
      host,
      db,
      keyPrefix
    })
  } else {
    redisClient = new IoRedis.Cluster(
      [
        {
          host,
          port
        }
      ],
      {
        keyPrefix,
        slotsRefreshTimeout: 2000,
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          username: config.username,
          password: config.password,
          db,
          tls: {}
        }
      }
    )
  }

  redisClient.autoreconnect = true

  redisClient.on('connect', () => {
    logger.info('Connected to Redis server')
  })

  redisClient.on('close', () => {
    if (redisClient.autoreconnect === true) {
      logger.info('Redis connection closed attempting reconnect')
      redisClient.connect()
    }
  })

  redisClient.on('error', (error) => {
    logger.error(`Redis connection error ${error}`)
  })

  return redisClient
}

export { buildRedisClient }
