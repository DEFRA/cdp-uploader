import Wreck from '@hapi/wreck'

import { createUploadLogger } from '~/src/server/common/helpers/logging/logger.js'
import { processScanComplete } from '~/src/server/scan/listener/helpers/process-scan-complete.js'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message.js'
import { fileStatus } from '~/src/server/common/constants/file-status.js'
import { handleFile } from '~/src/server/upload-and-scan/helpers/handle-file.js'
import { handleDownloadRequests } from '~/src/server/download-urls/listener/handle-download-requests.js'

jest.mock('@hapi/wreck', () => ({
  request: jest.fn(),
  read: jest.fn()
}))
jest.mock('~/src/server/common/helpers/logging/logger.js')
jest.mock('~/src/server/common/helpers/sqs/delete-sqs-message.js')
jest.mock('~/src/server/scan/listener/helpers/process-scan-complete.js')
jest.mock('~/src/server/upload-and-scan/helpers/handle-file.js', () => ({
  handleFile: jest.fn()
}))

describe('#handleDownloadRequests', () => {
  const mockFindUploadDetails = jest.fn()
  const mockStoreUploadDetails = jest.fn()

  class Metrics {
    timer = jest.fn()
    counter = jest.fn()
    byteSize = jest.fn()
    millis = jest.fn()
  }

  const metricsInstance = new Metrics()

  const mockServer = {
    sqs: { name: 'mock Sqs' },
    redis: {
      findUploadDetails: mockFindUploadDetails,
      storeUploadDetails: mockStoreUploadDetails
    },
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    },
    metrics: () => metricsInstance
  }

  const mockUploadLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }

  const mockHandleFile = jest.mocked(handleFile)
  const mockWreck = jest.mocked(Wreck)
  const mockCreateUploadLogger = jest.mocked(createUploadLogger)

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-04-29T14:10:00'))
    mockCreateUploadLogger.mockReturnValue(mockUploadLogger)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  const baseMessage = {
    ReceiptHandle: 'mock-receipt-handle',
    Body: JSON.stringify({ uploadId: 'mock-upload-id' })
  }

  describe('When upload details are not found', () => {
    beforeEach(async () => {
      mockFindUploadDetails.mockResolvedValue(null)

      await handleDownloadRequests(baseMessage, 'mock-queue-url', mockServer)
    })

    test('Should log and delete SQS message', () => {
      expect(mockUploadLogger.error).toHaveBeenCalledWith(
        'uploadId mock-upload-id not found. Deleting SQS message'
      )
      expect(deleteSqsMessage).toHaveBeenCalledWith(
        { name: 'mock Sqs' },
        'mock-queue-url',
        'mock-receipt-handle'
      )
    })
  })

  describe('When upload is already used (not initiated)', () => {
    beforeEach(async () => {
      mockFindUploadDetails.mockResolvedValue({
        uploadId: 'mock-upload-id',
        uploadStatus: 'ready',
        request: { downloadUrls: [] }
      })

      await handleDownloadRequests(baseMessage, 'mock-queue-url', mockServer)
    })

    test('Should log warning and delete SQS message', () => {
      expect(mockUploadLogger.warn).toHaveBeenCalledWith(
        'uploadId mock-upload-id has already been used to download files'
      )
      expect(deleteSqsMessage).toHaveBeenCalledTimes(1)
    })
  })

  describe('When there are no download URLs', () => {
    beforeEach(async () => {
      mockFindUploadDetails.mockResolvedValue({
        uploadId: 'mock-upload-id',
        uploadStatus: 'initiated',
        request: { downloadUrls: [] },
        fileIds: [],
        form: {}
      })

      await handleDownloadRequests(baseMessage, 'mock-queue-url', mockServer)
    })

    test('Should set uploadStatus to ready', () => {
      expect(mockStoreUploadDetails).toHaveBeenCalledWith(
        'mock-upload-id',
        expect.objectContaining({ uploadStatus: 'ready' })
      )
    })

    test('Should delete SQS message and increment counter', () => {
      expect(deleteSqsMessage).toHaveBeenCalledWith(
        { name: 'mock Sqs' },
        'mock-queue-url',
        'mock-receipt-handle'
      )
      expect(mockServer.metrics().counter).toHaveBeenCalledWith(
        'download-received'
      )
    })
  })

  describe('When download URL fetch fails (HTTP 404)', () => {
    beforeEach(async () => {
      const fakeStream = { statusCode: 404, headers: {}, on: jest.fn() }
      const fakeRead = jest.fn().mockResolvedValue(Buffer.from('Not found'))

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockWreck.request.mockResolvedValue(fakeStream)
      mockWreck.read.mockImplementation(fakeRead)

      mockFindUploadDetails.mockResolvedValue({
        uploadId: 'mock-upload-id',
        uploadStatus: 'initiated',
        request: { downloadUrls: ['http://example.com/test.jpg'] },
        fileIds: [],
        form: {}
      })

      mockHandleFile.mockResolvedValue({
        fileId: 'mock-file-id',
        filename: 'test.jpg',
        fileStatus: fileStatus.rejected
      })

      await handleDownloadRequests(baseMessage, 'mock-queue-url', mockServer)
    })

    test('Should log HTTP error and call handleFile with rejection info', () => {
      expect(mockUploadLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('HTTP 404 fetching http://example.com/test.jpg')
      )
    })

    test('Should trigger processScanComplete for rejected file', () => {
      expect(processScanComplete).toHaveBeenCalledWith(
        'mock-upload-id',
        'mock-file-id',
        mockServer
      )
    })

    test('Should delete SQS message and increment counter', () => {
      expect(deleteSqsMessage).toHaveBeenCalledTimes(1)
      expect(mockServer.metrics().counter).toHaveBeenCalledWith(
        'download-received'
      )
    })
  })

  describe('When download URL succeeds', () => {
    beforeEach(async () => {
      const fakeStream = {
        statusCode: 200,
        headers: {
          'content-type': 'image/jpeg',
          'content-length': '1024'
        },
        on: jest.fn()
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockWreck.request.mockResolvedValue(fakeStream)

      mockFindUploadDetails.mockResolvedValue({
        uploadId: 'mock-upload-id',
        uploadStatus: 'initiated',
        request: { downloadUrls: ['http://example.com/photo.jpg'] },
        fileIds: [],
        form: {}
      })

      mockHandleFile.mockResolvedValue({
        fileId: 'mock-file-id',
        filename: 'photo.jpg',
        fileStatus: fileStatus.complete
      })

      await handleDownloadRequests(baseMessage, 'mock-queue-url', mockServer)
    })

    test('Should call Wreck.request with expected arguments', () => {
      expect(Wreck.request).toHaveBeenCalledWith(
        'GET',
        'http://example.com/photo.jpg'
      )
    })

    test('Should store upload details twice (before and after processing)', () => {
      expect(mockStoreUploadDetails).toHaveBeenCalledTimes(2)
    })

    test('Should delete SQS message and increment metric counter', () => {
      expect(deleteSqsMessage).toHaveBeenCalledWith(
        { name: 'mock Sqs' },
        'mock-queue-url',
        'mock-receipt-handle'
      )
      expect(mockServer.metrics().counter).toHaveBeenCalledWith(
        'download-received'
      )
    })
  })
})
