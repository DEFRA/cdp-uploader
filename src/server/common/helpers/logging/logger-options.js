import ecsFormat from '@elastic/ecs-pino-format'

import { config } from '~/src/config'

const isDevelopment = config.get('isDevelopment')

const hooks = {
  logMethod(inputArgs, method, level) {
    if (
      inputArgs.length === 2 &&
      typeof inputArgs[0] === 'object' &&
      level !== 'debug' &&
      inputArgs[0].uploadId
    ) {
      const arg1 = inputArgs.shift()

      const loggingContext = {
        uploadDetails: {
          uploadId: arg1.uploadId,
          initiated: arg1.initiated,
          uploadStatus: arg1.uploadStatus,
          fileIds: arg1.fileIds
        }
      }
      return method.apply(this, [loggingContext, ...inputArgs])
    } else {
      return method.apply(this, inputArgs)
    }
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

export { loggerOptions }
