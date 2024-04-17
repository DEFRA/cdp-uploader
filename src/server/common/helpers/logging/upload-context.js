function findUploadContext(inputArg) {
  if (inputArg && typeof inputArg === 'object') {
    if (isUploadContext(inputArg)) {
      return inputArg
    } else if (isUploadContext(inputArg.uploadDetails)) {
      return inputArg.uploadDetails
    }
  }
  return null
}

function isUploadContext(inputArg) {
  return inputArg && typeof inputArg === 'object' && inputArg.uploadId
}

function toUploadTerseContext(context) {
  return {
    uploadDetails: {
      uploadId: context.uploadId,
      initiated: context.initiated,
      uploadStatus: context.uploadStatus,
      fileIds: context.fileIds
    }
  }
}

function swapUploadContext(inputArg, uploadContext) {
  const terserContext = toUploadTerseContext(uploadContext)
  if (isUploadContext(inputArg)) {
    return terserContext
  } else if (isUploadContext(inputArg.uploadDetails)) {
    inputArg.uploadDetails = terserContext
    return inputArg
  } else {
    return inputArg
  }
}

export { findUploadContext, swapUploadContext }
