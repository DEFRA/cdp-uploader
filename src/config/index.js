import convict from 'convict'
import path from 'node:path'

const oneWeekMillis = 7 * 24 * 60 * 60 * 1000

convict.addFormat({
  name: 'bucket-array',
  validate: function (values) {
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction && values.length === 0) {
      throw new Error('CONSUMER_BUCKETS environment variable must be set')
    }
  },
  coerce: function (value) {
    return value.split(',')
  }
})

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
    default: oneWeekMillis,
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
    default: 'http://localhost:4566',
    env: 'LOCALSTACK_ENDPOINT'
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
    default: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
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
    default: oneWeekMillis,
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
    queueUrl: {
      doc: 'Queue for virus scan results',
      format: String,
      default: 'cdp-clamav-results',
      env: 'SQS_SCAN_RESULTS'
    },
    visibilityTimeout: {
      doc: 'The timeout (in seconds) that the received messages are hidden from subsequent retrieve requests',
      format: Number,
      default: 5,
      env: 'SQS_SCAN_RESULTS_VISIBILITY_TIMEOUT'
    },
    waitTimeSeconds: {
      doc: 'The duration for which the call will wait for a message to arrive in the queue before returning',
      format: Number,
      default: 20,
      env: 'SQS_SCAN_RESULTS_WAIT_TIME_SECONDS'
    },
    pollingWaitTimeMs: {
      doc: 'The duration to wait before repolling the queue',
      format: Number,
      default: 0,
      env: 'SQS_SCAN_RESULTS_POLLING_WAIT_TIME_MS'
    }
  },
  sqsScanResultsCallback: {
    queueUrl: {
      doc: 'Queue for upload ready results',
      format: String,
      default: 'cdp-uploader-scan-results-callback.fifo',
      env: 'SQS_SCAN_RESULTS_CALLBACK'
    },
    visibilityTimeout: {
      doc: 'The timeout (in seconds) that the received messages are hidden from subsequent retrieve requests',
      format: Number,
      default: 60,
      env: 'SQS_SCAN_RESULTS_CALLBACK_VISIBILITY_TIMEOUT'
    },
    waitTimeSeconds: {
      doc: 'The duration for which the call will wait for a message to arrive in the queue before returning',
      format: Number,
      default: 20,
      env: 'SQS_SCAN_RESULTS_CALLBACK_WAIT_TIME_SECONDS'
    },
    pollingWaitTimeMs: {
      doc: 'The duration to wait before repolling the queue',
      format: Number,
      default: 0,
      env: 'SQS_SCAN_RESULTS_CALLBACK_POLLING_WAIT_TIME_MS'
    }
  },
  mockVirusRegex: {
    doc: 'Filename pattern used by test harness to simulate viruses',
    format: String,
    default: '.*virus.*',
    env: 'MOCK_VIRUS_REGEX'
  },
  mockVirusResultDelay: {
    doc: 'how many seconds to wait before mocking the scan result',
    format: Number,
    default: 1,
    env: 'MOCK_VIRUS_RESULT_DELAY'
  },
  mockVirusScanEnabled: {
    doc: 'Simulate scan results locally',
    format: Boolean,
    default: process.env.NODE_ENV !== 'production',
    env: 'MOCK_VIRUS_SCAN_ENABLED'
  },
  maxFileSize: {
    doc: 'Max file size uploader will accept in bytes. Must be equal to or less than the nginx max',
    format: Number,
    default: 200 * 1024 * 1024,
    env: 'MAX_FILE_SIZE'
  },
  bucketsAllowlist: {
    doc: 'Allowlist buckets that can be used in environments',
    format: 'bucket-array',
    default: [],
    env: 'CONSUMER_BUCKETS'
  }
})

config.validate({ allowed: 'strict' })

export { config }
