class RedisHelper {
  constructor(redis) {
    this.client = redis
  }

  async findUploadDetails(id) {
    const uploadDetails = await this.client.get(id)

    if (uploadDetails) {
      // throw new Error(`No uploadDetails found for upload ID ${id}`)
      return JSON.parse(uploadDetails)
    }
  }

  async updateUploadStatus(id, uploadStatus) {
    const uploadDetails = this.findUploadDetails(id)

    await this.storeUploadDetails(id, { ...uploadDetails, uploadStatus })
  }

  async storeUploadDetails(id, uploadDetails) {
    return await this.client.set(id, JSON.stringify(uploadDetails))
  }

  async findFileDetails(id) {
    const fileDetails = await this.client.get(id)

    if (fileDetails) {
      return JSON.parse(fileDetails)
    }
  }

  async storeFileDetails(id, fileDetails) {
    return await this.client.set(id, JSON.stringify(fileDetails))
  }

  async findUploadWithFiles(id) {
    const result = await this.findUploadDetails(id)
    if (!result || !result.fileIds) {
      return result
    }
    const fileDetails = {}
    for (const fileId of result.fileIds) {
      const file = await this.findFileDetails(fileId)
      if (file) {
        fileDetails[fileId] = file
      }
    }
    result.fileDetails = fileDetails
    return result
  }
}

export { RedisHelper }
