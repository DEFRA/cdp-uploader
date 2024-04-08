function toScanResultResponse(uploadId, redisData) {
  const files = Object.values(redisData.files || {}).map((file) => {
    return {
      uploadId,
      fileId: file.fileId,
      fileStatus: file.fileStatus,
      contentType: file.contentType,
      filename: file.filename
    }
  })
  return {
    uploadStatus: redisData.uploadStatus,
    numberOfInfectedFiles: redisData.numberOfInfectedFiles,
    successRedirect: redisData.successRedirect,
    failureRedirect: redisData.failureRedirect,
    scanResultCallbackUrl: redisData.scanResultCallbackUrl,
    destinationBucket: redisData.destinationBucket,
    destinationPath: redisData.destinationPath,
    acceptedMimeTypes: redisData.acceptedMimeTypes,
    maxFileSize: redisData.maxFileSize,
    ...(files && { files }),
    fields: redisData.fields
  }
}

export { toScanResultResponse }
