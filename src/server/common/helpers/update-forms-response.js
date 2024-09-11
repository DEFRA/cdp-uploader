/**
 * @summary Updates matching file fields in the formData with additional cdp-uploader data
 * @description
 * - Add data to formData fields data matched by fileId
 * - Pass items without fileId through, as is
 * @param {object} formData
 * @param {object[]} files
 * @returns {*}
 */
function updateFormsResponse(formData, files) {
  // ordered with keys that appear in ready at bottom (so status ordering remains same)
  const updateFields = (file) => ({
    fileStatus: file.fileStatus,
    contentLength: file.contentLength,
    checksumSha256: file.checksumSha256,
    detectedContentType: file.detectedContentType,
    s3Key: file.s3Key,
    s3Bucket: file.s3Bucket,
    hasError: file.hasError,
    ...(file?.errorMessage && {
      errorMessage: file.errorMessage
    })
  })

  return Object.entries(formData).reduce(
    (updatedFields, [fieldKey, fieldValue]) => {
      const isArray = Array.isArray(fieldValue)
      const fieldValues = isArray ? fieldValue : [fieldValue]

      const updatedFieldValues = fieldValues.map((fieldValue) => {
        const matchedFileUpdate = files.find(
          (fileUpdate) => fileUpdate?.fileId === fieldValue?.fileId
        )

        return matchedFileUpdate
          ? {
              ...fieldValue,
              ...updateFields(matchedFileUpdate)
            }
          : fieldValue
      })

      updatedFields[fieldKey] = isArray
        ? updatedFieldValues
        : updatedFieldValues.at(0)

      return updatedFields
    },
    {}
  )
}

export { updateFormsResponse }
