import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file'
import { uploadStream } from '~/src/server/upload-and-scan/helpers/upload-stream'

jest.mock('~/src/server/upload-and-scan/helpers/upload-stream')

describe('#handleFile', () => {
  const mockUploadDetails = (uploadId) => ({
    redirect: 'http://redirect.com',
    destinationBucket: 'cdp-example-node-frontend',
    destinationPath: '/mock-destination',
    metadata: {},
    uploadId,
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
    ).toEqual({
      actualContentType: 'image/jpeg',
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
    ).toEqual({
      actualContentType: 'image/jpeg',
      fileId: 'file-id-678910'
    })

    expect(mockRequest.redis.storeFileDetails).toHaveBeenLastCalledWith(
      'file-id-678910',
      expect.objectContaining({
        hasError: true,
        errorMessage: 'The selected file is empty',
        fileStatus: 'rejected'
      })
    )
  })

  test('Should reject files that exceed the max size', async () => {
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
        { ...mockUploadDetails(uploadId), maxFileSize: 999 },
        'file-id-678910',
        {},
        mockRequest,
        mockLogger
      )
    ).toEqual({
      actualContentType: 'image/jpeg',
      fileId: 'file-id-678910'
    })

    expect(mockRequest.redis.storeFileDetails).toHaveBeenLastCalledWith(
      'file-id-678910',
      expect.objectContaining({
        hasError: true,
        errorMessage: 'The selected file must be smaller than 999 bytes',
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
        { ...mockUploadDetails(uploadId), acceptedMimeTypes: ['image/gif'] },
        'file-id-678910',
        {},
        mockRequest,
        mockLogger
      )
    ).toEqual({
      actualContentType: 'image/jpeg',
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
