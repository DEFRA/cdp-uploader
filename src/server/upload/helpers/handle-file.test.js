import { handleFile } from '~/src/server/upload/helpers/handle-file'
import { uploadStream } from '~/src/server/upload/helpers/upload-stream'

jest.mock('~/src/server/upload/helpers/upload-stream')

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

  test('Should provide expected filePart with error', async () => {
    const uploadId = 'upload-id-9164-47c2-9734-61a97663241e'

    uploadStream.mockResolvedValue({ fileLength: 0 })

    expect(
      await handleFile(
        uploadId,
        mockUploadDetails(uploadId),
        'file-id-12345',
        {},
        mockRequest,
        mockLogger
      )
    ).toEqual({
      actualContentType: undefined,
      fileId: 'file-id-12345',
      hasError: true,
      errorMessage: 'The selected file is empty'
    })
  })

  test('Should provide expected filePart without error', async () => {
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
      fileId: 'file-id-678910',
      hasError: false
    })
  })
})
