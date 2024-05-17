import Joi from 'joi'
import { config } from '~/src/config'

const isProduction = !config.get('isProduction')

const initiateValidation = Joi.object({
  redirect: Joi.string()
    .uri({ allowRelative: true, ...(isProduction && { relativeOnly: true }) })
    .required(),
  callback: Joi.string().uri().optional(),
  s3Bucket: Joi.string().required(),
  s3Path: Joi.string().optional(),
  mimeTypes: Joi.array().items(Joi.string()).optional(),
  maxFileSize: Joi.number().integer().positive().optional(),
  metadata: Joi.object().unknown(true).default({})
})

export { initiateValidation }
