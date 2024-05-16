const uploadDetailsSuccessFixture = {
  uploadId: '683a2187-9977-4a3f-b62f-dfa621bcedb2',
  uploadStatus: 'ready',
  initiated: '2024-04-29T09:31:12.191Z',
  form: {
    button: 'upload',
    file: {
      fileId: '7507f65a-acb5-41f2-815f-719fbbd47ee5',
      filename: 'shoot.jpg',
      contentType: 'image/jpeg'
    }
  },
  fileIds: ['7507f65a-acb5-41f2-815f-719fbbd47ee5'],
  request: {
    redirect:
      'http://redirect.com/plants/add/status-poller?uploadId=683a2187-9977-4a3f-b62f-dfa621bcedb2',
    s3Bucket: 'cdp-example-node-frontend',
    s3Path: '/plants',
    metadata: {
      plantId: '08e7045b-3f7a-4481-ba41-f301a99308b6'
    }
  },
  pending: '2024-04-29T09:31:26.939Z',
  ready: '2024-04-29T09:37:53.271Z',
  numberOfRejectedFiles: 0
}

export { uploadDetailsSuccessFixture }
