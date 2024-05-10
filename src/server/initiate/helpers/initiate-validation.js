import Joi from 'joi'
import { config } from '~/src/config'

const initiateValidation = Joi.object({
  redirect: Joi.string().uri().required(),
  scanResultCallbackUrl: Joi.string().uri().optional(),
  destinationBucket: Joi.string().required(),
  destinationPath: Joi.string().default(''),
  acceptedMimeTypes: Joi.array().items(Joi.string()).optional(),
  maxFileSize: Joi.number()
    .integer()
    .positive()
    .default(config.get('maxFileSize')),
  metadata: Joi.object().unknown(true).default({})
})

export { initiateValidation }
