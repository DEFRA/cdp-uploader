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
export async function sendSqsMessageFifo(
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

/**
 * @param {SQSClient} sqs
 * @param {string} queue
 * @param {object} messageBody
 * @param {Record<string, MessageAttributeValue>} messageAttributes
 * @returns {Promise<*>}
 */
export async function sendSqsMessageStandard(
  sqs,
  queue,
  messageBody,
  messageAttributes = {}
) {
  return await sqs.send(
    new SendMessageCommand({
      QueueUrl: queue,
      MessageAttributes: messageAttributes,
      MessageBody: JSON.stringify(messageBody)
    })
  )
}

/**
 * @import { SQSClient, MessageAttributeValue } from '@aws-sdk/client-sqs'
 */
