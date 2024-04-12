import { SendMessageCommand } from '@aws-sdk/client-sqs'

async function sendSqsMessage(sqs, queue, messageBody, messageAttributes = {}) {
  return await sqs.send(
    new SendMessageCommand({
      QueueUrl: queue,
      MessageAttributes: messageAttributes,
      MessageBody: JSON.stringify(messageBody)
    })
  )
}

export { sendSqsMessage }
