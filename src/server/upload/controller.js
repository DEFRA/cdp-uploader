import Boom from '@hapi/boom'
import * as crypto from 'node:crypto'
import { Stream } from 'node:stream'

import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload/helpers/upload-stream'
import { uploadPathValidation } from '~/src/server/upload/helpers/upload-validation'
import {
  uploadStatus,
  canBeQuarantined
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
    if (!canBeQuarantined(uploadDetails)) {
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
          const { fieldData, fileData } = await handleFileOrField(
            request,
            uploadId,
            uploadDetails,
            formElem[elem]
          )

          elemFields[elem] = fieldData
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

      uploadDetails.uploadStatus = uploadStatus.pending.toString()
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

function handleFileOrField(request, uploadId, uploadDetails, fieldData) {
  return isFile(fieldData)
    ? handleFile(request, uploadId, uploadDetails, fieldData)
    : { fieldData }
}

async function handleFile(request, uploadId, uploadDetails, fieldData) {
  const filename = fieldData.hapi.filename
  const fileId = crypto.randomUUID()
  request.logger.info(`Uploading ${JSON.stringify(filename)} as ${fileId}`)
  const fileKey = `${uploadId}/${filename}`
  // TODO: check result of upload and redirect on error
  await uploadStream(request.s3, quarantineBucket, fileKey, fieldData, {
    callback: uploadDetails.scanResultCallback,
    destination: uploadDetails.destinationBucket
  })

  const fileDetails = {
    uploadId,
    fileId,
    filename,
    uploadStatus: uploadStatus.pending.toString(),
    pending: new Date()
  }
  await request.redis.storeScanDetails(fileId, fileDetails)
  return {
    fieldData: {
      filename,
      fileId,
      contentType: fieldData.hapi?.headers['content-type'] ?? ''
    },
    fileData: fileDetails
  }
}

function isFile(fieldData) {
  return fieldData instanceof Stream
}

export { uploadController }
