async function storeUploadDetails(redis, id, details) {
  return await redis.set(id, JSON.stringify(details))
}

async function findUploadDetails(redis, id) {
  const details = await redis.get(id)
  if (!details) {
    return null
  }
  return JSON.parse(details)
}

async function updateUploadStatus(redis, id, status) {
  const details = findUploadDetails(id)
  if (!details) {
    throw new Error(`No details found for upload ID ${id}`)
  }
  details.uploadStatus = status
  storeUploadDetails(details)
}

export { storeUploadDetails, findUploadDetails, updateUploadStatus }
