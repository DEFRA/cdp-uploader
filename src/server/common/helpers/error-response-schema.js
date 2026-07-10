import Joi from 'joi'

export const initiateBadRequestResponseSchema = Joi.object({
  message: Joi.string().example(
    'No permission to write to bucket - Please contact CDP Portal Team'
  )
}).label('ErrorResponse')

export const badRequestResponseSchema = Joi.object({
  message: Joi.string().example(
    'The selected file must be smaller than 10000000 bytes'
  )
}).label('BadRequestResponse')

export const notFoundResponseSchema = Joi.object({
  message: Joi.string().example('Upload not found')
}).label('NotFoundResponse')

export const payloadTooLargeResponseSchema = Joi.object({
  message: Joi.string().example('Payload too large')
}).label('PayloadTooLargeResponse')

export const internalServerErrorResponseSchema = Joi.object({
  message: Joi.string().example('Internal server error')
}).label('InternalServerErrorResponse')
