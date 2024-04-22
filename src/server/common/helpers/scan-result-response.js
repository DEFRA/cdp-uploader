function toScanResultResponse(uploadId, uploadDetails, files) {
  return {
    uploadStatus: uploadDetails.uploadStatus,
    numberOfInfectedFiles: uploadDetails.numberOfInfectedFiles,
    successRedirect: uploadDetails.successRedirect,
    failureRedirect: uploadDetails.failureRedirect,
    scanResultCallbackUrl: uploadDetails.scanResultCallbackUrl,
    destinationBucket: uploadDetails.destinationBucket,
    destinationPath: uploadDetails.destinationPath,
    acceptedMimeTypes: uploadDetails.acceptedMimeTypes,
    maxFileSize: uploadDetails.maxFileSize,
    files: toFilesResponse(uploadId, files),
    fields: updateFieldsResponse(uploadDetails.fields, files),
    metadata: uploadDetails.metadata
  }
}

function toFilesResponse(uploadId, files) {
  return files.map((file) => {
    return {
      uploadId,
      fileId: file.fileId,
      fileStatus: file.fileStatus,
      contentType: file.contentType,
      contentLength: file.contentLength,
      filename: file.filename,
      s3Bucket: file.s3Bucket,
      s3Key: file.s3Key
    }
  })
}

/**
 * Updates matching file fields in the form-data with the s3 keys & status.
 */
function updateFieldsResponse(fields, files) {
  if (!fields) {
    return fields
  }
  Object.values(fields).forEach((field) => {
    files.forEach((file) => {
      const details = {
        s3Key: file.s3Key,
        s3Bucket: file.s3Bucket,
        fileStatus: file.fileStatus
      }

      if (Array.isArray(field)) {
        field
          .filter((f) => f?.fileId === file.fileId)
          .forEach((f) => Object.assign(f, details))
        field.forEach((f) => delete f.fileId)
      } else {
        if (field?.fileId === file.fileId) {
          Object.assign(field, details)
        }
        delete field.fileId
      }
    })
  })
  return fields
}

export { toScanResultResponse, updateFieldsResponse }
