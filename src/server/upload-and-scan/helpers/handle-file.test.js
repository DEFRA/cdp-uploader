import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file.js'
import { jest } from '@jest/globals'

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
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    child: jest.fn(() => {
      return {
        error: jest.fn()
      }
    })
  }
  const mockRequest = {
    redis: {
      storeFileDetails: jest.fn()
    },
    logger: mockLogger,
    s3: {
      send: jest.fn()
    }
  }

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
        fileStatus: 'rejected'
      })
    )
  })
})
