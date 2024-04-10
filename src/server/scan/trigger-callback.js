import { createLogger } from '~/src/server/common/helpers/logging/logger'

const logger = createLogger()

async function triggerCallback(url, payload) {
  let response
  try {
    response = await fetch(url, {
      method: 'post',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    logger.error(`Failed to trigger callback ${url}, ${error}`)
  }
  return response && response.ok
}

export { triggerCallback }
