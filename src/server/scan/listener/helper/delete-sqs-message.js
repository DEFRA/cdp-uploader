import { DeleteMessageCommand } from '@aws-sdk/client-sqs'

async function deleteSqsMessage(sqs, queue, receipt) {
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: queue,
      ReceiptHandle: receipt
    })
  )
}

export { deleteSqsMessage }
