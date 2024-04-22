function redactedUploadContext() {
  return [
    'uploadDetails.fields',
    'uploadDetails.successRedirect',
    'uploadDetails.failureRedirect',
    'uploadDetails.scanResultCallbackUrl',
    'uploadDetails.destinationBucket',
    'uploadDetails.destinationPath',
    'uploadDetails.metadata',
    'files.*.filename',
    'fields',
    'successRedirect',
    'failureRedirect',
    'scanResultCallbackUrl',
    'destinationBucket',
    'destinationPath',
    'metadata',
    '*.filename',
    'filename'
  ]
}

export { redactedUploadContext }
