import { ProxyAgent, fetch as undiciFetch } from 'undici'

import { config } from '~/src/config/index.js'

/**
 * @param {string} url
 * @param {Partial<RequestInit>} opts
 */
function nonProxyFetch(url, opts) {
  return undiciFetch(url, {
    ...opts
  })
}

/**
 * @param {string} url
 * @param {Partial<RequestInit>} opts
 */
export function proxyFetch(url, opts) {
  const httpsProxy = config.get('httpsProxy')
  if (!httpsProxy) {
    return nonProxyFetch(url, opts)
  } else {
    return undiciFetch(url, {
      ...opts,
      dispatcher: new ProxyAgent({
        uri: httpsProxy,
        keepAliveTimeout: 10,
        keepAliveMaxTimeout: 10
      })
    })
  }
}

/**
 * @import { RequestInit } from 'undici'
 */
