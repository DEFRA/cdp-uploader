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
        fileStatus: file.fileStatus,
        contentType: file.contentType,
        contentLength: file.contentLength,
        hasError: file.hasError,
        ...(file?.errorMessage && { errorMessage: file.errorMessage })
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

export { updateFieldsResponse }
