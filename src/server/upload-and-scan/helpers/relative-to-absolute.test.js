import { relativeToAbsolute } from '~/src/server/upload-and-scan/helpers/relative-to-absolute'

describe('#relative-to-absolute', () => {
  test('should convert a path and host into a valid url', () => {
    expect(relativeToAbsolute('http://localhost:7337', '/foo/bar')).toEqual(
      'http://localhost:7337/foo/bar'
    )
  })

  test('should normalize the path if the base has one', () => {
    expect(relativeToAbsolute('http://localhost:7337/', '/foo/bar')).toEqual(
      'http://localhost:7337/foo/bar'
    )
  })

  test('preserve query params', () => {
    expect(
      relativeToAbsolute('http://localhost:7337/', '/foo?a=b&foo=1234')
    ).toEqual('http://localhost:7337/foo?a=b&foo=1234')
  })

  test('return the path if its actually a abs url', () => {
    expect(
      relativeToAbsolute('http://localhost:7337', 'http://foo.com/foo')
    ).toEqual('http://foo.com/foo')
  })

  test('throw an error if the inputs are invalid', () => {
    expect(() => relativeToAbsolute('', '/foo')).toThrow(
      new Error('Failed to convert path to absolute url')
    )
  })
})
