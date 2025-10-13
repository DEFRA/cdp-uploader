import Wreck from '@hapi/wreck'
import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file.js'
import { createUploadLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  isInitiated,
  uploadStatus
} from '~/src/server/common/helpers/upload-status.js'
import { processScanComplete } from '~/src/server/scan/listener/helpers/process-scan-complete.js'
import { fileErrorMessages } from '~/src/server/common/constants/file-error-messages.js'
import { fileStatus } from '~/src/server/common/constants/file-status.js'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message.js'

export async function handleDownloadRequests(message, queueUrl, server) {
  const { logger, redis, metrics } = server
  const receiptHandle = message.ReceiptHandle
  const payload = JSON.parse(message.Body)
  const uploadId = payload.uploadId

  const uploadDetails = await redis.findUploadDetails(uploadId)
  const uploadLogger = createUploadLogger(logger, uploadDetails)

  if (!uploadDetails) {
    uploadLogger.error(`uploadId ${uploadId} not found. Deleting SQS message`)
    await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
    return
  }
  uploadLogger.debug({ uploadDetails }, `Download urls request received`)

  // Upload link has already been used
  if (!isInitiated(uploadDetails.uploadStatus)) {
    uploadLogger.warn(
      `uploadId ${uploadId} has already been used to download files`
    )
    await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
    return
  }

  const downloadUrls = uploadDetails.request.downloadUrls

  uploadDetails.pending = new Date().toISOString()
  uploadDetails.uploadStatus = uploadStatus.pending.description

  // If no files are submitted jump straight to 'ready'.
  if (downloadUrls.length === 0) {
    uploadDetails.uploadStatus = uploadStatus.ready.description
  }

  await redis.storeUploadDetails(uploadId, uploadDetails)

  const fileResponses = await Promise.all(
    downloadUrls.map(async (url) => {
      const res = await Wreck.request('GET', url)
      const contentType = res.headers['content-type']
      const contentLengthHeader = res.headers['content-length']
      const contentLength = contentLengthHeader
        ? Number(contentLengthHeader)
        : undefined

      const filename = new URL(url).pathname.split('/').pop()
      const file = { contentType, contentLength, fileStream: res, filename }

      let customRejection = {}
      if (res?.statusCode && (res.statusCode < 200 || res.statusCode > 299)) {
        const errBody = await Wreck.read(res).catch(() => Buffer.from(''))
        uploadLogger.error(
          `HTTP ${res.statusCode} fetching ${url}: ${errBody.toString()}`
        )
        customRejection = {
          fileStatus: fileStatus.rejected,
          hasError: true,
          errorMessage: fileErrorMessages.downloadFailed
        }
      }

      const fileResponse = await handleFile(
        uploadId,
        uploadDetails,
        file,
        server,
        customRejection
      )

      const { missing, fileId } = fileResponse

      if (missing) {
        return {}
      }

      // This will update the uploadDetails - add file information to file stored in redis (not here)
      const responseValue = {
        fileId,
        filename: fileResponse.filename,
        contentType,
        downloadUrl: url
      }

      return { responseValue, fileId, status: fileResponse.fileStatus }
    })
  )

  const elemFields = []
  const fileStatuses = []
  for (const response of fileResponses) {
    const { responseValue, fileId, status } = response
    if (responseValue || responseValue === '') {
      elemFields.push(responseValue)
    }
    if (fileId && status) {
      uploadDetails.fileIds.push(fileId)
      fileStatuses.push({ fileId, status })
    }
  }
  if (elemFields.length > 1) {
    uploadDetails.form.files = elemFields
  } else if (elemFields.length === 1) {
    uploadDetails.form.file = elemFields[0]
  }

  uploadDetails.pending = new Date().toISOString()
  uploadDetails.uploadStatus = uploadStatus.pending.description

  // If no files are submitted jump straight to 'ready'.
  if (fileStatuses.length === 0) {
    uploadDetails.uploadStatus = uploadStatus.ready.description
  }

  await redis.storeUploadDetails(uploadId, uploadDetails)

  // If a file was rejected during the upload trigger processScanComplete
  // This will ensure the overall status gets updated.
  for (const response of fileResponses) {
    if (response.status === fileStatus.rejected) {
      await processScanComplete(uploadId, response.fileId, server)
    }
  }

  await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
  await metrics().counter('download-received')
}
