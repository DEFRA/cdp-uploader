import { pickBy } from 'lodash'

/**
 * @summary Updates matching file fields in the formData with additional cdp-uploader data
 * @description
 * - Add data to formData fields data matched by fileId
 * - Pass items without fileId through, as is
 * - Remove fileId from items with fileId
 * @param formData
 * @param fieldUpdates
 * @returns {{}|*}
 */
function updateFieldsResponse(formData, fieldUpdates) {
  const updateFields = (fieldUpdate) => ({
    s3Key: fieldUpdate.s3Key,
    s3Bucket: fieldUpdate.s3Bucket,
    fileStatus: fieldUpdate.fileStatus,
    contentType: fieldUpdate.contentType,
    contentLength: fieldUpdate.contentLength,
    hasError: fieldUpdate.hasError,
    ...(fieldUpdate?.errorMessage && {
      errorMessage: fieldUpdate.errorMessage
    }),
    fileId: null
  })

  return Object.entries(formData).reduce(
    (updatedFields, [fieldKey, fieldValue]) => {
      const isArray = Array.isArray(fieldValue)
      const fieldValues = isArray ? fieldValue : [fieldValue]

      const updatedFieldValues = fieldValues
        .map((fieldValue) => {
          const matchedFieldUpdate = fieldUpdates.find(
            (fieldUpdate) => fieldUpdate.fileId === fieldValue.fileId
          )

          if (matchedFieldUpdate) {
            return pickBy({
              ...fieldValue,
              ...updateFields(matchedFieldUpdate)
            })
          }

          return fieldValue?.fileId
            ? pickBy({ ...fieldValue, fileId: null })
            : fieldValue
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
