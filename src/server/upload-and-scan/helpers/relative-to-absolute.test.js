import { relativeToAbsolute } from '~/src/server/upload-and-scan/helpers/relative-to-absolute.js'
import { jest } from '@jest/globals'

const mockLogger = {
  error: jest.fn()
}

describe('#relative-to-absolute', () => {
  test('should convert a path and host into a valid url', () => {
    expect(
      relativeToAbsolute('http://localhost:7337', '/foo/bar', mockLogger)
    ).toBe('http://localhost:7337/foo/bar')
  })

  test('should normalize the path if the base has one', () => {
    expect(
      relativeToAbsolute('http://localhost:7337/', '/foo/bar', mockLogger)
    ).toBe('http://localhost:7337/foo/bar')
  })

  test('preserve query params', () => {
    expect(
      relativeToAbsolute(
        'http://localhost:7337/',
        '/foo?a=b&foo=1234',
        mockLogger
      )
    ).toBe('http://localhost:7337/foo?a=b&foo=1234')
  })

  test('return the path if its actually a abs url', () => {
    expect(
      relativeToAbsolute(
        'http://localhost:7337',
        'http://foo.com/foo',
        mockLogger
      )
    ).toBe('http://foo.com/foo')
  })

  test('log an error and return path if the inputs are invalid', () => {
    expect(relativeToAbsolute('', '/foo', mockLogger)).toBe('/foo')
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
