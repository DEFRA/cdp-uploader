import Joi from 'joi'

const initiateValidation = Joi.object({
  successRedirect: Joi.string().uri().required(),
  failureRedirect: Joi.string().uri().required(),
  scanResultCallbackUrl: Joi.string().uri().optional(),
  destinationBucket: Joi.string().required(),
  destinationPath: Joi.string().default(''),
  acceptedMimeTypes: Joi.array().items(Joi.string()).optional(),
  maxFileSize: Joi.number().positive().optional(),
  metadata: Joi.object().unknown(true).default({})
})

export { initiateValidation }
