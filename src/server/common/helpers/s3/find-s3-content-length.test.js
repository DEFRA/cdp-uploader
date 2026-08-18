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
    jest.clearAllMocks()
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
      expect.objectContaining({
        err: firstError,
        bucket,
        key,
        attempt: 1,
        retries: 3,
        awsRequestId: 'request-1',
        httpStatusCode: 403,
        awsErrorCode: 'AccessDenied'
      }),
      `HeadObject failed for ${bucket}/${key} (attempt 1/3)`
    )
  })

  test('returns null after retries are exhausted and logs each failed attempt', async () => {
    const firstError = {
      Code: 'ExpiredToken',
      $metadata: { requestId: 'request-1', httpStatusCode: 403 }
    }
    const secondError = {
      Code: 'ExpiredToken',
      $metadata: { requestId: 'request-2', httpStatusCode: 403 }
    }
    const thirdError = {
      Code: 'ExpiredToken',
      $metadata: { requestId: 'request-3', httpStatusCode: 403 }
    }

    mockS3Client.send
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)
      .mockRejectedValueOnce(thirdError)

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
    expect(mockS3Client.send).toHaveBeenCalledTimes(3)
    expect(mockLogger.warn).toHaveBeenCalledTimes(2)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        attempt: 1,
        retries: 3,
        awsRequestId: 'request-1',
        httpStatusCode: 403,
        awsErrorCode: 'ExpiredToken'
      }),
      `HeadObject failed for ${bucket}/${key} (attempt 1/3)`
    )
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        attempt: 2,
        retries: 3,
        awsRequestId: 'request-2',
        httpStatusCode: 403,
        awsErrorCode: 'ExpiredToken'
      }),
      `HeadObject failed for ${bucket}/${key} (attempt 2/3)`
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: thirdError,
        bucket,
        key,
        attempt: 3,
        retries: 3,
        awsRequestId: 'request-3',
        httpStatusCode: 403,
        awsErrorCode: 'ExpiredToken'
      }),
      `HeadObject failed for ${bucket}/${key} (attempt 3/3)`
    )
  })
})
