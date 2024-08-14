import { ecsFormat } from '@elastic/ecs-pino-format'

import { config } from '~/src/config/index.js'
import { redactedUploadContext } from '~/src/server/common/helpers/logging/upload-redaction.js'

const isDevelopment = config.get('isDevelopment')
const redactionPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers'
]
if (!isDevelopment) {
  redactionPaths.push(...redactedUploadContext)
}

if (isDevelopment) {
  redactionPaths.push(...['req', 'res', 'responseTime'])
}

const loggerOptions = {
  enabled: !config.get('isTest'),
  ignorePaths: ['/health', '/favicon.ico'],
  redact: {
    paths: redactionPaths,
    remove: true
  },
  level: config.get('logLevel'),
  ...(isDevelopment ? { transport: { target: 'pino-pretty' } } : ecsFormat())
}

export { loggerOptions }
