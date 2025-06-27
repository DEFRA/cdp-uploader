import * as fs from 'fs'
import { setTimeout as asyncSetTimeout } from 'node:timers/promises'

import fetch from 'node-fetch'
import FormData from 'form-data'

import { createServer } from '~/src/server/index.js'
import { config } from '~/src/config/index.js'

describe('#uploaderE2e', () => {
  const oneMinute = 60 * 1000
  let server

  beforeAll(async () => {
    config.set('mockVirusResultDelay', 0)

    server = await createServer()
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
    'upload with a clean file should eventually return a ready status',
    async () => {
      const initBody = await initUpload(server)

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
})

/**
 * @param {Server} server
 * @param {object} params
 * @returns {Promise<*>}
 */
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
