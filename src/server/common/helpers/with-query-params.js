import { parse, stringify } from 'qs'

/**
 * @summay Add query params to url string
 * @description This allows a url to have query params added to it. This url
 * may already have query params on it. Enables users to obtain an uploadId on
 * callback url handlers from the callback url in a Frontend.
 *
 * @param path
 * @param additionalQueryParams
 * @returns {string}
 */
function withQueryParams(path, additionalQueryParams = {}) {
  const [url, queryString] = path.split('?')
  const preExistingQueryParams = parse(queryString, { ignoreQueryPrefix: true })

  return (
    url +
    stringify(
      {
        ...preExistingQueryParams,
        ...additionalQueryParams
      },
      { addQueryPrefix: true, arrayFormat: 'repeat' }
    )
  )
}

export { withQueryParams }
