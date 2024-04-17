import ecsFormat from '@elastic/ecs-pino-format'

import { config } from '~/src/config'
import {
  findUploadContext,
  swapUploadContext
} from '~/src/server/common/helpers/logging/upload-context'

const isDevelopment = config.get('isDevelopment')
const logFullContext = config.get('logFullContext')

const hooks = {
  logMethod(inputArgs, method, level) {
    const uploadContext = findUploadContext(inputArgs[0])
    if (notLogFullContext(level, inputArgs, uploadContext)) {
      inputArgs[0] = swapUploadContext(inputArgs[0], uploadContext)
    }
    return method.apply(this, inputArgs)
  }
}
const loggerOptions = {
  enabled: !config.get('isTest'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers',
      ...(isDevelopment
        ? ['req.headers', 'req.id', 'req.remoteAddress', 'req.remotePort']
        : [])
    ],
    remove: true
  },
  hooks,
  level: config.get('logLevel'),
  ...(isDevelopment ? { transport: { target: 'pino-pretty' } } : ecsFormat())
}

function notLogFullContext(level, inputArgs, context) {
  return (
    inputArgs.length > 1 &&
    context &&
    (!isDevelopment || !logFullContext || !isDebugOrLower(level))
  )
}

function isDebugOrLower(level) {
  return level <= 20
}

export { loggerOptions }
