import Joi from 'joi'

const uploadPathValidation = Joi.object({
  uploadId: Joi.string()
    .uuid()
    .required()
    .description('uploadId from the InitiateUploadSuccessResponse')
    .example('7f3c9b12-4d8e-4a6f-b512-9a6d3f8c1e25')
})

export { uploadPathValidation }
