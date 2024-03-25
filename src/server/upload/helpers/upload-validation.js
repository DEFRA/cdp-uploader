import Joi from 'joi'

const uploadPathValidation = Joi.object({
  id: Joi.string().uuid().required()
})

const validateFilePayload = Joi.object({
  filename: Joi.string().required().messages({
    'string.empty': 'Choose a file',
    'any.required': 'Choose a file'
  })
}).unknown(true) // TODO double check the other hapi private properties

export { uploadPathValidation, validateFilePayload }
