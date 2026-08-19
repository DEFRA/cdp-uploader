import { jest } from '@jest/globals'
import { Upload } from '@aws-sdk/lib-storage'
import { uploadFile } from '~/src/server/upload-and-scan/helpers/upload-file.js'
import { findS3ContentLength } from '~/src/server/common/helpers/s3/find-s3-content-length.js'

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation((options) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const body = options.params.Body
    return {
      done: () =>
        new Promise((resolve, reject) => {
          body.once('error', reject)
          body.once('finish', () =>
            resolve({ ChecksumSHA256: 'fake-checksum' })
          )
        })
    }
  })
}))

jest.mock('file-type', () => ({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  fromBuffer: jest.fn().mockResolvedValue({ mime: 'text/plain' })
}))

jest.mock('~/src/server/common/helpers/s3/find-s3-content-length.js', () => ({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  findS3ContentLength: jest.fn().mockResolvedValue(999)
}))

// A minimal fake of the readable file stream uploadFile expects: enough to
// register/trigger handlers by hand, without any real Node stream machinery.
function createFakeFileStream() {
  const handlers = {}
  return {
    on: jest.fn((event, cb) => {
      handlers[event] = cb
    }),
    pause: jest.fn(),
    resume: jest.fn(),
    emit: (event, ...args) => handlers[event]?.(...args)
  }
}

describe('#uploadFile', () => {
  const mockS3Client = {}
  const metadata = { contentType: 'text/plain' }
  const fileLogger = {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }

  const mockUpload = jest.mocked(Upload)

  beforeEach(() => {
    fileLogger.warn.mockClear()
  })

  test('does not throw when contentLength is missing (null)', async () => {
    const fileStream = createFakeFileStream()

    const promise = uploadFile(
      mockS3Client,
      'bucket',
      'key',
      fileStream,
      null,
      metadata,
      fileLogger
    )
    fileStream.emit('end')

    await expect(promise).resolves.toMatchObject({ fileLength: 999 })
  })

  test('sends ContentLength as a number, not a string, when it is known', async () => {
    const fileStream = createFakeFileStream()

    const promise = uploadFile(
      mockS3Client,
      'bucket',
      'key',
      fileStream,
      12345,
      metadata,
      fileLogger
    )
    fileStream.emit('end')
    await promise

    const { ContentLength } = mockUpload.mock.calls[0][0].params
    expect(ContentLength).toBe(12345)
    expect(typeof ContentLength).toBe('number')
  })

  test('propagates a source stream error instead of hanging forever', async () => {
    const fileStream = createFakeFileStream()

    const promise = uploadFile(
      mockS3Client,
      'bucket',
      'key',
      fileStream,
      null,
      metadata,
      fileLogger
    )

    fileStream.emit('error', new Error('boom'))

    await expect(promise).rejects.toThrow('boom')
  })

  test('falls back to the reported content length when HeadObject cannot verify it, without an extra warning', async () => {
    jest.mocked(findS3ContentLength).mockResolvedValueOnce(null)
    const fileStream = createFakeFileStream()

    const promise = uploadFile(
      mockS3Client,
      'bucket',
      'key',
      fileStream,
      12345,
      metadata,
      fileLogger
    )
    fileStream.emit('end')

    await expect(promise).resolves.toMatchObject({ fileLength: 12345 })
    expect(fileLogger.warn).not.toHaveBeenCalled()
  })

  test('warns when neither HeadObject nor the upload-time value has a content length', async () => {
    jest.mocked(findS3ContentLength).mockResolvedValueOnce(null)
    const fileStream = createFakeFileStream()

    const promise = uploadFile(
      mockS3Client,
      'bucket',
      'key',
      fileStream,
      null,
      metadata,
      fileLogger
    )
    fileStream.emit('end')

    await expect(promise).resolves.toMatchObject({ fileLength: null })
    expect(fileLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to determine content length')
    )
  })

  test('warns but trusts the S3-verified length when it disagrees with the reported length', async () => {
    jest.mocked(findS3ContentLength).mockResolvedValueOnce(999)
    const fileStream = createFakeFileStream()

    const promise = uploadFile(
      mockS3Client,
      'bucket',
      'key',
      fileStream,
      12345,
      metadata,
      fileLogger
    )
    fileStream.emit('end')

    await expect(promise).resolves.toMatchObject({ fileLength: 999 })
    expect(fileLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Content length mismatch')
    )
  })

  test('does not warn when the S3-verified length matches the reported length', async () => {
    jest.mocked(findS3ContentLength).mockResolvedValueOnce(12345)
    const fileStream = createFakeFileStream()

    const promise = uploadFile(
      mockS3Client,
      'bucket',
      'key',
      fileStream,
      12345,
      metadata,
      fileLogger
    )
    fileStream.emit('end')

    await expect(promise).resolves.toMatchObject({ fileLength: 12345 })
    expect(fileLogger.warn).not.toHaveBeenCalled()
  })
})
