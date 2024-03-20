import path from 'path'
import { moveS3File } from '~/src/server/scan/move-s3-file'
import { DeleteSqsMessage } from '~/src/server/scan/delete-sqs-message'
import { config } from 'date-fns/docs/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'
import { triggerCallback } from '~/src/server/scan/trigger-callback'

const logger = createLogger()

async function handleScanResult(server, payload, receiptHandle) {
  // extract the id
  const id = path.dirname(payload.key)

  // look up the id
  const init = JSON.parse(await server.redis.get(id))
  if (init == null) {
    // no record
    return
  }

  init.scanResults = payload
  const source = 'TODO'
  const destination = 'TODO'

  if (payload.safe && !init.delivered) {
    const result = await moveS3File(source, destination) // assume this will throw exception if it fails
    init.delivered = result
    await server.redis.set(id, JSON.stringify(init))

    if (!init.delivered) {
      logger.error(`File from ${source} was not delivered to ${destination}`)
      await DeleteSqsMessage(
        server.sqs,
        config.get('sqsScanResults'),
        receiptHandle
      )
      return
    }
  }

  const scanResult = {
    safe: payload.safe,
    error: payload.error
  }
  if (payload.safe) {
    scanResult.fileUrl = destination
  }

  const callbackOk = await triggerCallback(init.scanResultCallback, scanResult)

  if (callbackOk) {
    await DeleteSqsMessage(
      server.sqs,
      config.get('sqsScanResults'),
      receiptHandle
    )
  } else {
    logger.warn(`Callback to ${init.scanResultCallback} failed, will retry...`)
  }
}

export { handleScanResult }
