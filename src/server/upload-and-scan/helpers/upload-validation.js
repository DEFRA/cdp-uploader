import Joi from 'joi'

const uploadPathValidation = Joi.object({
  uploadId: Joi.string().uuid().required()
})

export { uploadPathValidation }
