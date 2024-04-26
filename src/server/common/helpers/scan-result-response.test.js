import {
  toScanResultResponse,
  updateFieldsResponse
} from '~/src/server/common/helpers/scan-result-response'

describe('#toScanResultResponse', () => {
  test('formats the redis data into a scan result callback', () => {
    const uploadId = '123'
    const uploadDetails = {
      uploadStatus: 'ready',
      numberOfInfectedFiles: 0,
      redirect: 'https://redirect.com',
      scanResultCallbackUrl: 'https://callback.com',
      destinationBucket: 'destinationBucket',
      destinationPath: 'destinationPath',
      fields: { field1: 'value1', field2: { fileId: 'fileId1' } },
      metadata: { meta1: 'data1', meta2: 'data2' }
    }
    const files = [
      {
        fileId: 'fileId1',
        fileStatus: 'pending',
        contentType: 'image/jpeg',
        contentLength: 10503,
        filename: 'file1.jpg',
        s3Bucket: 'bucket1',
        s3Key: 'key1'
      },
      {
        fileId: 'fileId2',
        fileStatus: 'completed',
        contentType: 'image/png',
        contentLength: 4564564,
        filename: 'file2.png',
        s3Bucket: 'bucket2',
        s3Key: 'key2'
      }
    ]

    const expectedResponse = {
      uploadStatus: 'ready',
      numberOfInfectedFiles: 0,
      redirect: 'https://redirect.com',
      scanResultCallbackUrl: 'https://callback.com',
      destinationBucket: 'destinationBucket',
      destinationPath: 'destinationPath',
      files: [
        {
          uploadId: '123',
          fileId: 'fileId1',
          fileStatus: 'pending',
          contentType: 'image/jpeg',
          contentLength: 10503,
          filename: 'file1.jpg',
          s3Bucket: 'bucket1',
          s3Key: 'key1'
        },
        {
          uploadId: '123',
          fileId: 'fileId2',
          fileStatus: 'completed',
          contentType: 'image/png',
          contentLength: 4564564,
          filename: 'file2.png',
          s3Bucket: 'bucket2',
          s3Key: 'key2'
        }
      ],
      fields: {
        field1: 'value1',
        field2: {
          contentLength: 10503,
          contentType: 'image/jpeg',
          fileStatus: 'pending',
          s3Bucket: 'bucket1',
          s3Key: 'key1'
        }
      },
      metadata: { meta1: 'data1', meta2: 'data2' }
    }

    const result = toScanResultResponse(uploadId, uploadDetails, files)
    expect(result).toEqual(expectedResponse)
  })

  test('returns a valid value if there are no files', () => {
    const uploadId = '123'
    const uploadDetails = {
      uploadStatus: 'ready',
      numberOfInfectedFiles: 0,
      redirect: 'https://redirect.com',
      scanResultCallbackUrl: 'https://callback.com',
      destinationBucket: 'destinationBucket',
      destinationPath: 'destinationPath',
      fields: { field1: 'value1' },
      metadata: { meta1: 'data1', meta2: 'data2' }
    }

    const expectedResponse = {
      uploadStatus: 'ready',
      numberOfInfectedFiles: 0,
      redirect: 'https://redirect.com',
      scanResultCallbackUrl: 'https://callback.com',
      destinationBucket: 'destinationBucket',
      destinationPath: 'destinationPath',
      files: [],
      fields: { field1: 'value1' },
      metadata: { meta1: 'data1', meta2: 'data2' }
    }

    const result = toScanResultResponse(uploadId, uploadDetails, [])
    expect(result).toEqual(expectedResponse)
  })
})

describe('#updateFieldsResponse', () => {
  test('updateField non-nested field', () => {
    const fields = {
      foo: 'bar',
      file: {
        fileId: '1111',
        fileName: 'a'
      },
      filelist: [
        { fileId: '2222', fileName: 'b' },
        { fileId: '3333', fileName: 'c' }
      ]
    }

    updateFieldsResponse(fields, [
      {
        fileId: '1111',
        s3Key: '1234-567',
        s3Bucket: 'foo',
        fileStatus: 'pending'
      }
    ])

    expect(fields.file).toEqual({
      fileName: 'a',
      fileStatus: 'pending',
      s3Key: '1234-567',
      s3Bucket: 'foo'
    })
  })

  test('updateFieldsResponse nested field', () => {
    const fields = {
      foo: 'bar',
      file: {
        fileId: '1111',
        fileName: 'a'
      },
      filelist: [
        { fileId: '2222', fileName: 'b' },
        { fileId: '3333', fileName: 'c' }
      ]
    }

    updateFieldsResponse(fields, [
      {
        fileId: '3333',
        s3Key: '9999-9999',
        s3Bucket: 'bar'
      }
    ])

    expect(fields.filelist[0]).toEqual({ fileName: 'b' })
    expect(fields.filelist[1]).toEqual({
      fileName: 'c',
      s3Key: '9999-9999',
      s3Bucket: 'bar'
    })
  })

  test('dont update missing field', () => {
    const fields = {
      foo: 'bar',
      file: {
        fileId: '1111',
        fileName: 'a'
      },
      filelist: [
        { fileId: '2222', fileName: 'b' },
        { fileId: '3333', fileName: 'c' }
      ]
    }

    updateFieldsResponse(fields, [
      {
        fileId: 'abcd',
        s3Key: '9999-9999',
        s3Bucket: 'bar'
      }
    ])
    expect(fields.file).toEqual({ fileName: 'a' })
    expect(fields.filelist[0]).toEqual({ fileName: 'b' })
    expect(fields.filelist[1]).toEqual({ fileName: 'c' })
  })

  test('doesnt update anything with a null fileID', () => {
    const fields = {
      foo: 'bar',
      file: {
        fileId: '1111',
        fileName: 'a'
      },
      filelist: [
        { fileId: '2222', fileName: 'b' },
        { fileId: '3333', fileName: 'c' }
      ]
    }

    updateFieldsResponse(fields, [
      {
        fileId: null,
        s3Key: '9999-9999',
        s3Bucket: 'bar'
      }
    ])
    expect(fields.file).toEqual({ fileName: 'a' })
    expect(fields.filelist[0]).toEqual({ fileName: 'b' })
    expect(fields.filelist[1]).toEqual({ fileName: 'c' })
  })
})
