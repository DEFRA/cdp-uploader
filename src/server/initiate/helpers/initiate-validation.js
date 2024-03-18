import Joi from 'joi'

const initiateValidation = Joi.object({
  successRedirect: Joi.string().uri().required(),
  failureRedirect: Joi.string().uri().required(),
  scanResultCallback: Joi.string().uri().required(),
  fileDestination: Joi.string().uri().required(),
  acceptedMimeTypes: Joi.array().items(Joi.string()),
  maxFileSize: Joi.number().positive()
})

export { initiateValidation }
