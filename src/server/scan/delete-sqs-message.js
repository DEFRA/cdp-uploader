import { DeleteMessageCommand } from '@aws-sdk/client-sqs'

async function DeleteSqsMessage(sqs, queue, receipt) {
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: queue,
      ReceiptHandle: receipt
    })
  )
}

export { DeleteSqsMessage }
