import Boom from '@hapi/boom'

function throwHttpError(json, response) {
  const message = json?.message ?? response.statusText

  throw Boom.boomify(new Error(message), {
    statusCode: response?.status ?? 500
  })
}

export { throwHttpError }
