import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'
import { uploadDetailsSuccessFixture } from '~/src/__fixtures__/upload-success'
import { uploadDetailsRejectedVirusFixture } from '~/src/__fixtures__/upload-details-rejected-virus'
import { uploadDetailsRejectedEmptyFixture } from '~/src/__fixtures__/upload-details-rejected-empty'
import { fileDetailsRejectedEmptyFixture } from '~/src/__fixtures__/file-details-rejected-empty'
import { fileDetailsRejectedVirusFixture } from '~/src/__fixtures__/file-details-rejected-virus'
import { fileDetailsCompleteFixture } from '~/src/__fixtures__/file-complete-details'

describe('#toScanResultResponse', () => {
  test('Should provide expected response for non rejected upload', () => {
    expect(
      toScanResultResponse(
        uploadDetailsSuccessFixture.uploadId,
        uploadDetailsSuccessFixture,
        [fileDetailsCompleteFixture]
      )
    ).toEqual({
      destinationBucket: 'cdp-example-node-frontend',
      destinationPath: '/plants',
      fields: {
        button: 'upload',
        file: {
          actualContentType: 'image/webp',
          contentLength: 25624,
          contentType: 'image/jpeg',
          fileStatus: 'complete',
          filename: 'shoot.jpg',
          hasError: false,
          s3Bucket: 'cdp-example-node-frontend',
          s3Key:
            '683a2187-9977-4a3f-b62f-dfa621bcedb2/faf5ed64-cf0a-4708-a786-7c37e7d29aff'
        }
      },
      files: [
        {
          contentLength: 25624,
          contentType: 'image/jpeg',
          fileId: '7507f65a-acb5-41f2-815f-719fbbd47ee5',
          fileStatus: 'complete',
          filename: 'shoot.jpg',
          s3Bucket: 'cdp-example-node-frontend',
          s3Key:
            '/plants/f5aa7920-6c3d-4090-a0c5-a0002df2c285/7507f65a-acb5-41f2-815f-719fbbd47ee5',
          uploadId: '683a2187-9977-4a3f-b62f-dfa621bcedb2'
        }
      ],
      metadata: {
        plantId: '08e7045b-3f7a-4481-ba41-f301a99308b6'
      },
      numberOfRejectedFiles: 0,
      redirect:
        'http://redirect.com/plants/add/status-poller?uploadId=683a2187-9977-4a3f-b62f-dfa621bcedb2',
      uploadStatus: 'ready'
    })
  })

  test('Should provide expected response for rejected with virus upload', () => {
    expect(
      toScanResultResponse(
        uploadDetailsRejectedVirusFixture.uploadId,
        uploadDetailsRejectedVirusFixture,
        [fileDetailsRejectedVirusFixture]
      )
    ).toEqual({
      destinationBucket: 'cdp-example-node-frontend',
      destinationPath: '/plants',
      fields: {
        button: 'upload',
        file: {
          actualContentType: 'image/jpeg',
          contentLength: 10503,
          contentType: 'image/jpeg',
          errorMessage: 'The selected file contains a virus',
          fileStatus: 'complete',
          filename: 'succulant.jpeg',
          hasError: true
        }
      },
      files: [
        {
          contentLength: 10503,
          contentType: 'image/jpeg',
          fileId: 'f45d0dd4-dd3f-4235-9c45-da2edd5c89fd',
          fileStatus: 'complete',
          filename: 'succulant.jpeg',
          uploadId: '619cdb5b-31b2-4747-9d7b-2bd447a1f7d7'
        }
      ],
      metadata: {
        plantId: '94f8a562-630c-4569-b3a3-2503408c4129'
      },
      numberOfRejectedFiles: 1,
      redirect:
        'http://redirect.com/plants/add/status-poller?uploadId=619cdb5b-31b2-4747-9d7b-2bd447a1f7d7',
      uploadStatus: 'ready'
    })
  })

  test('Should provide expected response for rejected with empty file upload', () => {
    expect(
      toScanResultResponse(
        uploadDetailsRejectedEmptyFixture.uploadId,
        uploadDetailsRejectedEmptyFixture,
        [fileDetailsRejectedEmptyFixture]
      )
    ).toEqual({
      destinationBucket: 'cdp-example-node-frontend',
      destinationPath: '/plants',
      fields: {
        button: 'upload',
        file: {
          contentLength: 0,
          contentType: 'application/octet-stream',
          errorMessage: 'The selected file is empty',
          fileStatus: 'pending',
          hasError: true
        }
      },
      files: [
        {
          contentLength: 0,
          contentType: 'application/octet-stream',
          fileId: 'ecaa903f-373c-4591-8055-9814206df3a8',
          fileStatus: 'pending',
          uploadId: '58f10d6e-4b5e-4edc-8c80-5fda853bb6ac'
        }
      ],
      metadata: {
        plantId: '94f8a562-630c-4569-b3a3-2503408c4129'
      },
      redirect:
        'http://redirect.com/plants/add/status-poller?uploadId=58f10d6e-4b5e-4edc-8c80-5fda853bb6ac',
      uploadStatus: 'pending'
    })
  })
})
