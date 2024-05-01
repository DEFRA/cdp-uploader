/**
 * @summary Updates matching file fields in the formData with additional cdp-uploader data
 * @description
 * - Add data to formData fields data matched by fileId
 * - Pass items without fileId through, as is
 * @param formData
 * @param files
 * @returns {{}|*}
 */
function updateFieldsResponse(formData, files) {
  const updateFields = (fieldUpdate) => ({
    s3Key: fieldUpdate.s3Key,
    s3Bucket: fieldUpdate.s3Bucket,
    fileStatus: fieldUpdate.fileStatus,
    contentType: fieldUpdate.contentType,
    contentLength: fieldUpdate.contentLength,
    hasError: fieldUpdate.hasError,
    ...(fieldUpdate?.errorMessage && {
      errorMessage: fieldUpdate.errorMessage
    })
  })

  return Object.entries(formData).reduce(
    (updatedFields, [fieldKey, fieldValue]) => {
      const isArray = Array.isArray(fieldValue)
      const fieldValues = isArray ? fieldValue : [fieldValue]

      const updatedFieldValues = fieldValues
        .map((fieldValue) => {
          const matchedFileUpdate = files.find(
            (fileUpdate) => fileUpdate.fileId === fieldValue.fileId
          )

          if (matchedFileUpdate) {
            return {
              ...fieldValue,
              ...updateFields(matchedFileUpdate)
            }
          }

          return fieldValue
        })
        .filter(Boolean)

      updatedFields[fieldKey] = isArray
        ? updatedFieldValues
        : updatedFieldValues.at(0)

      return updatedFields
    },
    {}
  )
}

export { updateFieldsResponse }
