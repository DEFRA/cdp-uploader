import { updateFieldsResponse } from '~/src/server/common/helpers/update-fields-response'

function toScanResultResponse(uploadId, uploadDetails, files) {
  return {
    uploadStatus: uploadDetails.uploadStatus,
    numberOfRejectedFiles: uploadDetails.numberOfRejectedFiles,
    redirect: uploadDetails.redirect,
    scanResultCallbackUrl: uploadDetails.scanResultCallbackUrl,
    destinationBucket: uploadDetails.destinationBucket,
    destinationPath: uploadDetails.destinationPath,
    files: toFilesResponse(uploadId, files),
    fields: updateFieldsResponse(uploadDetails.fields, files),
    metadata: uploadDetails.metadata
  }
}

function toFilesResponse(uploadId, files) {
  return files.map((file) => ({
    uploadId,
    fileId: file.fileId,
    fileStatus: file.fileStatus,
    contentType: file.contentType,
    contentLength: file.contentLength,
    checksumSha256: file.checksumSha256,
    filename: file.filename,
    s3Bucket: file.s3Bucket,
    s3Key: file.s3Key,
    hasError: file.hasError,
    ...(file?.errorMessage && {
      errorMessage: file.errorMessage
    })
  }))
}

export { toScanResultResponse }
