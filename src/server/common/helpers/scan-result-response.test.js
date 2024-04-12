import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response'

describe('#toScanResultResponse', () => {
  test('formats the redis data into a scan result callback', () => {
    const uploadId = '123'
    const redisData = {
      files: {
        fileId1: {
          fileId: 'fileId1',
          fileStatus: 'pending',
          contentType: 'image/jpeg',
          filename: 'file1.jpg',
          s3Bucket: 'bucket1',
          s3Key: 'key1'
        },
        fileId2: {
          fileId: 'fileId2',
          fileStatus: 'completed',
          contentType: 'image/png',
          filename: 'file2.png',
          s3Bucket: 'bucket2',
          s3Key: 'key2'
        }
      },
      uploadStatus: 'ready',
      numberOfInfectedFiles: 0,
      successRedirect: 'https://success.com',
      failureRedirect: 'https://failure.com',
      scanResultCallbackUrl: 'https://callback.com',
      destinationBucket: 'destinationBucket',
      destinationPath: 'destinationPath',
      acceptedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 1024,
      fields: { field1: 'value1', field2: { fileId: 'fileId1' } },
      metadata: { meta1: 'data1', meta2: 'data2' }
    }

    const expectedResponse = {
      uploadStatus: 'ready',
      numberOfInfectedFiles: 0,
      successRedirect: 'https://success.com',
      failureRedirect: 'https://failure.com',
      scanResultCallbackUrl: 'https://callback.com',
      destinationBucket: 'destinationBucket',
      destinationPath: 'destinationPath',
      acceptedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 1024,
      files: [
        {
          uploadId: '123',
          fileId: 'fileId1',
          fileStatus: 'pending',
          contentType: 'image/jpeg',
          filename: 'file1.jpg',
          s3Bucket: 'bucket1',
          s3Key: 'key1'
        },
        {
          uploadId: '123',
          fileId: 'fileId2',
          fileStatus: 'completed',
          contentType: 'image/png',
          filename: 'file2.png',
          s3Bucket: 'bucket2',
          s3Key: 'key2'
        }
      ],
      fields: { field1: 'value1', field2: { fileId: 'fileId1' } },
      metadata: { meta1: 'data1', meta2: 'data2' }
    }

    const result = toScanResultResponse(uploadId, redisData)
    expect(result).toEqual(expectedResponse)
  })

  test('returns a valid value if there are no files', () => {
    const uploadId = '123'
    const redisData = {
      uploadStatus: 'ready',
      numberOfInfectedFiles: 0,
      successRedirect: 'https://success.com',
      failureRedirect: 'https://failure.com',
      scanResultCallbackUrl: 'https://callback.com',
      destinationBucket: 'destinationBucket',
      destinationPath: 'destinationPath',
      acceptedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 1024,
      fields: { field1: 'value1' },
      metadata: { meta1: 'data1', meta2: 'data2' }
    }

    const expectedResponse = {
      uploadStatus: 'ready',
      numberOfInfectedFiles: 0,
      successRedirect: 'https://success.com',
      failureRedirect: 'https://failure.com',
      scanResultCallbackUrl: 'https://callback.com',
      destinationBucket: 'destinationBucket',
      destinationPath: 'destinationPath',
      acceptedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 1024,
      files: [],
      fields: { field1: 'value1' },
      metadata: { meta1: 'data1', meta2: 'data2' }
    }

    const result = toScanResultResponse(uploadId, redisData)
    expect(result).toEqual(expectedResponse)
  })
})
