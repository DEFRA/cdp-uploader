class RedisHelper {
  constructor(redis) {
    this.client = redis
  }

  async findUploadDetails(id) {
    const uploadDetails = await this.client.get(id)

    if (!uploadDetails) {
      throw new Error(`No uploadDetails found for upload ID ${id}`)
    }

    return JSON.parse(uploadDetails)
  }

  async updateUploadStatus(id, uploadStatus) {
    const uploadDetails = this.findUploadDetails(id)

    await this.storeUploadDetails(id, { ...uploadDetails, uploadStatus })
  }

  async storeUploadDetails(id, uploadDetails) {
    return await this.client.set(id, JSON.stringify(uploadDetails))
  }
}

export { RedisHelper }
