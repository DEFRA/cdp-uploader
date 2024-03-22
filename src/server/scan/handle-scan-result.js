import { moveS3Object } from '~/src/server/scan/move-s3-object'
import { DeleteSqsMessage } from '~/src/server/scan/delete-sqs-message'
import { config } from '~/src/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'
import { triggerCallback } from '~/src/server/scan/trigger-callback'
import { buildS3client } from '~/src/server/common/helpers/s3-client'

const logger = createLogger()
const quarantineBucket = config.get('quarantineBucket')
const scanResultQueue = config.get('sqsScanResults')

async function handleScanResult(server, payload, receiptHandle) {
  const init = JSON.parse(await server.redis.get(payload.key))
  if (init == null) {
    logger.info(
      `No record of ${payload.key} found in Redis, ignoring scan result. May be expired.`
    )
    return
  }

  const destinationKey = `${init.destinationPath}/${payload.key}` // do we want to strip id from the filename?
  const destination = `${init.destinationBucket}/${destinationKey}`

  if (payload.safe) {
    // assume this will throw exception if it fails
    init.delivered = await moveS3Object(
      buildS3client(),
      quarantineBucket,
      payload.key,
      init.destinationBucket,
      destinationKey
    )
    await server.redis.set(payload.key, JSON.stringify(init))

    if (!init.delivered) {
      logger.error(
        `File from ${quarantineBucket}/${payload.key} could not be delivered to ${destination}`
      )
      // if we fail to deliver, do we really want to delete the message?
      // maybe a callback and message on the DLQ
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
