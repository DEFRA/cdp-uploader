import { fetcher } from '~/src/server/common/helpers/fetcher'

async function triggerCallback(url, payload) {
  const callbackResponse = await fetcher(url, {
    method: 'post',
    body: JSON.stringify({ payload })
  })
  return callbackResponse
}

export { triggerCallback }
