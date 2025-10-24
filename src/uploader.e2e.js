import * as fs from 'fs'
import { readFile } from 'node:fs/promises'
import { setTimeout as asyncSetTimeout } from 'node:timers/promises'

import fetch from 'node-fetch'
import FormData from 'form-data'

import { createServer } from '~/src/server/index.js'
import { config } from '~/src/config/index.js'
import { PutObjectCommand } from '@aws-sdk/client-s3'

describe('#uploaderE2e', () => {
  const oneMinute = 60 * 1000
  let server

  beforeAll(async () => {
    config.set('mockVirusResultDelay', 0)

    server = await createServer()
    const files = [
      {
        name: 'test.jpg',
        path: './src/__fixtures__/files/test.jpg',
        contentType: 'image/jpeg'
      },
      {
        name: 'virus.jpg',
        path: './src/__fixtures__/files/virus.jpg',
        contentType: 'image/jpeg'
      },
      {
        name: 'zero.txt',
        path: './src/__fixtures__/files/zero.txt',
        contentType: 'text/plain'
      }
    ]

    for (const { name, path, contentType } of files) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      server.s3.send(
        new PutObjectCommand({
          Bucket: 'my-bucket',
          Key: name,
          Body: await readFile(path),
          ContentType: contentType
        })
      )
    }
    await server.start()
  })

  afterAll(async () => {
    server.events.emit('closing', { abort: true })
    server.events.emit('stop')

    await server.stop({ timeout: 0 })
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
    'download request without urls should return ready',
    async () => {
      const initPayload = {
        downloadUrls: [],
        s3Bucket: 'my-bucket',
        metadata: { id: 1234, session: 'abc-123-xyz' }
      }

      const initBody = await initUpload(server, initPayload)

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        metadata: initPayload.metadata
      })
    },
    oneMinute
  )

  test(
    'upload with a clean file should eventually return a ready status',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket'
      })

      // upload a file
      const formData = new FormData()
      formData.append('foo', 'bar-clean')
      formData.append('id', '1234-clean')
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

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          foo: 'bar-clean',
          id: '1234-clean',
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
    oneMinute
  )

  test(
    'post upload with a clean file should eventually return a ready status',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket'
      })

      // upload a file
      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        headers: {
          'x-filename': 'test.jpg'
        },
        body: fs.createReadStream('./src/__fixtures__/files/test.jpg'),
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'test.jpg',
            fileStatus: 'complete',
            s3Bucket: 'my-bucket',
            detectedContentType: 'image/jpeg'
          }
        }
      })

      expect(status.form.file.s3Key).toEqual(expect.any(String))
      expect(status.form.file.fileId).toEqual(expect.any(String))
      expect(status.form.file.contentLength).toBeGreaterThan(0)
    },
    oneMinute
  )

  test(
    'post upload without filename header with a clean file should eventually return a ready status',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket'
      })

      // upload a file
      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        body: fs.createReadStream('./src/__fixtures__/files/test.jpg'),
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            fileStatus: 'complete',
            s3Bucket: 'my-bucket',
            detectedContentType: 'image/jpeg'
          }
        }
      })
      expect(status.form.file.filename).toBeUndefined()
      expect(status.form.file.s3Key).toEqual(expect.any(String))
      expect(status.form.file.fileId).toEqual(expect.any(String))
      expect(status.form.file.contentLength).toBeGreaterThan(0)
    },
    oneMinute
  )

  test(
    'download request with a clean file should eventually return a ready status',
    async () => {
      const initBody = await initUpload(server, {
        s3Bucket: 'my-bucket',
        downloadUrls: ['http://localhost:4566/my-bucket/test.jpg']
      })

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'test.jpg',
            contentType: 'image/jpeg',
            detectedContentType: 'image/jpeg',
            fileStatus: 'complete',
            s3Bucket: 'my-bucket',
            downloadUrl: 'http://localhost:4566/my-bucket/test.jpg'
          }
        }
      })

      expect(status.form.file.s3Key).toEqual(expect.any(String))
      expect(status.form.file.fileId).toEqual(expect.any(String))
      expect(status.form.file.contentLength).toBeGreaterThan(0)
    },
    oneMinute
  )

  test(
    'upload with a mock virus file should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket'
      })

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

      const status = await waitForReady(server, initBody.statusUrl)

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
    oneMinute
  )

  test(
    'post upload with a mock virus file should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket'
      })

      // upload a file
      const formData = new FormData()
      formData.append('foo', 'bar')
      formData.append('id', '1234')
      formData.append(
        'file',
        fs.createReadStream('./src/__fixtures__/files/virus.jpg')
      )

      // upload a file
      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        headers: {
          'x-filename': 'virus.jpg'
        },
        body: fs.createReadStream('./src/__fixtures__/files/virus.jpg'),
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'virus.jpg',
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
    oneMinute
  )

  test(
    'download request with a mock virus file should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        s3Bucket: 'my-bucket',
        downloadUrls: ['http://localhost:4566/my-bucket/virus.jpg']
      })

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
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
    oneMinute
  )

  test(
    'upload with a file that is too big should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket',
        maxFileSize: 10
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

      const status = await waitForReady(server, initBody.statusUrl)

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
    oneMinute
  )

  test(
    'post upload with a file that is too big should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket',
        maxFileSize: 10
      })

      // upload a file
      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        headers: {
          'x-filename': 'test.jpg'
        },
        body: fs.createReadStream('./src/__fixtures__/files/test.jpg'),
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'test.jpg',
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
    oneMinute
  )

  test(
    'download request with a file that is too big should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        downloadUrls: ['http://localhost:4566/my-bucket/test.jpg'],
        s3Bucket: 'my-bucket',
        maxFileSize: 10
      })

      const status = await waitForReady(server, initBody.statusUrl)

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
    oneMinute
  )

  test(
    'upload with a file that is the wrong mime type should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket',
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

      const status = await waitForReady(server, initBody.statusUrl)

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
    oneMinute
  )

  test(
    'post upload with a file that is the wrong mime type should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket',
        mimeTypes: ['text/plain', 'text/json']
      })

      // upload a file
      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        headers: {
          'x-filename': 'test.jpg'
        },
        body: fs.createReadStream('./src/__fixtures__/files/test.jpg'),
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'test.jpg',
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
    oneMinute
  )

  test(
    'download request with a file that is the wrong mime type should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        downloadUrls: ['http://localhost:4566/my-bucket/test.jpg'],
        s3Bucket: 'my-bucket',
        mimeTypes: ['text/plain', 'text/json']
      })

      const status = await waitForReady(server, initBody.statusUrl)

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
    oneMinute
  )

  test(
    'upload with a file that is zero length should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket'
      })

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

      const status = await waitForReady(server, initBody.statusUrl)

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
    oneMinute
  )

  test(
    'post upload with a file that is zero length should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        redirect: 'http://localhost/redirect',
        s3Bucket: 'my-bucket'
      })

      // upload a file
      const uploadResult = await fetch(initBody.uploadUrl, {
        method: 'POST',
        headers: {
          'x-filename': 'zero.txt'
        },
        body: fs.createReadStream('./src/__fixtures__/files/zero.txt'),
        redirect: 'manual'
      })

      expect(uploadResult.status).toBe(302)

      const status = await waitForReady(server, initBody.statusUrl)

      expect(status).toMatchObject({
        uploadStatus: 'ready',
        form: {
          file: {
            filename: 'zero.txt',
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
    oneMinute
  )

  test(
    'download request with a file that is zero length should be rejected',
    async () => {
      const initBody = await initUpload(server, {
        downloadUrls: ['http://localhost:4566/my-bucket/zero.txt'],
        s3Bucket: 'my-bucket'
      })

      const status = await waitForReady(server, initBody.statusUrl)

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
    oneMinute
  )

  test(
    'download request with a upload attempt should be prevented',
    async () => {
      const initBody = await initUpload(server, {
        downloadUrls: ['http://localhost:4566/my-bucket/zero.txt'],
        s3Bucket: 'my-bucket'
      })

      const status = await waitForReady(server, initBody.statusUrl)

      // upload a file
      const formData = new FormData()
      formData.append('foo', 'bar-clean')
      formData.append('id', '1234-clean')
      formData.append(
        'file',
        fs.createReadStream('./src/__fixtures__/files/test.jpg')
      )

      const uploadResult = await fetch(
        `http://localhost:7337/upload-and-scan/${initBody.uploadId}`,
        {
          method: 'POST',
          body: formData,
          redirect: 'manual'
        }
      )

      expect(uploadResult.status).toBe(403)

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
    oneMinute
  )
})

/**
 *
 * @param {Server} server
 * @param {object} initiateRequest
 * @returns {Promise<any>}
 */
async function initUpload(server, initiateRequest) {
  const initResult = await server.inject({
    method: 'post',
    url: '/initiate',
    payload: initiateRequest
  })

  expect(initResult.statusCode).toBe(201)

  const initBody = JSON.parse(initResult.payload)
  expect(initBody.uploadId).toEqual(expect.any(String))
  if (initiateRequest.downloadUrls) {
    expect(initBody.uploadUrl).toBeUndefined()
  } else {
    expect(initBody.uploadUrl).toEqual(expect.any(String))
  }
  expect(initBody.statusUrl).toEqual(expect.any(String))

  return initBody
}

/**
 * @param {Server} server
 * @param {string} statusUrl
 * @returns {Promise<*>}
 */
async function waitForReady(server, statusUrl) {
  const oneSecond = 1000
  const maxRetries = 60
  let retries = 0
  let status

  while (retries < maxRetries) {
    const { payload } = await server.inject({
      method: 'get',
      url: statusUrl
    })
    status = JSON.parse(payload)

    if (status.uploadStatus === 'ready') {
      break
    }

    await asyncSetTimeout(oneSecond)
    retries++
  }

  return status
}

/**
 * @import {Server} from '@hapi/hapi'
 */
