import { jest } from '@jest/globals'
import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file.js'
import { uploadFile } from '~/src/server/upload-and-scan/helpers/upload-file.js'
import { fileErrors } from '~/src/server/common/constants/file-errors.js'

jest.mock('~/src/server/upload-and-scan/helpers/upload-file.js', () => ({
  uploadFile: jest.fn()
}))

class Metrics {
  timer = jest.fn()
  counter = jest.fn()
  byteSize = jest.fn()
  millis = jest.fn()
}

describe('#handleFile', () => {
  const mockUploadDetails = (uploadId) => ({
    uploadId,
    request: {
      redirect: 'http://redirect.com',
      s3Bucket: 'cdp-example-node-frontend',
      s3Path: '/mock-destination',
      metadata: {}
    },
    uploadStatus: 'initiated',
    initiated: '2024-04-26T13:49:04.788Z',
    fields: {
      button: 'upload'
    },
    fileIds: []
  })
  const mockFileLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    child: jest.fn(() => mockFileLogger)
  }
  const mockRequest = {
    redis: {
      storeFileDetails: jest.fn()
    },
    logger: mockLogger,
    s3: {
      send: jest.fn()
    },
    metrics: () => new Metrics()
  }

  beforeEach(() => {
    jest.mocked(uploadFile).mockReset()
    mockFileLogger.warn.mockClear()
  })

  test('Should provide expected filePart', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    expect(
      await handleFile(
        uploadId,
        mockUploadDetails(uploadId),
        { filename: 'file-id-678910' },
        mockRequest
      )
    ).toMatchObject({
      filename: 'file-id-678910'
    })
  })

  test('Should reject empty files', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    expect(
      await handleFile(
        uploadId,
        mockUploadDetails(uploadId),
        { contentLength: 0 },
        mockRequest
      )
    ).toMatchObject({
      missing: true
    })

    expect(mockRequest.redis.storeFileDetails).not.toHaveBeenCalled()
  })

  test('Should reject files that exceed the max size', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    const { fileId } = await handleFile(
      uploadId,
      {
        ...mockUploadDetails(uploadId),
        request: { maxFileSize: 1000 * 1000 }
      },
      { contentLength: 1000 * 1000 + 1 },
      mockRequest
    )

    expect(mockRequest.redis.storeFileDetails).toHaveBeenLastCalledWith(
      fileId,
      expect.objectContaining({
        hasError: true,
        errorMessage: 'The selected file must be smaller than 1 MB',
        errorCode: fileErrors.tooBig.code,
        errorParams: {
          maxFileSize: 1000 * 1000,
          maxFileSizeFormatted: '1 MB'
        },
        fileStatus: 'rejected'
      })
    )
  })

  test('Should reject files that exceed the max size and show the error in KB if its low enough', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    const { fileId } = await handleFile(
      uploadId,
      {
        ...mockUploadDetails(uploadId),
        request: { maxFileSize: 256 * 1000 }
      },
      { contentLength: 2 * 1000 * 1000 },
      mockRequest
    )

    expect(mockRequest.redis.storeFileDetails).toHaveBeenLastCalledWith(
      fileId,
      expect.objectContaining({
        hasError: true,
        errorMessage: 'The selected file must be smaller than 256 kB',
        errorCode: fileErrors.tooBig.code,
        errorParams: {
          maxFileSize: 256 * 1000,
          maxFileSizeFormatted: '256 kB'
        },
        fileStatus: 'rejected'
      })
    )
  })

  test('Should reject files that are not the correct mime type', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    const { fileId } = await handleFile(
      uploadId,
      {
        ...mockUploadDetails(uploadId),
        request: {
          mimeTypes: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/csv',
            'application/vnd.oasis.opendocument.text',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/rtf',
            'text/plain',
            'application/pdf',
            'image/png'
          ]
        }
      },
      { headers: { 'content-type': 'image/jpeg' } },
      mockRequest
    )

    expect(mockRequest.redis.storeFileDetails).toHaveBeenLastCalledWith(
      fileId,
      expect.objectContaining({
        hasError: true,
        errorMessage:
          'The selected file must be a DOC, DOCX, CSV, ODT, XLSX, XLS, RTF, TXT, PDF or PNG',
        errorCode: fileErrors.wrongType.code,
        errorParams: {
          mimeTypes: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/csv',
            'application/vnd.oasis.opendocument.text',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/rtf',
            'text/plain',
            'application/pdf',
            'image/png'
          ],
          fileExtensions: [
            'DOC',
            'DOCX',
            'CSV',
            'ODT',
            'XLSX',
            'XLS',
            'RTF',
            'TXT',
            'PDF',
            'PNG'
          ]
        },
        fileStatus: 'rejected'
      })
    )
  })

  test('uses the S3-verified content length when HeadObject succeeds and matches', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'
    jest.mocked(uploadFile).mockResolvedValue({
      fileLength: 1234,
      detectedType: 'application/pdf',
      checksumSha256: 'fake-checksum'
    })

    const response = await handleFile(
      uploadId,
      mockUploadDetails(uploadId),
      { contentLength: 1234, fileStream: {} },
      mockRequest
    )

    expect(response.contentLength).toBe(1234)
    expect(mockFileLogger.warn).not.toHaveBeenCalled()
  })

  test('warns when HeadObject and the pre-upload content length disagree', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'
    jest.mocked(uploadFile).mockResolvedValue({
      fileLength: 999,
      detectedType: 'application/pdf',
      checksumSha256: 'fake-checksum'
    })

    const response = await handleFile(
      uploadId,
      mockUploadDetails(uploadId),
      { contentLength: 1234, fileStream: {} },
      mockRequest
    )

    expect(response.contentLength).toBe(999)
    expect(mockFileLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Content length mismatch for fileId')
    )
    expect(mockFileLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('HeadObject reported 999 bytes')
    )
    expect(mockFileLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('1234 bytes were reported at upload time')
    )
  })

  test('falls back to the pre-upload content length when HeadObject verification fails', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'
    jest.mocked(uploadFile).mockResolvedValue({
      fileLength: null,
      detectedType: 'application/pdf',
      checksumSha256: 'fake-checksum'
    })

    const response = await handleFile(
      uploadId,
      mockUploadDetails(uploadId),
      { contentLength: 1234, fileStream: {} },
      mockRequest
    )

    expect(response.contentLength).toBe(1234)
    expect(mockFileLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('falling back to the length reported')
    )
  })

  test('leaves content length undefined when neither S3 nor the pre-upload value is known', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'
    jest.mocked(uploadFile).mockResolvedValue({
      fileLength: null,
      detectedType: 'application/pdf',
      checksumSha256: 'fake-checksum'
    })

    const response = await handleFile(
      uploadId,
      mockUploadDetails(uploadId),
      { fileStream: {} },
      mockRequest
    )

    expect(response.contentLength).toBeUndefined()
    expect(mockFileLogger.warn).not.toHaveBeenCalled()
  })
})
