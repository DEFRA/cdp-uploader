import fetch from 'node-fetch'
import Boom from '@hapi/boom'

import { createLogger } from '~/src/server/common/helpers/logging/logger'
import { throwHttpError } from '~/src/server/common/helpers/throw-http-error'

/**
 *
 * @param url
 * @param options
 * @returns {Promise<{response: ({ok}|*), json: *}>}
 */
async function fetcher(url, options = {}) {
  const logger = createLogger()
  const response = await fetch(url, {
    ...options,
    method: options?.method || 'get',
    headers: {
      ...(options?.headers && options?.headers),
      'Content-Type': 'application/json'
    }
  })

  try {
    const json = await response.json()

    // status 200-299
    if (response.ok) {
      return { json, response }
    }

    throwHttpError(json, response)
  } catch (error) {
    logger.error(error)

    throw Boom.boomify(new Error(error.message), {
      statusCode: error?.output?.statusCode ?? 500
    })
  }
}

export { fetcher }
