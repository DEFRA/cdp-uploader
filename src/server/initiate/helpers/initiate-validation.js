import Joi from 'joi'
import { config } from '~/src/config'

const bucketArray = config.get('bucketArray')

const initiateValidation = Joi.object({
  redirect: Joi.string().uri().required(),
  s3Bucket: Joi.string()
    .required()
    .valid(...bucketArray)
    .messages({
      'any.only':
        'No permission to write to bucket - Please contact CDP Portal Team'
    }),
  callback: Joi.string().uri().optional(),
  s3Path: Joi.string().optional(),
  mimeTypes: Joi.array().items(Joi.string()).optional(),
  maxFileSize: Joi.number().integer().positive().optional(),
  metadata: Joi.object().unknown(true).default({})
})

export { initiateValidation }
