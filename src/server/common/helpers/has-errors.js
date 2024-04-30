function hasErrors(fields) {
  return Boolean(
    Object.values(fields)
      .map((fieldValue) => {
        const isArray = Array.isArray(fieldValue)
        const fieldValues = isArray ? fieldValue : [fieldValue]

        return fieldValues.some((fieldValue) => fieldValue.hasError)
      })
      .filter(Boolean).length
  )
}

export { hasErrors }
