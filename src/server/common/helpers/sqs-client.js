import { SQSClient } from '@aws-sdk/client-sqs'
import { config } from '~/src/config'

function buildSqsClient() {
  return new SQSClient({
    region: config.get('awsRegion'),
    endpoint: config.get('sqsEndpoint')
  })
}

export { buildSqsClient }
