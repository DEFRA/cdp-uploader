const uploadDetailsReadyFixture = {
  uploadId: 'f5aa7920-6c3d-4090-a0c5-a0002df2c285',
  uploadStatus: 'ready',
  initiated: '2024-04-29T11:13:21.637Z',
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
      'http://redirect.com/plants/add/status-poller?uploadId=f5aa7920-6c3d-4090-a0c5-a0002df2c285',
    s3Bucket: 'cdp-example-node-frontend',
    s3Path: '/plants',
    metadata: {
      plantId: '94f8a562-630c-4569-b3a3-2503408c4129'
    }
  },
  pending: '2024-04-29T11:13:27.589Z',
  ready: '2024-04-29T11:18:09.439Z',
  numberOfRejectedFiles: 0
}

export { uploadDetailsReadyFixture }
