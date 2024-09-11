import { SendMessageCommand } from '@aws-sdk/client-sqs'

/**
 * @typedef {SQSClient} SQSClient
 * @typedef {MessageAttributeValue} MessageAttributeValue
 */

/**
 * @param {SQSClient} sqs
 * @param {string} queue
 * @param {object} messageBody
 * @param {string} messageDeduplicationId
 * @param {Record<string, MessageAttributeValue>} messageAttributes
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

/**
 * @import { SQSClient, MessageAttributeValue } from '@aws-sdk/client-sqs'
 */
