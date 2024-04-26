import Boom from '@hapi/boom'
import * as crypto from 'node:crypto'
import { Stream } from 'node:stream'

import { config } from '~/src/config'
import { uploadStream } from '~/src/server/upload/helpers/upload-stream'
import { uploadPathValidation } from '~/src/server/upload/helpers/upload-validation'
import {
  isInitiated,
  uploadStatus
} from '~/src/server/common/helpers/upload-status'
import {
  createFileLogger,
  createUploadLogger
} from '~/src/server/common/helpers/logging/logger'

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

    const uploadLogger = createUploadLogger(request.logger, uploadDetails)

    if (!uploadDetails) {
      uploadLogger.info(`uploadId ${uploadId} does not exist - upload failed`)
      return Boom.notFound('Failed to upload. UploadId does not exist')
    }

    uploadLogger.debug({ uploadDetails }, `Upload request received`)

    // Upload link has already been used
    if (!isInitiated(uploadDetails.uploadStatus)) {
      uploadLogger.warn(
        `uploadId ${uploadId} has already been used to upload files`
      )
      return h.redirect(uploadDetails.failureRedirect) // TODO: how do we communicate this failure reason?
    }

    try {
      const multipart = request.payload

      for (const [partKey, mValue] of Object.entries(multipart)) {
        const partValues = Array.isArray(mValue) ? mValue : [mValue]
        const elemFields = []
        for (const partValue of partValues) {
          const { responseValue, fileId } = await handleMultipart(
            partValue,
            uploadId,
            uploadDetails,
            request
          )
          if (responseValue && fileId) {
            uploadDetails.fileIds.push(fileId)
          }
          if (responseValue) {
            elemFields.push(responseValue)
          }
        }
        if (elemFields.length > 1) {
          uploadDetails.fields[partKey] = elemFields
        } else if (elemFields.length === 1) {
          uploadDetails.fields[partKey] = elemFields[0]
        }
      }
      uploadDetails.uploadStatus = uploadStatus.pending.description
      uploadDetails.pending = new Date()
      await request.redis.storeUploadDetails(uploadId, uploadDetails)

      // TODO: check all the files sizes match the size set in uploadDetails
      return h.redirect(uploadDetails.redirect)
    } catch (error) {
      createUploadLogger(uploadLogger, uploadDetails).error(error, 'Error')
      return h.redirect(uploadDetails.redirect) // TODO: how do we communicate this failure reason?
    }
  }
}

async function handleMultipart(
  multipartValue,
  uploadId,
  uploadDetails,
  request
) {
  if (!isFile(multipartValue)) {
    return { responseValue: multipartValue }
  } else {
    const fileId = crypto.randomUUID()
    const fileLogger = createFileLogger(request.logger, uploadDetails, fileId)

    const filePart = await handleFile(
      uploadId,
      uploadDetails,
      fileId,
      multipartValue,
      request,
      fileLogger
    )

    if (filePart === null) {
      return {}
    }

    return { responseValue: filePart, fileId }
  }
}

async function handleFile(
  uploadId,
  uploadDetails,
  fileId,
  fileStream,
  request,
  fileLogger
) {
  const hapiFilename = fileStream.hapi?.filename
  const filename = { ...(hapiFilename && { filename: hapiFilename }) }
  const hapiContentType = fileStream.hapi?.headers['content-type']
  const contentType = {
    ...(hapiContentType && { contentType: hapiContentType })
  }
  const fileKey = `${uploadId}/${fileId}`

  fileLogger.debug({ uploadDetails }, `Uploading fileId ${fileId}`)
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
    },
    fileLogger
  )

  if (uploadResult.fileLength === 0) {
    fileLogger.warn(
      `uploadId ${uploadId} - fileId ${fileId} uploaded with unknown size`
    )

    return null
  }

  const actualContentType = uploadResult.fileTypeResult?.mime
  const files = {
    uploadId,
    fileId,
    fileStatus: uploadStatus.pending.description,
    pending: new Date(),
    actualContentType,
    contentLength: uploadResult.fileLength,
    ...contentType,
    ...filename
  }
  await request.redis.storeFileDetails(fileId, files)
  return {
    fileId,
    actualContentType,
    ...filename,
    ...contentType
  }
}

function isFile(formPart) {
  return formPart instanceof Stream
}

export { uploadController }
