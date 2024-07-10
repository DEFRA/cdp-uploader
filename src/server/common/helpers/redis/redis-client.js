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
function buildRedisClient(redisConfig) {
  const logger = createLogger()
  const port = 6379
  const db = 0
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host

  const client = redisConfig.useSingleInstanceCache
    ? new IoRedis({ port, host, db, keyPrefix })
    : new IoRedis.Cluster([{ host, port }], {
        keyPrefix,
        slotsRefreshTimeout: 2000,
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          username: redisConfig.username,
          password: redisConfig.password,
          db,
          tls: {}
        }
      })

  client.on('connect', () => {
    logger.info('Connected to Redis server')
  })

  client.on('error', (error) => {
    logger.error(`Redis connection error ${error}`)
  })

  return client
}

export { buildRedisClient }
