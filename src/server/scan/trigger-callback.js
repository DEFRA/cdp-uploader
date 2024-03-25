import { fetcher } from '~/src/server/common/helpers/fetcher'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

const logger = createLogger()

async function triggerCallback(url, payload) {
  try {
    const { json, response } = await fetcher(url, {
      method: 'post',
      body: JSON.stringify({ payload })
    })
    if (!response.ok) {
      logger.error(new Error(`Failed to trigger callback ${url}, ${json}`))
      return false
    }
    return true
  } catch (error) {
    logger.error(error)
    return false
  }
}

export { triggerCallback }
