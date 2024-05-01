import Joi from 'joi'

const initiateValidation = Joi.object({
  redirect: Joi.string().uri().required(),
  scanResultCallbackUrl: Joi.string().uri().optional(),
  destinationBucket: Joi.string().required(),
  destinationPath: Joi.string().default(''),
  metadata: Joi.object().unknown(true).default({})
})

export { initiateValidation }
