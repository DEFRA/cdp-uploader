import convict from 'convict'
import { cwd } from 'node:process'

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

export const config = convict({
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
    default: cwd()
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  awsRegion: {
    doc: 'AWS region',
    format: String,
    default: 'eu-west-2',
    env: 'AWS_REGION'
  },
  sqsEndpoint: {
    doc: 'AWS SQS endpoint',
    format: String,
    default: 'http://127.0.0.1:4566',
    env: 'SQS_ENDPOINT'
  },
  s3Endpoint: {
    doc: 'AWS S3 endpoint',
    format: String,
    default: 'http://127.0.0.1:4566',
    env: 'S3_ENDPOINT'
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
  httpProxy: /** @type {SchemaObj<string | null>} */ ({
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  }),
  httpsProxy: /** @type {SchemaObj<string | null>} */ ({
    doc: 'HTTPS Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  }),
  redis: /** @type {Schema<RedisConfig>} */ ({
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'cdp-uploader:',
      env: 'REDIS_KEY_PREFIX'
    },
    ttl: {
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
    }
  }),
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
    waitTimeSeconds: {
      doc: 'The duration for which the call will wait for a message to arrive in the queue before returning',
      format: Number,
      default: 20,
      env: 'SQS_SCAN_RESULTS_WAIT_TIME_SECONDS'
    },
    pollingWaitTimeMs: {
      doc: 'The duration to wait before re-polling the queue',
      format: Number,
      default: 0,
      env: 'SQS_SCAN_RESULTS_POLLING_WAIT_TIME_MS'
    },
    batchSize: {
      doc: 'The number of messages to request from SQS when polling (max 10)',
      format: Number,
      default: 10,
      env: 'SQS_SCAN_RESULTS_BATCH_SIZE'
    }
  },
  sqsScanResultsCallback: {
    queueUrl: {
      doc: 'Queue for upload ready results',
      format: String,
      default: 'cdp-uploader-scan-results-callback.fifo',
      env: 'SQS_SCAN_RESULTS_CALLBACK'
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
    },
    batchSize: {
      doc: 'The number of messages to request from SQS when polling (max 10)',
      format: Number,
      default: 10,
      env: 'SQS_SCAN_RESULTS_CALLBACK_BATCH_SIZE'
    }
  },
  sqsDownloadRequests: {
    queueUrl: {
      doc: 'Queue for upload ready results',
      format: String,
      default: 'cdp-uploader-download-requests',
      env: 'SQS_DOWNLOAD_REQUESTS'
    },
    waitTimeSeconds: {
      doc: 'The duration for which the call will wait for a message to arrive in the queue before returning',
      format: Number,
      default: 20,
      env: 'SQS_DOWNLOAD_REQUESTS_WAIT_TIME_SECONDS'
    },
    pollingWaitTimeMs: {
      doc: 'The duration to wait before repolling the queue',
      format: Number,
      default: 0,
      env: 'SQS_DOWNLOAD_REQUESTS_POLLING_WAIT_TIME_MS'
    },
    batchSize: {
      doc: 'The number of messages to request from SQS when polling (max 10)',
      format: Number,
      default: 10,
      env: 'SQS_DOWNLOAD_REQUESTS_BATCH_SIZE'
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
  maxMultipartUploadSize: {
    doc: 'Max multipart upload size',
    format: Number,
    default: 1000 * 1000 * 1000,
    env: 'MAX_MULTIPART_UPLOAD_SIZE'
  },
  maxFileSize: {
    doc: 'Max file size uploader will accept in bytes',
    format: Number,
    default: 100 * 1000 * 1000,
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

/**
 * @import { Schema, SchemaObj} from 'convict'
 * @import { RedisConfig } from '~/src/server/common/helpers/redis/redis-client.js'
 */
