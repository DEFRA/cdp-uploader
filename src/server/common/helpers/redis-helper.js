import { flatten, unflatten } from 'flat'

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

class RedisHashHelpers {
  constructor(redis) {
    this.client = redis
  }

  async insert(key, data) {
    const hash = flatten(data)
    return await this.client.hset(key, hash)
  }

  async find(key) {
    const data = await this.client.hgetall(key)
    if (data) {
      return unflatten(data)
    }
    return null
  }

  async update(key, fields) {
    const fieldsToUpdate = flatten(fields)
    return await this.client.hset(key, fieldsToUpdate)
  }

  async push(key, field, value) {
    let i = 0
    let res = 0
    while (res === 0) {
      // We dont know how big the array is unless we read it, which would make it not thread-safe.
      // We can solve this position using `hsetnx` which only inserts if it doesnt exist.
      // O(n) but as long as we're sensible the update should be ok.
      res = await this.client.hsetnx(key, field + '.' + i, value)
      i = i + 1
    }
    return res
  }
}

export { RedisHelper, RedisHashHelpers }
