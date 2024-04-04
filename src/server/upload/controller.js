import Boom from '@hapi/boom'
import * as crypto from 'node:crypto'
import { Stream } from 'node:stream'

import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload/helpers/upload-stream'
import { uploadPathValidation } from '~/src/server/upload/helpers/upload-validation'
import {
  uploadStatus,
  canBeUploaded
} from '~/src/server/common/helpers/upload-status'

const quarantineBucket = config.get('quarantineBucket')

// Todo return a nice error message for http://localhost:7337/upload (uuid missing)
const uploadController = {
  options: {
    validate: {
      params: uploadPathValidation
    },
    payload: {
      allow: 'multipart/form-data',
      multipart: true,
      output: 'stream',
      maxBytes: 200 * 1024 * 1024, // 200MB
      uploads: 'uploads'
    }
  },
  handler: async (request, h) => {
    const uploadId = request.params.id
    if (!uploadId) {
      request.logger.info('Failed to upload, no uploadId')
      return Boom.notFound('Failed to upload. No uploadId provided')
    }

    const uploadDetails = await request.redis.findUploadDetails(uploadId)

    request.logger.info(`upload details ${uploadDetails}`)

    if (!uploadDetails) {
      request.logger.info('Failed to upload, uploadId does not exist')
      return Boom.notFound('Failed to upload. UploadId does not exist')
    }

    // Upload link has already been used
    if (!canBeUploaded(uploadDetails.uploadStatus)) {
      request.logger.info(
        `upload id ${uploadId} has already been used to upload a file.`
      )
      return h.redirect(uploadDetails.failureRedirect) // TODO: how do we communicate this failure reason?
    }

    uploadDetails.fields = {}
    uploadDetails.fileIds = []

    try {
      const multipart = request.payload

      for (const [partKey, multipartValue] of Object.entries(multipart)) {
        if (Array.isArray(multipartValue)) {
          const elemFields = []
          for (const partValue of multipartValue) {
            const { responseValue, fileId } = await handleMultipart(
              partValue,
              uploadId,
              request
            )
            if (fileId) {
              uploadDetails.fileIds.push(fileId)
            }
            elemFields.push(responseValue)
          }
          uploadDetails.fields[partKey] = elemFields
        } else {
          const { responseValue, fileId } = await handleMultipart(
            multipartValue,
            uploadId,
            request
          )
          if (fileId) {
            uploadDetails.fileIds.push(fileId)
          }
          uploadDetails.fields[partKey] = responseValue
        }
      }
      uploadDetails.uploadStatus = uploadStatus.pending.description
      uploadDetails.pending = new Date()
      await request.redis.storeUploadDetails(uploadId, uploadDetails)

      // TODO: check all the files sizes match the size set in uploadDetails
      return h.redirect(uploadDetails.successRedirect)
    } catch (e) {
      request.logger.error(e)
      return h.redirect(uploadDetails.failureRedirect) // TODO: how do we communicate this failure reason?
    }
  }
}

async function handleMultipart(multipartValue, uploadId, request) {
  if (isFile(multipartValue)) {
    const fileId = crypto.randomUUID()
    const filePart = await handleFile(uploadId, fileId, multipartValue, request)
    return { responseValue: filePart, fileId }
  } else {
    return { responseValue: multipartValue }
  }
}

async function handleFile(uploadId, fileId, fileStream, request) {
  const hapiFilename = fileStream.hapi?.filename
  const filename = { ...(hapiFilename && { filename: hapiFilename }) }
  const hapiContentType = fileStream.hapi?.headers['content-type']
  const contentType = {
    ...(hapiContentType && { contentType: hapiContentType })
  }
  const fileKey = `${uploadId}/${fileId}`
  request.logger.info(`Uploading ${fileId} to ${uploadId}`)
  // TODO: check result of upload and redirect on error
  const uploadResult = await uploadStream(
    request.s3,
    quarantineBucket,
    fileKey,
    fileStream,
    {
      uploadId,
      fileId,
      ...contentType,
      ...filename
    }
  )

  const fileDetails = {
    uploadId,
    fileId,
    fileStatus: uploadStatus.pending.description,
    pending: new Date(),
    actualContentType: uploadResult.mimeType,
    ...contentType,
    ...filename
  }
  await request.redis.storeFileDetails(fileId, fileDetails)
  return {
    fileId,
    actualContentType: uploadResult.mimeType,
    ...filename,
    ...contentType
  }
}

function isFile(formPart) {
  return formPart instanceof Stream
}

export { uploadController }
