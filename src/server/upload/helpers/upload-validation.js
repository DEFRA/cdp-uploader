import Joi from 'joi'

const uploadPathValidation = Joi.object({
  id: Joi.string().uuid().required()
})

export { uploadPathValidation }
