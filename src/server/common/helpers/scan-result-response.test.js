import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response.js'
import { uploadDetailsSuccessFixture } from '~/src/__fixtures__/upload-details-success.js'
import { uploadDetailsRejectedVirusFixture } from '~/src/__fixtures__/upload-details-rejected-virus.js'
import { fileDetailsRejectedVirusFixture } from '~/src/__fixtures__/file-details-rejected-virus.js'
import { fileDetailsCompleteFixture } from '~/src/__fixtures__/file-details-complete.js'

describe('#toScanResultResponse', () => {
  test('Should provide expected response with debug enabled for non rejected upload', () => {
    expect(
      toScanResultResponse(
        uploadDetailsSuccessFixture.uploadId,
        uploadDetailsSuccessFixture,
        [fileDetailsCompleteFixture],
        true
      )
    ).toEqual({
      uploadStatus: 'ready',
      numberOfRejectedFiles: 0,
      debug: {
        request: {
          s3Bucket: 'cdp-example-node-frontend',
          s3Path: '/plants',
          redirect:
            'http://redirect.com/plants/add/status-poller?uploadId=683a2187-9977-4a3f-b62f-dfa621bcedb2',
          metadata: {
            plantId: '08e7045b-3f7a-4481-ba41-f301a99308b6'
          }
        }
      },
      form: {
        button: 'upload',
        file: {
          filename: 'shoot.jpg',
          contentType: 'image/jpeg',
          checksumSha256: 'bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=',
          contentLength: 25624,
          detectedContentType: 'image/webp',
          fileId: '7507f65a-acb5-41f2-815f-719fbbd47ee5',
          fileStatus: 'complete',
          s3Bucket: 'cdp-example-node-frontend',
          s3Key:
            '/plants/f5aa7920-6c3d-4090-a0c5-a0002df2c285/7507f65a-acb5-41f2-815f-719fbbd47ee5'
        }
      },
      metadata: {
        plantId: '08e7045b-3f7a-4481-ba41-f301a99308b6'
      }
    })
  })

  test('Should provide expected response with debug disabled for non rejected upload', () => {
    expect(
      toScanResultResponse(
        uploadDetailsSuccessFixture.uploadId,
        uploadDetailsSuccessFixture,
        [fileDetailsCompleteFixture]
      )
    ).toEqual({
      uploadStatus: 'ready',
      numberOfRejectedFiles: 0,
      form: {
        button: 'upload',
        file: {
          filename: 'shoot.jpg',
          contentType: 'image/jpeg',
          checksumSha256: 'bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=',
          contentLength: 25624,
          detectedContentType: 'image/webp',
          fileId: '7507f65a-acb5-41f2-815f-719fbbd47ee5',
          fileStatus: 'complete',
          s3Bucket: 'cdp-example-node-frontend',
          s3Key:
            '/plants/f5aa7920-6c3d-4090-a0c5-a0002df2c285/7507f65a-acb5-41f2-815f-719fbbd47ee5'
        }
      },
      metadata: {
        plantId: '08e7045b-3f7a-4481-ba41-f301a99308b6'
      }
    })
  })

  test('Should provide expected response with debug enabled for rejected with virus upload', () => {
    expect(
      toScanResultResponse(
        uploadDetailsRejectedVirusFixture.uploadId,
        uploadDetailsRejectedVirusFixture,
        [fileDetailsRejectedVirusFixture],
        true
      )
    ).toEqual({
      debug: {
        request: {
          metadata: {
            plantId: '94f8a562-630c-4569-b3a3-2503408c4129'
          },
          redirect:
            'http://redirect.com/plants/add/status-poller?uploadId=619cdb5b-31b2-4747-9d7b-2bd447a1f7d7',
          s3Bucket: 'cdp-example-node-frontend',
          s3Path: '/plants'
        }
      },
      form: {
        button: 'upload',
        file: {
          fileId: 'f45d0dd4-dd3f-4235-9c45-da2edd5c89fd',
          detectedContentType: 'image/jpeg',
          contentLength: 10503,
          contentType: 'image/jpeg',
          errorMessage: 'The selected file contains a virus',
          fileStatus: 'rejected',
          filename: 'succulant.jpeg',
          checksumSha256: 'bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=',
          hasError: true
        }
      },
      metadata: {
        plantId: '94f8a562-630c-4569-b3a3-2503408c4129'
      },
      numberOfRejectedFiles: 1,
      uploadStatus: 'ready'
    })
  })

  test('Should provide expected response with debug disabled for rejected with virus upload', () => {
    expect(
      toScanResultResponse(
        uploadDetailsRejectedVirusFixture.uploadId,
        uploadDetailsRejectedVirusFixture,
        [fileDetailsRejectedVirusFixture],
        false
      )
    ).toEqual({
      form: {
        button: 'upload',
        file: {
          fileId: 'f45d0dd4-dd3f-4235-9c45-da2edd5c89fd',
          detectedContentType: 'image/jpeg',
          contentLength: 10503,
          contentType: 'image/jpeg',
          errorMessage: 'The selected file contains a virus',
          fileStatus: 'rejected',
          filename: 'succulant.jpeg',
          checksumSha256: 'bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=',
          hasError: true
        }
      },
      metadata: {
        plantId: '94f8a562-630c-4569-b3a3-2503408c4129'
      },
      numberOfRejectedFiles: 1,
      uploadStatus: 'ready'
    })
  })
})
