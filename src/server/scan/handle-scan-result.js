import path from 'path'
import { moveS3File } from '~/src/server/scan/move-s3-file'
import { DeleteSqsMessage } from '~/src/server/scan/delete-sqs-message'
import { config } from 'date-fns/docs/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'
import { triggerCallback } from '~/src/server/scan/trigger-callback'

const logger = createLogger()
const quarantineBucket = config.get('quarantineBucket')
const scanResultQueue = config.get('sqsScanResults')

async function handleScanResult(server, payload, receiptHandle) {
  const id = path.dirname(payload.key)

  const init = JSON.parse(await server.redis.get(id))
  if (init == null) {
    logger.info(
      `No record of ${id} found in Redis, ignoring scan result. May be expired.`
    )
    return
  }

  const source = `s3://${quarantineBucket}/${payload.key}`
  const destinationKey = `${init.destinationPath}/${path.basename(payload.key)}` // do we want to strip id from the filename?
  const destination = `${init.destinationBucket}/${destinationKey}`

  if (payload.safe && !init.delivered) {
    const result = await moveS3File(
      source,
      init.destinationBucket,
      destinationKey
    ) // assume this will throw exception if it fails
    init.delivered = result
    await server.redis.set(id, JSON.stringify(init))

    if (!init.delivered) {
      logger.error(
        `File from ${source} could not be delivered to ${destination}`
      )
      await DeleteSqsMessage(server.sqs, scanResultQueue, receiptHandle)
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
    await DeleteSqsMessage(server.sqs, scanResultQueue, receiptHandle)
  } else {
    logger.warn(`Callback to ${init.scanResultCallback} failed, will retry...`)
  }
}

export { handleScanResult }
