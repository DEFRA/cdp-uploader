import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { moveS3Object } from '~/src/server/common/helpers/s3/move-s3-object.js'
import { handleScanResult } from '~/src/server/scan/listener/handle-scan-result.js'
import { fileDetailsPendingFixture } from '~/src/__fixtures__/file-details-pending.js'
import { uploadDetailsReadyFixture } from '~/src/__fixtures__/upload-details-ready.js'
import { fileDetailsCompleteFixture } from '~/src/__fixtures__/file-details-complete.js'
import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message.js'
import { uploadDetailsPendingFixture } from '~/src/__fixtures__/upload-details-pending.js'
import { virusCheckMessageCleanFixture } from '~/src/__fixtures__/virus-check-message-clean.js'
import { processScanComplete } from '~/src/server/scan/listener/helpers/process-scan-complete.js'
import { virusCheckMessageInfectedFixture } from '~/src/__fixtures__/virus-check-message-infected.js'

jest.mock('~/src/server/common/helpers/sqs/delete-sqs-message.js')
jest.mock('~/src/server/scan/listener/helpers/process-scan-complete.js')
jest.mock('~/src/server/common/helpers/s3/move-s3-object.js')

describe('#handleScanResult', () => {
  const logger = createLogger()
  const mockFindUploadDetails = jest.fn()
  const mockFindFileDetails = jest.fn()
  const mockFindUploadAndFiles = jest.fn()
  const mockStoreFileDetails = jest.fn()
  const mockServer = {
    sqs: { name: 'mock Sqs' },
    redis: {
      findUploadDetails: mockFindUploadDetails,
      findFileDetails: mockFindFileDetails,
      findUploadAndFiles: mockFindUploadAndFiles,
      storeFileDetails: mockStoreFileDetails
    },
    logger
  }
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
  // @ts-expect-error mocking working as expected, type ignored
  const loggerChildSpy = jest.spyOn(logger, 'child').mockReturnValue(mockLogger)
  const mockMoveS3Object = jest.mocked(moveS3Object)

  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-04-29T14:10:00'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('When upload details are not found', () => {
    let result

    beforeEach(async () => {
      mockFindUploadDetails.mockResolvedValue(null)
      mockFindFileDetails.mockResolvedValue(fileDetailsCompleteFixture)

      result = await handleScanResult(
        virusCheckMessageCleanFixture,
        'mock-virus-scan-queue-url',
        mockServer
      )
    })

    test('Should set up child logger as expected', () => {
      expect(loggerChildSpy).toHaveBeenCalledTimes(1)
    })

    test('Should log expected error', () => {
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'No record of uploadId found in Redis for mock-id-895745/mock-key-2342353, ignoring scan result. May be expired'
      )
    })

    test('Should return "undefined"', () => {
      expect(result).toBeUndefined()
    })

    test('Should not have called process scan complete', () => {
      expect(processScanComplete).not.toHaveBeenCalled()
    })
  })

  describe('When file details are not found', () => {
    let result

    beforeEach(async () => {
      mockFindUploadDetails.mockResolvedValue(uploadDetailsReadyFixture)
      mockFindFileDetails.mockResolvedValue(null)

      result = await handleScanResult(
        virusCheckMessageCleanFixture,
        'mock-virus-scan-queue-url',
        mockServer
      )
    })

    test('Should set up child logger as expected', () => {
      expect(loggerChildSpy).toHaveBeenCalledTimes(1)
      expect(loggerChildSpy).toHaveBeenCalledWith({
        'cdp-uploader': {
          fileId: 'mock-key-2342353',
          fileIds: ['7507f65a-acb5-41f2-815f-719fbbd47ee5'],
          uploadId: 'f5aa7920-6c3d-4090-a0c5-a0002df2c285',
          uploadStatus: 'ready'
        }
      })
    })

    test('Should log expected error', () => {
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'uploadId mock-id-895745 - No record of mock-id-895745/mock-key-2342353 found in Redis, ignoring scan result. May be expired'
      )
    })

    test('Should return "undefined"', () => {
      expect(result).toBeUndefined()
    })

    test('Should not have called process scan complete', () => {
      expect(processScanComplete).not.toHaveBeenCalled()
    })
  })

  describe('When file is "infected"', () => {
    let result

    beforeEach(async () => {
      // Copies needed due to mutations within the file being tested
      const uploadDetailsPendingFixtureCopy = { ...uploadDetailsPendingFixture }
      const fileDetailsPendingFixtureCopy = { ...fileDetailsPendingFixture }

      mockFindUploadDetails.mockResolvedValue(uploadDetailsPendingFixtureCopy)
      mockFindFileDetails.mockResolvedValue(fileDetailsPendingFixtureCopy)
      mockFindUploadAndFiles.mockResolvedValue({
        files: [fileDetailsPendingFixture],
        uploadDetails: uploadDetailsPendingFixture
      })

      result = await handleScanResult(
        virusCheckMessageInfectedFixture,
        'mock-virus-scan-queue-url',
        mockServer
      )
    })

    test('Should set up child logger as expected', () => {
      expect(loggerChildSpy).toHaveBeenCalledTimes(1)
      expect(loggerChildSpy).toHaveBeenNthCalledWith(1, {
        'cdp-uploader': {
          fileId: 'mock-key-87678',
          fileIds: ['d3e1ccfa-3f58-435d-af9a-dad7b20ab11b'],
          uploadId: 'ba0a64c7-8b1c-4237-9256-b9c4a3c8fe68',
          uploadStatus: 'pending'
        }
      })
    })

    test('Should store file details', () => {
      expect(mockStoreFileDetails).toHaveBeenCalledTimes(1)
      expect(mockStoreFileDetails).toHaveBeenCalledWith('mock-key-87678', {
        detectedContentType: 'image/webp',
        contentLength: 25624,
        contentType: 'image/jpeg',
        errorMessage: 'The selected file contains a virus',
        fileId: 'd3e1ccfa-3f58-435d-af9a-dad7b20ab11b',
        fileStatus: 'rejected',
        filename: 'shoot.jpg',
        hasError: true,
        pending: '2024-04-29T13:41:47.466Z',
        scanned: '2024-04-29T14:10:00.000Z',
        uploadId: 'ba0a64c7-8b1c-4237-9256-b9c4a3c8fe68',
        checksumSha256: 'bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c='
      })
    })

    test('Should log expected info', () => {
      expect(mockLogger.info).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Virus found. Message: contains super ugly horrible virus!'
      )
    })

    test('Should delete Sqs message', () => {
      expect(deleteSqsMessage).toHaveBeenCalledTimes(1)
      expect(deleteSqsMessage).toHaveBeenCalledWith(
        { name: 'mock Sqs' },
        'mock-virus-scan-queue-url',
        '123456-78910'
      )
    })

    test('Should call process scan complete with expected values', () => {
      expect(processScanComplete).toHaveBeenCalledTimes(1)
      expect(processScanComplete).toHaveBeenCalledWith(
        'mock-id-34543',
        'mock-key-87678',
        mockServer
      )
    })

    test('Should return "undefined"', () => {
      expect(result).toBeUndefined()
    })
  })

  describe('When file is "clean" and has been delivered', () => {
    let result

    beforeEach(async () => {
      // Copies needed due to mutations within the file being tested
      const uploadDetailsPendingFixtureCopy = { ...uploadDetailsPendingFixture }
      const fileDetailsPendingFixtureCopy = { ...fileDetailsPendingFixture }

      mockFindUploadDetails.mockResolvedValue(uploadDetailsPendingFixtureCopy)
      mockFindFileDetails.mockResolvedValue(fileDetailsPendingFixtureCopy)
      mockFindUploadAndFiles.mockResolvedValue({
        files: [fileDetailsPendingFixture],
        uploadDetails: uploadDetailsPendingFixture
      })
      mockMoveS3Object.mockResolvedValue(true)

      result = await handleScanResult(
        virusCheckMessageCleanFixture,
        'mock-virus-scan-queue-url',
        mockServer
      )
    })

    test('Should set up child logger as expected', () => {
      expect(loggerChildSpy).toHaveBeenCalledTimes(1)
      expect(loggerChildSpy).toHaveBeenNthCalledWith(1, {
        'cdp-uploader': {
          fileId: 'mock-key-2342353',
          fileIds: ['d3e1ccfa-3f58-435d-af9a-dad7b20ab11b'],
          uploadId: 'ba0a64c7-8b1c-4237-9256-b9c4a3c8fe68',
          uploadStatus: 'pending'
        }
      })
    })

    test('Should store file details', () => {
      expect(mockStoreFileDetails).toHaveBeenCalledTimes(1)
      expect(mockStoreFileDetails).toHaveBeenCalledWith('mock-key-2342353', {
        uploadId: 'ba0a64c7-8b1c-4237-9256-b9c4a3c8fe68',
        fileId: 'd3e1ccfa-3f58-435d-af9a-dad7b20ab11b',
        fileStatus: 'complete',
        pending: '2024-04-29T13:41:47.466Z',
        detectedContentType: 'image/webp',
        contentLength: 25624,
        checksumSha256: 'bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=',
        contentType: 'image/jpeg',
        filename: 'shoot.jpg',
        scanned: '2024-04-29T14:10:00.000Z',
        delivered: '2024-04-29T14:10:00.000Z',
        s3Bucket: 'cdp-example-node-frontend',
        s3Key: '/plants/mock-id-895745/mock-key-2342353'
      })
    })

    test('Should delete Sqs message', () => {
      expect(deleteSqsMessage).toHaveBeenCalledTimes(1)
      expect(deleteSqsMessage).toHaveBeenCalledWith(
        { name: 'mock Sqs' },
        'mock-virus-scan-queue-url',
        '78910-123456'
      )
    })

    test('Should log expected info', () => {
      expect(mockLogger.info).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'File mock-key-2342353 was delivered to cdp-example-node-frontend//plants/mock-id-895745/mock-key-2342353'
      )
    })

    test('Should call process scan complete with expected values', () => {
      expect(processScanComplete).toHaveBeenCalledTimes(1)
      expect(processScanComplete).toHaveBeenCalledWith(
        'mock-id-895745',
        'mock-key-2342353',
        mockServer
      )
    })

    test('Should return "undefined"', () => {
      expect(result).toBeUndefined()
    })
  })

  describe('When file is "clean" and has NOT been delivered', () => {
    let result

    beforeEach(async () => {
      // Copies needed due to mutations within the file being tested
      const uploadDetailsPendingFixtureCopy = { ...uploadDetailsPendingFixture }
      const fileDetailsPendingFixtureCopy = { ...fileDetailsPendingFixture }

      mockFindUploadDetails.mockResolvedValue(uploadDetailsPendingFixtureCopy)
      mockFindFileDetails.mockResolvedValue(fileDetailsPendingFixtureCopy)
      mockFindUploadAndFiles.mockResolvedValue({
        files: [fileDetailsPendingFixture],
        uploadDetails: uploadDetailsPendingFixture
      })
      mockMoveS3Object.mockResolvedValue(false)

      result = await handleScanResult(
        virusCheckMessageCleanFixture,
        'mock-virus-scan-queue-url',
        mockServer
      )
    })

    test('Should set up child logger as expected', () => {
      expect(loggerChildSpy).toHaveBeenCalledTimes(1)
      expect(loggerChildSpy).toHaveBeenNthCalledWith(1, {
        'cdp-uploader': {
          fileId: 'mock-key-2342353',
          fileIds: ['d3e1ccfa-3f58-435d-af9a-dad7b20ab11b'],
          uploadId: 'ba0a64c7-8b1c-4237-9256-b9c4a3c8fe68',
          uploadStatus: 'pending'
        }
      })
    })

    test('Should not store file details', () => {
      expect(mockStoreFileDetails).not.toHaveBeenCalled()
    })

    test('Should not delete Sqs message', () => {
      expect(deleteSqsMessage).not.toHaveBeenCalled()
    })

    test('Should log expected error', () => {
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'File mock-key-2342353 could not be delivered to cdp-example-node-frontend//plants/mock-id-895745/mock-key-2342353'
      )
    })

    test('Should call process scan complete with expected values', () => {
      expect(processScanComplete).toHaveBeenCalledTimes(1)
      expect(processScanComplete).toHaveBeenCalledWith(
        'mock-id-895745',
        'mock-key-2342353',
        mockServer
      )
    })

    test('Should return "undefined"', () => {
      expect(result).toBeUndefined()
    })
  })
})
