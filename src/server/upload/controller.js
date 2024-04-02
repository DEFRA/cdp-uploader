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
      request.logger.info('Failed to upload, no id')
      return h.response(Boom.notFound('Failed to upload. No id'))
    }

    const uploadDetails = await request.redis.findUploadDetails(uploadId)

    if (uploadDetails === null) {
      request.logger.info('Failed to upload, no uploadDetails data')
      // TODO: Show user-friendly error page
      return h.response(
        Boom.notFound('Failed to upload, no uploadDetails data')
      )
    }

    // Upload link has already been used
    if (!canBeUploaded(uploadDetails.uploadStatus)) {
      // TODO: how do we communicate this failure reason?
      request.logger.info(
        `upload id ${uploadId} has already been used to upload a file.`
      )
      return h.redirect(uploadDetails.failureRedirect)
    }

    uploadDetails.fields = {}
    uploadDetails.fileIds = []

    try {
      const multipart = request.payload
      const result = {}

      for (const part in multipart) {
        const field = multipart[part]
        const formElem = Array.isArray(field) ? field : [field]
        const elemFields = []
        for (const elem in formElem) {
          const { formPart, fileData } = await handleFormPart(
            uploadId,
            formElem[elem],
            request
          )

          elemFields[elem] = formPart
          if (fileData) {
            // console.log('fileData', fileData)
            uploadDetails.fileIds.push(fileData.fileId)
          }
        }

        uploadDetails.fields[part] = elemFields
      }
      request.logger.info(
        `Uploaded to ${JSON.stringify(result.data?.Location)}`
      )

      uploadDetails.uploadStatus = uploadStatus.pending.description
      uploadDetails.pending = new Date()
      await request.redis.storeUploadDetails(uploadId, uploadDetails)

      // TODO: check all the files sizes match the size set in uploadDetails
      return h.redirect(uploadDetails.successRedirect)
    } catch (e) {
      request.logger.error(e)
      return h.redirect(uploadDetails.failureRedirect)
    }
  }
}

function handleFormPart(uploadId, formPart, request) {
  return isFile(formPart)
    ? handleFile(uploadId, formPart, request)
    : { formPart }
}

async function handleFile(uploadId, filePart, request) {
  const hapiFilename = filePart.hapi?.filename
  const filename = { ...(hapiFilename && { filename: hapiFilename }) }
  const hapiContentType = filePart.hapi?.headers['content-type']
  const contentType = {
    ...(hapiContentType && { contentType: hapiContentType })
  }
  const fileId = crypto.randomUUID()
  const fileKey = `${uploadId}/${fileId}`
  request.logger.info(`Uploading ${fileId} to ${uploadId}`)
  // TODO: check result of upload and redirect on error
  await uploadStream(request.s3, quarantineBucket, fileKey, filePart, {
    uploadId,
    fileId,
    ...contentType,
    ...filename
  })

  const fileDetails = {
    uploadId,
    fileId,
    uploadStatus: uploadStatus.pending.description,
    pending: new Date(),
    ...contentType,
    ...filename
  }
  await request.redis.storeFileDetails(fileId, fileDetails)
  return {
    formPart: {
      fileId,
      // Todo: add detected content type
      ...filename,
      ...contentType
    },
    fileData: fileDetails
  }
}

function isFile(formPart) {
  return formPart instanceof Stream
}

export { uploadController }
