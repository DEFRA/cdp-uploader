import Redis from 'ioredis'
import { RedisHashHelpers } from '~/src/server/common/helpers/redis-helper'
import crypto from 'crypto'

describe('#redis-hash-helpers', () => {
  const redis = new Redis()
  const helper = new RedisHashHelpers(redis)

  const testID = crypto.randomUUID()

  test('push', async () => {
    const payload = {
      foo: ['a', 'b']
    }

    await helper.insert(testID, payload)

    await helper.push(testID, 'foo', 'c')

    const res = await helper.find(testID)

    expect(res).toEqual({ foo: ['a', 'b', 'c'] })
  })

  afterEach(async () => {
    await redis.del(testID)
  })

  afterAll(() => {
    redis.disconnect()
  })
})
