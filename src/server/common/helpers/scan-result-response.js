import { updateFormsResponse } from '~/src/server/common/helpers/update-forms-response'

function toScanResultResponse(uploadId, uploadDetails, files, debug) {
  // preserve ordering of mandatory & optional keys between status changes
  return {
    ...(debug && {
      debug: {
        request: uploadDetails.request,
        processingTime: uploadDetails.uploadProcessingTime
      }
    }),
    uploadStatus: uploadDetails.uploadStatus,
    metadata: uploadDetails.request.metadata,
    form: updateFormsResponse(uploadDetails.form, files),
    numberOfRejectedFiles: uploadDetails.numberOfRejectedFiles
  }
}

export { toScanResultResponse }
