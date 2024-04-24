import { isArray, mergeWith } from 'lodash'
import { parse, stringify } from 'qs'

function mergeHelper(pathQueryValue, queryValue) {
  if (isArray(pathQueryValue)) {
    return pathQueryValue.concat(queryValue)
  }
  if (isArray(queryValue)) {
    return queryValue.concat(pathQueryValue)
  }
}

/**
 * @summay Add query params to url string
 * @description This allows a url to have query params added to it. This url
 * may already have query params on it. Enables users to obtain an uploadId on
 * callback url handlers from the callback url in a Frontend.
 *
 * @param path
 * @param queryParams
 * @returns {string}
 */
function withQueryParams(path, queryParams = {}) {
  const [url, queryString] = path.split('?')
  const pathQueryParams = parse(queryString, { ignoreQueryPrefix: true })

  return (
    url +
    stringify(mergeWith({}, pathQueryParams, queryParams, mergeHelper), {
      addQueryPrefix: true,
      arrayFormat: 'repeat'
    })
  )
}

export { withQueryParams }
