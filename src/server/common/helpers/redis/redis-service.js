class RedisService {
  constructor(redisClient, ttlMillis) {
    this.client = redisClient
    this.ttlMillis = ttlMillis
  }

  async findUploadDetails(uploadId) {
    const uploadDetails = await this.client.get(uploadId)

    if (uploadDetails) {
      return JSON.parse(uploadDetails)
    }
  }

  async storeUploadDetails(uploadId, uploadDetails) {
    return await this.client.set(
      uploadId,
      JSON.stringify(uploadDetails),
      'PX',
      this.ttlMillis
    )
  }

  async findFileDetails(fileId) {
    const fileDetails = await this.client.get(fileId)

    if (fileDetails) {
      return JSON.parse(fileDetails)
    }
  }

  async storeFileDetails(fileId, fileDetails) {
    return await this.client.set(
      fileId,
      JSON.stringify(fileDetails),
      'PX',
      this.ttlMillis
    )
  }

  async findUploadAndFiles(uploadId) {
    const uploadDetails = await this.findUploadDetails(uploadId)
    const files = []

    if (uploadDetails?.fileIds) {
      const fileDetailsPromises = uploadDetails.fileIds.map((fileId) =>
        this.findFileDetails(fileId)
      )

      await Promise.all(fileDetailsPromises).then((fileDetails) => {
        return fileDetails.filter(Boolean).map((r) => files.push(r))
      })
    }
    return {
      uploadDetails,
      files
    }
  }
}

export { RedisService }
