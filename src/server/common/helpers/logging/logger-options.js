import ecsFormat from '@elastic/ecs-pino-format'

import { config } from '~/src/config'

const hooks = {
  logMethod(inputArgs, method, level) {
    if (
      inputArgs.length === 2 &&
      typeof inputArgs[0] === 'object' &&
      inputArgs[0].uploadId
    ) {
      const arg1 = inputArgs.shift()

      const loggingContext = {
        uploadId: arg1.uploadId,
        uploadStatus: arg1.uploadStatus,
        fileIds: arg1.fileIds
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
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
    remove: true
  },
  hooks,
  level: config.get('logLevel'),
  ...(config.get('isDevelopment')
    ? { transport: { target: 'pino-pretty' } }
    : ecsFormat())
}

export { loggerOptions }
