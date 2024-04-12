import { SQSClient } from '@aws-sdk/client-sqs'
import { config } from '~/src/config'

function buildSqsClient() {
  return new SQSClient({
    region: config.get('awsRegion'),
    ...(config.get('isDevelopment') && {
      endpoint: config.get('localstackEndpoint')
    })
  })
}

export { buildSqsClient }
