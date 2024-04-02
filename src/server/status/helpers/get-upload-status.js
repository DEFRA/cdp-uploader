async function getUploadStatus(redisClient, id) {
  const result = await redisClient.get(id)
  if (!result) {
    return
  }
  const parsedResult = JSON.parse(result)
  const fileDetails = {}
  for (const fileKey of parsedResult.files) {
    const file = await redisClient.get(fileKey)
    if (file) {
      const parsedFile = JSON.parse(file)
      fileDetails[fileKey] = parsedFile
    }
  }
  parsedResult.fileDetails = fileDetails
  return parsedResult
}

export { getUploadStatus }
