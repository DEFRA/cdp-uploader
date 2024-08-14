import { SendMessageCommand } from '@aws-sdk/client-sqs'
import crypto from 'node:crypto'

/**
 * @param sqs
 * @param queue
 * @param messageBody
 * @param messageDeduplicationId
 * @param messageAttributes
 * @returns {Promise<*>}
 */
async function sendSqsMessage(
  sqs,
  queue,
  messageBody,
  messageDeduplicationId,
  messageAttributes = {}
) {
  return await sqs.send(
    new SendMessageCommand({
      QueueUrl: queue,
      MessageAttributes: messageAttributes,
      MessageBody: JSON.stringify(messageBody),
      MessageGroupId: `cdp-uploader-${crypto.randomUUID()}`,
      MessageDeduplicationId: messageDeduplicationId
    })
  )
}

export { sendSqsMessage }
