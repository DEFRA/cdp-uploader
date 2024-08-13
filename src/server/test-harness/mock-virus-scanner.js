import { SendMessageCommand } from '@aws-sdk/client-sqs'
import { HeadObjectCommand } from '@aws-sdk/client-s3'

import { deleteSqsMessage } from '~/src/server/common/helpers/sqs/delete-sqs-message.js'
import { config } from '~/src/config/index.js'

async function handleMockVirusScanner(message, queue, server) {
  try {
    server.logger.info('mocking response to', message)
    const msg = JSON.parse(message.Body)

    if (msg.Records?.length) {
      for (const record of msg.Records) {
        const key = record.s3?.object?.key

        if (key) {
          const virusRx = new RegExp(config.get('mockVirusRegex'))
          const metadata = await getObjectMetadata(server, key)
          if (virusRx.test(metadata?.filename)) {
            server.logger.info(
              `mocking INFECTED scan response for uploader ${key}`
            )
            await mockScanNotification(
              server,
              key,
              'INFECTED',
              '(mock) file has a virus'
            )
          } else {
            server.logger.info(
              `mocking CLEAN scan response for uploader ${key}`
            )
            await mockScanNotification(server, key, 'CLEAN', '')
          }
        }
      }
    }
  } catch (e) {
    server.logger.error(e)
  } finally {
    await deleteSqsMessage(server.sqs, queue, message.ReceiptHandle)
  }
}

async function getObjectMetadata(server, key) {
  try {
    const headObjectCommand = new HeadObjectCommand({
      Bucket: config.get('quarantineBucket'),
      Key: key
    })

    const headObjectResult = await server.s3.send(headObjectCommand)
    return headObjectResult?.Metadata ?? {}
  } catch (e) {
    server.log.error(e)
    return {}
  }
}

async function mockScanNotification(server, key, status, message) {
  const payload = {
    source: 'cdp-clamav-lambda',
    bucket: config.get('quarantineBucket'),
    key,
    status,
    message
  }
  return await server.sqs.send(
    new SendMessageCommand({
      QueueUrl: config.get('sqsScanResults.queueUrl'),
      MessageAttributes: {},
      MessageBody: JSON.stringify(payload),
      DelaySeconds: config.get('mockVirusResultDelay')
    })
  )
}

export { handleMockVirusScanner }
