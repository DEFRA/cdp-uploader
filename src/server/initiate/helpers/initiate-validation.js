import Joi from 'joi'

import { config } from '~/src/config/index.js'

const isProduction = config.get('isProduction')
const bucketsAllowlist = config.get('bucketsAllowlist')

const custom = Joi.extend((joi) => {
  return {
    type: 'url',
    base: joi.string().uri(),
    messages: {
      'url.cdpDomain': '{{#label}} must be on the cdp-int.defra.cloud domain'
    },
    rules: {
      cdpDomain: {
        validate(value, helpers) {
          const url = new URL(value)
          if (url.hostname.endsWith('cdp-int.defra.cloud')) {
            return value
          }
          return helpers.error('url.cdpDomain')
        }
      }
    }
  }
})

const redirectValidation = Joi.string().uri({
  allowRelative: true,
  ...(isProduction && { relativeOnly: true })
})

const callbackValidation = isProduction
  ? custom.url().cdpDomain()
  : Joi.string().uri().optional()

const schemes = isProduction ? ['https'] : ['http', 'https']

const downloadUrlValidation = Joi.array()
  .items(Joi.string().uri({ scheme: schemes }))
  .optional()

const initiateValidation = custom
  .object({
    redirect: redirectValidation
      .description(
        'URL to redirect to after file has been successfully uploaded. Cannot be used together with downloadUrls.'
      )
      .example('/health'),

    downloadUrls: downloadUrlValidation
      .description(
        'List of URLs pointing to files that should be downloaded and scanned. Cannot be used together with redirect.'
      )
      .example(['https://myservice.com/file']),

    s3Bucket: Joi.string()
      .required()
      .description(
        'S3 bucket the file will be moved to once the scanning is complete'
      )
      .example('example-test-bucket')
      .valid(...bucketsAllowlist)
      .messages({
        'any.only':
          'No permission to write to bucket - Please contact CDP Portal Team'
      }),

    s3Path: Joi.string()
      .optional()
      .description("'Folder' in bucket where scanned files will be placed")
      .example('scanned'),

    callback: callbackValidation
      .description(
        'Url that will be called once all files in upload have been scanned.'
      )
      .example('https://myservice.com/callback'),

    metadata: Joi.object()
      .unknown(true)
      .default({})
      .description(
        'Arbitrary key-value metadata to associate with this upload session. This metadata will be returned in subsequent Status responses.'
      )
      .example({
        test: '1234'
      }),

    mimeTypes: Joi.array()
      .items(Joi.string())
      .optional()
      .description('List of accepted mimeTypes')
      .example(['application/pdf']),

    maxFileSize: Joi.number()
      .integer()
      .positive()
      .optional()
      .description(
        'Maximum size in bytes that a file can be (10MB is 10 * 1000 * 1000)'
      )
      .example(10000000)
  })
  .label('InitiateUploadRequest')
  .xor('redirect', 'downloadUrls')

export { initiateValidation }
