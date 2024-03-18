import Joi from 'joi'

const uploadPathValidation = Joi.object({
  id: Joi.string().uuid().required()
})

const uploadPayloadValidation = Joi.object({
  //   token: Joi.string().base64().required(),
  data: Joi.binary().required()
})

export { uploadPathValidation, uploadPayloadValidation }
