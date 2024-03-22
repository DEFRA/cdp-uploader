async function storeUploadDetails(redis, id, details) {
  return await redis.set(id, JSON.stringify(details))
}

async function findUploadDetails(redis, id) {
  return JSON.parse(await redis.get(id))
}

async function updateUploadStatus(redis, id, status) {
  const details = findUploadDetails(id)
  details.uploadStatus = status
  storeUploadDetails(details)
}

export { storeUploadDetails, findUploadDetails, updateUploadStatus }
