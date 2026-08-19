import { findS3ContentLength } from '~/src/server/common/helpers/s3/find-s3-content-length.js'

describe('#findS3ContentLength', () => {
  const bucket = 'quarantine-bucket'
  const key = 'upload-id/file-id'
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn()
  }
  const mockS3Client = {
    send: jest.fn()
  }

  beforeAll(() => {
    jest.useFakeTimers()
  })

  beforeEach(() => {
    // mockReset (not mockClear) so no test's default mock implementation can
    // leak into another test once the number of retry attempts changes.
    jest.resetAllMocks()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  test('returns content length on first attempt', async () => {
    mockS3Client.send.mockResolvedValue({ ContentLength: 12345 })

    const result = await findS3ContentLength(
      mockS3Client,
      bucket,
      key,
      mockLogger
    )

    expect(result).toBe(12345)
    expect(mockS3Client.send).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn).not.toHaveBeenCalled()
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('retries once and succeeds, logging warn with structured details', async () => {
    const firstError = {
      name: 'AccessDenied',
      $metadata: { requestId: 'request-1', httpStatusCode: 403 }
    }
    mockS3Client.send
      .mockRejectedValueOnce(firstError)
      .mockResolvedValueOnce({ ContentLength: 54321 })

    const resultPromise = findS3ContentLength(
      mockS3Client,
      bucket,
      key,
      mockLogger
    )

    await Promise.resolve()
    await jest.runAllTimersAsync()

    const result = await resultPromise

    expect(result).toBe(54321)
    expect(mockS3Client.send).toHaveBeenCalledTimes(2)
    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      firstError,
      expect.stringContaining(
        `HeadObject failed for ${bucket}/${key} (attempt 1/10)`
      )
    )
    expect(mockLogger.warn.mock.calls[0][1]).toEqual(
      expect.stringContaining('requestId=request-1')
    )
    expect(mockLogger.warn.mock.calls[0][1]).toEqual(
      expect.stringContaining('httpStatusCode=403')
    )
    expect(mockLogger.warn.mock.calls[0][1]).toEqual(
      expect.stringContaining('code=AccessDenied')
    )
  })

  test('returns null after retries are exhausted and logs each failed attempt', async () => {
    const totalAttempts = 10
    const errors = Array.from({ length: totalAttempts }, (_, i) => ({
      Code: 'ExpiredToken',
      $metadata: { requestId: `request-${i + 1}`, httpStatusCode: 403 }
    }))

    errors.forEach((error) => mockS3Client.send.mockRejectedValueOnce(error))

    const resultPromise = findS3ContentLength(
      mockS3Client,
      bucket,
      key,
      mockLogger
    )

    await Promise.resolve()
    await jest.runAllTimersAsync()

    const result = await resultPromise

    expect(result).toBeNull()
    expect(mockS3Client.send).toHaveBeenCalledTimes(totalAttempts)
    expect(mockLogger.warn).toHaveBeenCalledTimes(totalAttempts - 1)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)

    errors.slice(0, -1).forEach((error, i) => {
      expect(mockLogger.warn).toHaveBeenNthCalledWith(
        i + 1,
        error,
        expect.stringContaining(
          `HeadObject failed for ${bucket}/${key} (attempt ${i + 1}/${totalAttempts})`
        )
      )
      expect(mockLogger.warn.mock.calls[i][1]).toEqual(
        expect.stringContaining(`requestId=request-${i + 1}`)
      )
    })

    const lastError = errors[errors.length - 1]
    expect(mockLogger.error).toHaveBeenCalledWith(
      lastError,
      expect.stringContaining(
        `HeadObject failed for ${bucket}/${key} (attempt ${totalAttempts}/${totalAttempts})`
      )
    )
    expect(mockLogger.error.mock.calls[0][1]).toEqual(
      expect.stringContaining(`requestId=request-${totalAttempts}`)
    )
  })
})
