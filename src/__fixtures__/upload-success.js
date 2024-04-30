const uploadDetailsSuccessFixture = {
  redirect:
    'http://redirect.com/plants/add/status-poller?uploadId=683a2187-9977-4a3f-b62f-dfa621bcedb2',
  destinationBucket: 'cdp-example-node-frontend',
  destinationPath: '/plants',
  metadata: {
    plantId: '08e7045b-3f7a-4481-ba41-f301a99308b6'
  },
  uploadId: '683a2187-9977-4a3f-b62f-dfa621bcedb2',
  uploadStatus: 'ready',
  initiated: '2024-04-29T09:31:12.191Z',
  fields: {
    button: 'upload',
    file: {
      actualContentType: 'image/webp',
      filename: 'shoot.jpg',
      contentType: 'image/jpeg',
      hasError: false,
      s3Key:
        '683a2187-9977-4a3f-b62f-dfa621bcedb2/faf5ed64-cf0a-4708-a786-7c37e7d29aff',
      s3Bucket: 'cdp-example-node-frontend',
      fileStatus: 'scanComplete',
      contentLength: 25624
    }
  },
  fileIds: ['faf5ed64-cf0a-4708-a786-7c37e7d29aff'],
  pending: '2024-04-29T09:31:26.939Z',
  ready: '2024-04-29T09:37:53.271Z',
  numberOfRejectedFiles: 0
}

export { uploadDetailsSuccessFixture }
