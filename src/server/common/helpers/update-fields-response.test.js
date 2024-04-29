import { updateFieldsResponse } from '~/src/server/common/helpers/update-fields-response'

// TODO these tests need better descriptions
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
