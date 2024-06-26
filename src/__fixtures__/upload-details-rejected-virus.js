const uploadDetailsRejectedVirusFixture = {
  uploadId: '619cdb5b-31b2-4747-9d7b-2bd447a1f7d7',
  uploadStatus: 'ready',
  initiated: '2024-04-29T09:42:14.407Z',
  form: {
    button: 'upload',
    file: {
      fileId: 'f45d0dd4-dd3f-4235-9c45-da2edd5c89fd',
      filename: 'succulant.jpeg',
      contentType: 'image/jpeg'
    }
  },
  fileIds: ['f45d0dd4-dd3f-4235-9c45-da2edd5c89fd'],
  request: {
    redirect:
      'http://redirect.com/plants/add/status-poller?uploadId=619cdb5b-31b2-4747-9d7b-2bd447a1f7d7',
    s3Bucket: 'cdp-example-node-frontend',
    s3Path: '/plants',
    metadata: {
      plantId: '94f8a562-630c-4569-b3a3-2503408c4129'
    }
  },
  pending: '2024-04-29T09:42:32.182Z',
  ready: '2024-04-29T09:43:43.548Z',
  numberOfRejectedFiles: 1
}

export { uploadDetailsRejectedVirusFixture }
