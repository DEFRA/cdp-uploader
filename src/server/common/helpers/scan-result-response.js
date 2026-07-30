import { updateFormsResponse } from '~/src/server/common/helpers/update-forms-response.js'
import { uploadStatus } from '~/src/server/common/helpers/upload-status.js'

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
    numberOfRejectedFiles:
      uploadDetails.uploadStatus === uploadStatus.ready.description
        ? (uploadDetails.numberOfRejectedFiles ?? 0)
        : uploadDetails.numberOfRejectedFiles
  }
}

export { toScanResultResponse }
