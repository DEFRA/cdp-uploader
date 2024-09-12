import { createServer } from '~/src/server/index.js'

describe('#healthController', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    server.events.emit('closing', { abort: true })
    server.events.emit('stop')

    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(result).toEqual({ message: 'success' })
    expect(statusCode).toBe(200)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
