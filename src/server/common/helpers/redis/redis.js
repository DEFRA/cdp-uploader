import { RedisService } from '~/src/server/common/helpers/redis/redis-service.js'
import { buildRedisClient } from '~/src/server/common/helpers/redis/redis-client.js'
import { config } from '~/src/config/index.js'

const redis = {
  plugin: {
    name: 'redisService',
    version: '0.1.0',
    register(server, options) {
      const client = buildRedisClient(options.config)
      const redisService = new RedisService(client, options.config.ttl)

      server.decorate('request', 'redis', redisService)
      server.decorate('server', 'redis', redisService)

      server.events.on('stop', () => {
        server.logger.info(`Closing Redis client`)
        client.disconnect()
      })
    }
  },
  options: {
    config: config.get('redis')
  }
}

export { redis }
