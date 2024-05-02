const uploadDetailsPendingFixture = {
  redirect:
    'http://localhost:3000/plants/add/status-poller?uploadId=ba0a64c7-8b1c-4237-9256-b9c4a3c8fe68',
  destinationBucket: 'cdp-example-node-frontend',
  destinationPath: '/plants',
  metadata: {
    plantId: 'c316e7ae-3c58-49f8-96a9-cb9058c9ea31'
  },
  uploadId: 'ba0a64c7-8b1c-4237-9256-b9c4a3c8fe68',
  uploadStatus: 'pending',
  initiated: '2024-04-29T13:41:42.846Z',
  fields: {
    button: 'upload',
    file: {
      fileId: 'd3e1ccfa-3f58-435d-af9a-dad7b20ab11b',
      actualContentType: 'image/webp',
      filename: 'shoot.jpg',
      contentType: 'image/jpeg',
      hasError: false
    }
  },
  fileIds: ['d3e1ccfa-3f58-435d-af9a-dad7b20ab11b'],
  pending: '2024-04-29T13:41:47.467Z'
}

export { uploadDetailsPendingFixture }
