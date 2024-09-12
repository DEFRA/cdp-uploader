function stringArrayToObject(payload) {
  const payLoadCopy = { ...payload }

  Object.keys(payLoadCopy).forEach((key) => {
    const parts = key.replace(/\[/g, '.').replace(/]/g, '').split('.')
    const value = parts.pop()

    if (parts.length && value) {
      const asObject = parts.reduce(
        (object, part) => (object[part] = object[part] || {}),
        payLoadCopy
      )
      asObject[value] = payLoadCopy[key]

      delete payLoadCopy[key]
    }
  })

  return payLoadCopy
}

export { stringArrayToObject }
