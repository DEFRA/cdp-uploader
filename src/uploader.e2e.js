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

  test('upload without files should return ready straight away', async () => {
    const initPayload = {
      redirect: 'http://localhost/redirect',
      scanResultCallbackUrl: 'http://localhost/callback',
      destinationBucket: 'my-bucket',
      destinationPath: 'path',
      acceptedMimeTypes: ['image/gif', 'image/jpeg'],
      maxFileSize: 1024 * 100000,
      metadata: { id: 1234, session: 'abc-123-xyz' }
    }

    const initResult = await server.inject({
      method: 'post',
      url: '/initiate',
      payload: initPayload
    })

    expect(initResult.statusCode).toBe(200)
    const initBody = JSON.parse(initResult.payload)
    expect(initBody.uploadId).toBeDefined()
    expect(initBody.uploadAndScanUrl).toBeDefined()
    expect(initBody.statusUrl).toBeDefined()

    // upload a file
    const formData = new FormData()
    formData.append('foo', 'bar')
    formData.append('id', '1234')

    const uploadResult = await fetch(initBody.uploadAndScanUrl, {
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
      fields: { foo: 'bar', id: '1234' }
    })
  })

  test(
    'upload with a clean file should eventually return a ready status',
    async () => {
      const initPayload = {
        redirect: 'http://localhost/redirect',
        destinationBucket: 'my-bucket'
      }

      const initResult = await server.inject({
        method: 'post',
        url: '/initiate',
        payload: initPayload
      })

      expect(initResult.statusCode).toBe(200)
      const initBody = JSON.parse(initResult.payload)
      expect(initBody.uploadId).toBeDefined()
      expect(initBody.uploadAndScanUrl).toBeDefined()
      expect(initBody.statusUrl).toBeDefined()

      // upload a file
      const formData = new FormData()
      formData.append('foo', 'bar')
      formData.append('id', '1234')
      formData.append('file', fs.createReadStream('./unicorn.jpg'))

      const uploadResult = await fetch(initBody.uploadAndScanUrl, {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      let retries = 0
      let status = null

      while (retries < statusMaxRetries) {
        const statusResult = await server.inject({
          method: 'get',
          url: initBody.statusUrl
        })
        status = JSON.parse(statusResult.payload)
        if (status.uploadStatus === 'ready') {
          break
        }
        await delay(statusWaitDelayMS)
        retries++
      }

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        fields: {
          foo: 'bar',
          id: '1234',
          file: {
            filename: 'unicorn.jpg',
            contentType: 'image/jpeg',
            fileStatus: 'complete',
            s3Bucket: 'my-bucket'
          }
        }
      })

      expect(status.fields.file.s3Key).toEqual(expect.any(String))
      expect(status.fields.file.fileId).toEqual(expect.any(String))
      expect(status.fields.file.contentLength).toBeGreaterThan(0)
    },
    5000 + statusMaxRetries * statusWaitDelayMS
  )
})

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}
