const uploadDetailsRejectedEmptyFixture = {
  redirect:
    'http://redirect.com/plants/add/status-poller?uploadId=58f10d6e-4b5e-4edc-8c80-5fda853bb6ac',
  destinationBucket: 'cdp-example-node-frontend',
  destinationPath: '/plants',
  metadata: {
    plantId: '94f8a562-630c-4569-b3a3-2503408c4129'
  },
  uploadId: '58f10d6e-4b5e-4edc-8c80-5fda853bb6ac',
  uploadStatus: 'pending',
  initiated: '2024-04-29T10:44:56.989Z',
  fields: {
    button: 'upload',
    file: {
      contentType: 'application/octet-stream',
      hasError: true,
      errorMessage: 'The selected file is empty',
      fileStatus: 'pending',
      contentLength: 0
    }
  },
  fileIds: ['2bea8bca-b1da-4c81-acac-17052bbb5f95'],
  pending: '2024-04-29T10:45:06.146Z'
}

export { uploadDetailsRejectedEmptyFixture }
