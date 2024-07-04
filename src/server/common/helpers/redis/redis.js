import { RedisService } from '~/src/server/common/helpers/redis/redis-service'
import { buildRedisClient } from '~/src/server/common/helpers/redis/redis-client'
import { config } from '~/src/config'

const redis = {
  plugin: {
    name: 'redisService',
    version: '0.1.0',
    register: async (server, options) => {
      const redisService = new RedisService(
        buildRedisClient(options.config),
        options.config.ttl
      )
      server.decorate('request', 'redis', redisService)
      server.decorate('server', 'redis', redisService)

      server.events.on('stop', () => {
        server.logger.info(`Closing Redis client`)
        redisService.disconnect()
      })
    }
  },
  options: {
    config: config.get('redis')
  }
}

export { redis }
