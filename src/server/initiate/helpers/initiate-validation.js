import Joi from 'joi'
import { getBucketsAllowlist } from '~/src/server/common/helpers/service-to-buckets'
import { config } from '~/src/config'

const isDevelopment = config.get('isDevelopment')
const bucketsAllowlist = getBucketsAllowlist(process.env)

const initiateValidation = Joi.object({
  redirect: Joi.string().uri().required(),
  callback: Joi.string().uri().optional(),
  ...(isDevelopment && { s3Bucket: Joi.string().required() }),
  ...(!isDevelopment &&
    bucketsAllowlist.length > 0 && {
      s3Bucket: Joi.string()
        .required()
        .valid(...bucketsAllowlist)
        .messages({
          'any.only':
            'No permission to write to bucket - Please contact CDP Portal Team'
        })
    }),
  s3Path: Joi.string().optional(),
  mimeTypes: Joi.array().items(Joi.string()).optional(),
  maxFileSize: Joi.number().integer().positive().optional(),
  metadata: Joi.object().unknown(true).default({})
})

export { initiateValidation }
