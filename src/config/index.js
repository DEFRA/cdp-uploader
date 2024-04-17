import convict from 'convict'
import path from 'node:path'

const oneDay = 1000 * 60 * 60 * 24
const oneWeek = 7 * 24 * 60 * 60 * 1000

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 7337,
    env: 'PORT'
  },
  appBaseUrl: {
    doc: 'Application base URL',
    format: String,
    default: 'http://localhost:7337',
    env: 'APP_BASE_URL'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeek,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'cdp-uploader'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.normalize(path.join(__dirname, '..', '..'))
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  localstackEndpoint: {
    doc: 'Localstack endpoint',
    format: String,
    default: 'http://localhost:4566'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'production'
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: process.env.NODE_ENV !== 'production'
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'test'
  },
  logLevel: {
    doc: 'Logging level',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
    env: 'LOG_LEVEL'
  },
  awsRegion: {
    doc: 'AWS region',
    format: String,
    default: 'eu-west-2',
    env: 'AWS_REGION'
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTP_PROXY'
  },
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTPS_PROXY'
  },
  redisHost: {
    doc: 'Redis cache host',
    format: String,
    default: '127.0.0.1',
    env: 'REDIS_HOST'
  },
  redisUsername: {
    doc: 'Redis cache username',
    format: '*',
    default: '',
    sensitive: true,
    env: 'REDIS_USERNAME'
  },
  redisPassword: {
    doc: 'Redis cache password',
    format: '*',
    default: '',
    sensitive: true,
    env: 'REDIS_PASSWORD'
  },
  redisKeyPrefix: {
    doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
    format: String,
    default: 'cdp-uploader',
    env: 'REDIS_KEY_PREFIX'
  },
  redisTtl: {
    doc: 'Redis cache global ttl',
    format: Number,
    default: oneDay,
    env: 'REDIS_TTL'
  },
  useSingleInstanceCache: {
    doc: 'Enable the use of a single instance Redis Cache',
    format: Boolean,
    default: process.env.NODE_ENV !== 'production',
    env: 'USE_SINGLE_INSTANCE_CACHE'
  },
  quarantineBucket: {
    doc: 'S3 bucket for storing unscanned files',
    format: String,
    default: 'cdp-uploader-quarantine',
    env: 'S3_CDP_QUARANTINE_BUCKET'
  },
  sqsScanResults: {
    doc: 'Queue for virus scan results',
    format: String,
    default: 'cdp-clamav-results',
    env: 'SQS_SCAN_RESULTS'
  },
  sqsScanResultsVisibilityTimeout: {
    doc: 'Queue visibility timeout for virus scan results',
    format: Number,
    default: 400,
    env: 'SQS_SCAN_RESULTS_VISIBILITY_TIMEOUT'
  },
  sqsScanResultsCallback: {
    doc: 'Queue for upload ready results',
    format: String,
    default: 'cdp-uploader-scan-results-callback.fifo',
    env: 'SQS_SCAN_RESULTS_CALLBACK'
  },
  sqsScanResultsCallbackVisibilityTimeout: {
    doc: 'Queue visibility timeout for virus scan results callback',
    format: Number,
    default: 400,
    env: 'SQS_SCAN_RESULTS_CALLBACK_VISIBILITY_TIMEOUT'
  },
  maxFileSize: {
    doc: 'Maximum file size in bytes',
    format: Number,
    default: 200 * 1024 * 1024,
    env: 'MAX_FILE_SIZE'
  },
  logFullContext: {
    doc: 'Log full context in development mode',
    format: Boolean,
    default: true,
    env: 'LOG_FULL_CONTEXT'
  }
})

config.validate({ allowed: 'strict' })

export { config }
