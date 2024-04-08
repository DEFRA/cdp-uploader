import { flatten, unflatten } from 'flat'

class RedisHelper {
  constructor(redis) {
    this.client = redis
  }

  async findUploadDetails(uploadId) {
    const uploadDetails = await this.client.get(uploadId)

    if (uploadDetails) {
      return JSON.parse(uploadDetails)
    }
  }

  async storeUploadDetails(uploadId, uploadDetails) {
    return await this.client.set(uploadId, JSON.stringify(uploadDetails))
  }

  async findFileDetails(fileId) {
    const fileDetails = await this.client.get(fileId)

    if (fileDetails) {
      return JSON.parse(fileDetails)
    }
  }

  async storeFileDetails(fileId, fileDetails) {
    return await this.client.set(fileId, JSON.stringify(fileDetails))
  }

  async findUploadWithFiles(uploadId) {
    const result = await this.findUploadDetails(uploadId)
    if (!result || !result.fileIds) {
      return result
    }
    const files = {}
    for (const fileId of result.fileIds) {
      const file = await this.findFileDetails(fileId)
      if (file) {
        files[fileId] = file
      }
    }
    result.files = files
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
      // We don't know how big the array is unless we read it, which would make it not thread-safe.
      // We can solve this position using `hsetnx` which only inserts if it doesn't exist.
      // O(n) but as long as we're sensible the update should be ok.
      res = await this.client.hsetnx(key, field + '.' + i, value)
      i = i + 1
    }
    return res
  }
}

export { RedisHelper, RedisHashHelpers }
