import { RedisHelper } from '~/src/server/common/helpers/redis-helper'

describe('#redis-helper', () => {
  test('updateField non-nested field', () => {
    const helper = new RedisHelper(null)

    const fields = {
      foo: 'bar',
      file: {
        fileId: '1111'
      },
      filelist: [{ fileId: '2222' }, { fileId: '3333' }]
    }

    expect(
      helper.updateField(fields, '1111', { s3Key: '1234-567', s3Bucket: 'foo' })
    ).toBe(true)
    expect(fields.file).toEqual({
      fileId: '1111',
      s3Key: '1234-567',
      s3Bucket: 'foo'
    })
  })

  test('updateField nested field', () => {
    const helper = new RedisHelper(null)

    const fields = {
      foo: 'bar',
      file: {
        fileId: '1111'
      },
      filelist: [{ fileId: '2222' }, { fileId: '3333' }]
    }

    expect(
      helper.updateField(fields, '3333', {
        s3Key: '9999-9999',
        s3Bucket: 'bar'
      })
    ).toBe(true)
    expect(fields.filelist[0]).toEqual({ fileId: '2222' })
    expect(fields.filelist[1]).toEqual({
      fileId: '3333',
      s3Key: '9999-9999',
      s3Bucket: 'bar'
    })
  })

  test('dont update missing field', () => {
    const helper = new RedisHelper(null)

    const fields = {
      foo: 'bar',
      file: {
        fileId: '1111'
      },
      filelist: [{ fileId: '2222' }, { fileId: '3333' }]
    }

    expect(
      helper.updateField(fields, 'abcd', {
        s3Key: '9999-9999',
        s3Bucket: 'bar'
      })
    ).toBe(false)
  })
})
