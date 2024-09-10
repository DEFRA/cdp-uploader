import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file.js'

function isFile(formPart) {
  return formPart instanceof Object
}

async function handleMultipart(
  multipartValue,
  uploadId,
  uploadDetails,
  request
) {
  if (!isFile(multipartValue)) {
    return { responseValue: multipartValue }
  } else {
    const { fileId, filename, contentType, fileStatus, missing } =
      await handleFile(uploadId, uploadDetails, multipartValue, request)

    if (missing) {
      return {}
    }

    // This will update the uploadDetails - add file information to file stored in redis (not here)
    const responseValue = {
      fileId,
      filename,
      contentType
    }

    return { responseValue, fileId, status: fileStatus }
  }
}

export { handleMultipart }
