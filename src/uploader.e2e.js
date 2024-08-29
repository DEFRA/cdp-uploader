import { createServer } from '~/src/server'
import { config } from '~/src/config'
import fetch from 'node-fetch'
import FormData from 'form-data'
import * as fs from 'fs'

describe('#e2e', () => {
  const statusMaxRetries = 60
  const statusWaitDelayMS = 1000
  let server

  beforeAll(async () => {
    config.set('sqsScanResultsCallbackVisibilityTimeout', 50)
    config.set('mockVirusResultDelay', 0)

    server = await createServer()
    await server.initialize()
    await server.start()
  })

  afterAll(async () => {
    server.stop({ timeout: 4000 })
  })

  test('healthcheck should return 200', async () => {
    const res = await server.inject({
      method: 'get',
      url: '/health'
    })

    expect(res.statusCode).toBe(200)
  })

  test('init upload fails with invalid payloads', async () => {
    const initPayload = {
      redirect: 'http://localhost/redirect',
      s3Bucket: 'my-bucket',
      somebadkey: 1234
    }

    const initResult = await server.inject({
      method: 'post',
      url: '/initiate',
      payload: initPayload
    })

    expect(initResult.statusCode).toBe(400)
  })

  test('upload without files should return ready straight away', async () => {
    const initPayload = {
      redirect: 'http://localhost/redirect',
      callback: 'http://localhost/callback',
      s3Bucket: 'my-bucket',
      s3Path: 'path',
      mimeTypes: ['image/gif', 'image/jpeg'],
      maxFileSize: 1024 * 100000,
      metadata: { id: 1234, session: 'abc-123-xyz' }
    }

    const initBody = await initUpload(server, initPayload)

    // upload a file
    const formData = new FormData()
    formData.append('foo', 'bar')
    formData.append('id', '1234')

    const uploadResult = await fetch(initBody.uploadUrl, {
      method: 'POST',
      body: formData,
      redirect: 'manual'
    })

    expect(uploadResult.status).toBe(302)

    const statusResult = await server.inject({
      method: 'get',
      url: initBody.statusUrl
    })

    const status = JSON.parse(statusResult.payload)
    expect(status).toMatchObject({
      uploadStatus: 'ready',
      metadata: initPayload.metadata,
      form: { foo: 'bar', id: '1234' }
    })
  })

  test(
    'upload with a clean file should eventually return a ready status',
    async () => {
      const initBody = await initUpload(server)

      // upload a file
      const formData = new FormData()
      formData.append('foo', 'bar')
      formData.append('id', '1234')
      formData.append(
        'file',
        fs.createReadStream('./src/__fixtures__/files/test.jpg')
      )

      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(
        server,
        initBody.statusUrl,
        statusMaxRetries,
        statusWaitDelayMS
      )

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          foo: 'bar',
          id: '1234',
          file: {
            filename: 'test.jpg',
            contentType: 'image/jpeg',
            fileStatus: 'complete',
            s3Bucket: 'my-bucket'
          }
        }
      })

      expect(status.form.file.s3Key).toEqual(expect.any(String))
      expect(status.form.file.fileId).toEqual(expect.any(String))
      expect(status.form.file.contentLength).toBeGreaterThan(0)
    },
    5000 + statusMaxRetries * statusWaitDelayMS
  )

  test(
    'upload with a mock virus file should be rejected',
    async () => {
      const initBody = await initUpload(server)

      // upload a file
      const formData = new FormData()
      formData.append('foo', 'bar')
      formData.append('id', '1234')
      formData.append(
        'file',
        fs.createReadStream('./src/__fixtures__/files/virus.jpg')
      )

      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(
        server,
        initBody.statusUrl,
        statusMaxRetries,
        statusWaitDelayMS
      )

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          foo: 'bar',
          id: '1234',
          file: {
            filename: 'virus.jpg',
            contentType: 'image/jpeg',
            fileStatus: 'rejected',
            hasError: true,
            errorMessage: 'The selected file contains a virus'
          }
        }
      })

      expect(status.form.file.s3Key).toBeUndefined()
      expect(status.form.file.fileId).toEqual(expect.any(String))
      expect(status.form.file.contentLength).toBeGreaterThan(0)
    },
    5000 + statusMaxRetries * statusWaitDelayMS
  )

  test(
    'upload with a file that is too big should be rejected',
    async () => {
      const initBody = await initUpload(server, { maxFileSize: 10 })

      // upload a file
      const formData = new FormData()
      formData.append(
        'file',
        fs.createReadStream('./src/__fixtures__/files/test.jpg')
      )

      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(
        server,
        initBody.statusUrl,
        statusMaxRetries,
        statusWaitDelayMS
      )

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'test.jpg',
            contentType: 'image/jpeg',
            fileStatus: 'rejected',
            hasError: true,
            errorMessage: 'The selected file must be smaller than 10 B'
          }
        }
      })

      expect(status.form.file.s3Key).toBeUndefined()
      expect(status.form.file.fileId).toEqual(expect.any(String))
      expect(status.form.file.contentLength).toBeGreaterThan(0)
    },
    5000 + statusMaxRetries * statusWaitDelayMS
  )

  test(
    'upload with a file that is the wrong mime type should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        mimeTypes: ['text/plain', 'text/json']
      })

      // upload a file
      const formData = new FormData()
      formData.append(
        'file',
        fs.createReadStream('./src/__fixtures__/files/test.jpg')
      )

      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(
        server,
        initBody.statusUrl,
        statusMaxRetries,
        statusWaitDelayMS
      )

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'test.jpg',
            contentType: 'image/jpeg',
            fileStatus: 'rejected',
            hasError: true,
            errorMessage: 'The selected file must be a TXT'
          }
        }
      })

      expect(status.form.file.s3Key).toBeUndefined()
      expect(status.form.file.fileId).toEqual(expect.any(String))
      expect(status.form.file.contentLength).toBeGreaterThan(0)
    },
    5000 + statusMaxRetries * statusWaitDelayMS
  )

  test(
    'upload with a file that is zero length should be rejected',
    async () => {
      const initBody = await initUpload(server)

      // upload a file
      const formData = new FormData()
      formData.append(
        'file',
        fs.createReadStream('./src/__fixtures__/files/zero.txt')
      )

      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(
        server,
        initBody.statusUrl,
        statusMaxRetries,
        statusWaitDelayMS
      )

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'zero.txt',
            contentType: 'text/plain',
            fileStatus: 'rejected',
            hasError: true,
            errorMessage: 'The selected file is empty',
            contentLength: 0
          }
        }
      })

      expect(status.form.file.s3Key).toBeUndefined()
      expect(status.form.file.fileId).toEqual(expect.any(String))
    },
    5000 + statusMaxRetries * statusWaitDelayMS
  )
})

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

async function initUpload(server, params = {}) {
  const initPayload = {
    redirect: 'http://localhost/redirect',
    s3Bucket: 'my-bucket',
    ...params
  }
  const initResult = await server.inject({
    method: 'post',
    url: '/initiate',
    payload: initPayload
  })

  expect(initResult.statusCode).toBe(201)

  const initBody = JSON.parse(initResult.payload)
  expect(initBody.uploadId).toEqual(expect.any(String))
  expect(initBody.uploadUrl).toEqual(expect.any(String))
  expect(initBody.statusUrl).toEqual(expect.any(String))

  return initBody
}

async function waitForReady(
  server,
  statusUrl,
  maxRetries = 60,
  delayMS = 1000
) {
  let retries = 0
  let status = null

  while (retries < maxRetries) {
    const statusResult = await server.inject({
      method: 'get',
      url: statusUrl
    })
    status = JSON.parse(statusResult.payload)
    if (status.uploadStatus === 'ready') {
      return status
    }
    await delay(delayMS)
    retries++
  }
  return status
}
