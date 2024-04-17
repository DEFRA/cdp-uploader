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

    request.logger.info(uploadDetails, `Upload request received`)

    if (!uploadDetails) {
      request.logger.info(`uploadId ${uploadId} does not exist - upload failed`)
      return Boom.notFound('Failed to upload. UploadId does not exist')
    }

    // Upload link has already been used
    if (!isInitiated(uploadDetails.uploadStatus)) {
      request.logger.warn(
        uploadDetails,
        `uploadId ${uploadId} has already been used to upload files`
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
              uploadDetails,
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
            uploadDetails,
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

async function handleMultipart(
  multipartValue,
  uploadId,
  uploadDetails,
  request
) {
  if (isFile(multipartValue)) {
    const fileId = crypto.randomUUID()
    const filePart = await handleFile(
      uploadId,
      uploadDetails,
      fileId,
      multipartValue,
      request
    )
    return { responseValue: filePart, fileId }
  } else {
    return { responseValue: multipartValue }
  }
}

async function handleFile(
  uploadId,
  uploadDetails,
  fileId,
  fileStream,
  request
) {
  const hapiFilename = fileStream.hapi?.filename
  const filename = { ...(hapiFilename && { filename: hapiFilename }) }
  const hapiContentType = fileStream.hapi?.headers['content-type']
  const contentType = {
    ...(hapiContentType && { contentType: hapiContentType })
  }
  const fileKey = `${uploadId}/${fileId}`
  request.logger.info(
    uploadDetails,
    `uploadId ${uploadId} - uploading fileId ${fileId}`
  )
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
    request.logger
  )

  const maxFileSizeMb = Math.floor(config.get('maxFileSize') / 1024 / 1024)
  request.logger.debug(`Service max file size ${maxFileSizeMb} megabytes`)
  request.logger.debug(
    `Tenant max file size ${uploadDetails.maxFileSize} kilobytes`
  )
  // Unsure if we should default to bytes, kilobytes or megabytes. For config and API.
  if (uploadResult.fileLength) {
    request.logger.debug(
      {
        uploadDetails: uploadDetails,
        uploadResult: uploadResult
      },
      `uploadId ${uploadId} - fileId ${fileId} uploaded with size ${uploadResult.fileLength} bytes`
    )
    if (uploadResult.fileLength > config.get('maxFileSize')) {
      const fileSizeMb = Math.floor(uploadResult.contentLength / 1024 / 1024)
      request.logger.warn(
        { uploadDetails },
        `uploadId ${uploadId} - fileId ${fileId} is too large: ${fileSizeMb}mb`
      )
    }
    if (uploadDetails.maxFileSize) {
      const uploadMaxFileSize = Math.floor(uploadDetails.maxFileSize / 1024)
      if (uploadResult.fileLength > uploadMaxFileSize) {
        const fileSizeKb = Math.floor(uploadResult.fileLength / 1024)
        request.logger.warn(
          { uploadDetails },
          `uploadId ${uploadId} - fileId ${fileId} is larger than Tenant's limit: ${fileSizeKb}kb > ${uploadDetails.maxFileSize}kb`
        )
      }
    }
  } else {
    request.logger.warn(
      { uploadDetails },
      `uploadId ${uploadId} - fileId ${fileId} uploaded with unknown size`
    )
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
