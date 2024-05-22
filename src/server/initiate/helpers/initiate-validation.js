import Joi from 'joi'
import { config } from '~/src/config'

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
        validate(value, helpers, args, options) {
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

const redirectValidation = Joi.string()
  .uri({ allowRelative: true, ...(isProduction && { relativeOnly: true }) })
  .required()

const callbackValidation = isProduction
  ? custom.url().cdpDomain()
  : Joi.string().uri().optional()

const initiateValidation = custom.object({
  redirect: redirectValidation,
  callback: callbackValidation,
  s3Bucket: Joi.string()
    .required()
    .valid(...bucketsAllowlist)
    .messages({
      'any.only':
        'No permission to write to bucket - Please contact CDP Portal Team'
    }),
  s3Path: Joi.string().optional(),
  mimeTypes: Joi.array().items(Joi.string()).optional(),
  maxFileSize: Joi.number().integer().positive().optional(),
  metadata: Joi.object().unknown(true).default({})
})

export { initiateValidation }
