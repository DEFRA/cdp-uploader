import { SendMessageCommand } from '@aws-sdk/client-sqs'
import crypto from 'node:crypto'

async function sendSqsMessage(sqs, queue, messageBody, messageAttributes = {}) {
  return await sqs.send(
    new SendMessageCommand({
      QueueUrl: queue,
      MessageAttributes: messageAttributes,
      MessageBody: JSON.stringify(messageBody),
      MessageGroupId: `cdp-uploader-${crypto.randomUUID()}`
    })
  )
}

export { sendSqsMessage }
