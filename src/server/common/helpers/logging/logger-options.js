import ecsFormat from '@elastic/ecs-pino-format'

import { config } from '~/src/config'
import { redactedUploadContext } from '~/src/server/common/helpers/logging/logging-context-upload-redaction'

const isDevelopment = config.get('isDevelopment')
const redactionPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers'
]

redactionPaths.push(...redactedUploadContext)

if (isDevelopment) {
  redactionPaths.push('req')
}

const loggerOptions = {
  enabled: !config.get('isTest'),
  redact: {
    paths: redactionPaths,
    remove: true
  },
  level: config.get('logLevel'),
  ...(isDevelopment ? { transport: { target: 'pino-pretty' } } : ecsFormat())
}

export { loggerOptions }
