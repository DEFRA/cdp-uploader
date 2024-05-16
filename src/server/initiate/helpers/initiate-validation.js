import Joi from 'joi'

const initiateValidation = Joi.object({
  redirect: Joi.string().uri().required(),
  callback: Joi.string().uri().optional(),
  s3Bucket: Joi.string().required(),
  s3Path: Joi.string().optional(),
  mimeTypes: Joi.array().items(Joi.string()).optional(),
  maxFileSize: Joi.number().integer().positive().optional(),
  metadata: Joi.object().unknown(true).default({})
})

export { initiateValidation }
