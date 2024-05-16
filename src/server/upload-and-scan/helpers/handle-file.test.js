import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file'
import { uploadStream } from '~/src/server/upload-and-scan/helpers/upload-stream'

jest.mock('~/src/server/upload-and-scan/helpers/upload-stream')

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
  const mockRequest = {
    redis: {
      storeFileDetails: jest.fn().mockResolvedValue({})
    }
  }
  const mockLogger = {
    warn: jest.fn(),
    debug: jest.fn()
  }

  test('Should provide expected filePart', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    uploadStream.mockResolvedValue({
      Bucket: 'cdp-uploader-quarantine',
      fileTypeResult: {
        ext: 'jpg',
        mime: 'image/jpeg'
      },
      fileLength: 57573
    })

    expect(
      await handleFile(
        uploadId,
        mockUploadDetails(uploadId),
        'file-id-678910',
        {},
        mockRequest,
        mockLogger
      )
    ).toMatchObject({
      fileId: 'file-id-678910'
    })
  })

  test('Should reject empty files', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    uploadStream.mockResolvedValue({
      Bucket: 'cdp-uploader-quarantine',
      fileTypeResult: {
        ext: 'jpg',
        mime: 'image/jpeg'
      },
      fileLength: 0
    })

    expect(
      await handleFile(
        uploadId,
        mockUploadDetails(uploadId),
        'file-id-678910',
        {},
        mockRequest,
        mockLogger
      )
    ).toMatchObject({
      fileId: 'file-id-678910',
      missing: true
    })

    expect(mockRequest.redis.storeFileDetails).not.toHaveBeenCalled()
  })

  test('Should reject files that exceed the max size', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    uploadStream.mockResolvedValue({
      Bucket: 'cdp-uploader-quarantine',
      fileTypeResult: {
        ext: 'jpg',
        mime: 'image/jpeg'
      },
      fileLength: 1024 * 1024 * 2
    })

    expect(
      await handleFile(
        uploadId,
        {
          ...mockUploadDetails(uploadId),
          request: { maxFileSize: 1024 * 1024 }
        },
        'file-id-678910',
        {},
        mockRequest,
        mockLogger
      )
    ).toMatchObject({
      fileId: 'file-id-678910'
    })

    expect(mockRequest.redis.storeFileDetails).toHaveBeenLastCalledWith(
      'file-id-678910',
      expect.objectContaining({
        hasError: true,
        errorMessage: 'The selected file must be smaller than 1 MB',
        fileStatus: 'rejected'
      })
    )
  })

  test('Should reject files that exceed the max size and show the error in KB if its low enough', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    uploadStream.mockResolvedValue({
      Bucket: 'cdp-uploader-quarantine',
      fileTypeResult: {
        ext: 'jpg',
        mime: 'image/jpeg'
      },
      fileLength: 1000 * 1000 * 2
    })

    expect(
      await handleFile(
        uploadId,
        {
          ...mockUploadDetails(uploadId),
          request: { maxFileSize: 1000 * 256 }
        },
        'file-id-678910',
        {},
        mockRequest,
        mockLogger
      )
    ).toMatchObject({
      fileId: 'file-id-678910'
    })

    expect(mockRequest.redis.storeFileDetails).toHaveBeenLastCalledWith(
      'file-id-678910',
      expect.objectContaining({
        hasError: true,
        errorMessage: 'The selected file must be smaller than 250 KB',
        fileStatus: 'rejected'
      })
    )
  })

  test('Should reject files that are not the correct mime type', async () => {
    const uploadId = 'upload-id-6a38-4350-b0e1-b571b839d902'

    uploadStream.mockResolvedValue({
      Bucket: 'cdp-uploader-quarantine',
      fileTypeResult: {
        ext: 'jpg',
        mime: 'image/jpeg'
      },
      fileLength: 1001
    })

    expect(
      await handleFile(
        uploadId,
        {
          ...mockUploadDetails(uploadId),
          request: {
            mimeTypes: ['image/gif']
          }
        },
        'file-id-678910',
        {},
        mockRequest,
        mockLogger
      )
    ).toMatchObject({
      fileId: 'file-id-678910'
    })

    expect(mockRequest.redis.storeFileDetails).toHaveBeenLastCalledWith(
      'file-id-678910',
      expect.objectContaining({
        hasError: true,
        errorMessage: 'The selected file must be a image/gif',
        fileStatus: 'rejected'
      })
    )
  })
})
