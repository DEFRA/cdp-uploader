import { URL } from 'node:url'
import { HttpsProxyAgent } from 'https-proxy-agent'

import { config } from '~/src/config/index.js'

export function proxyAgent() {
  const httpsProxy = config.get('httpsProxy')

  if (!httpsProxy) {
    return null
  } else {
    const proxyUrl = new URL(httpsProxy)
    return {
      url: proxyUrl,
      agent: new HttpsProxyAgent(proxyUrl)
    }
  }
}
