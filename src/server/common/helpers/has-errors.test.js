import { hasErrors } from '~/src/server/common/helpers/has-errors'
import { fileStatus } from '~/src/server/common/constants/file-status'

describe('#hasErrors', () => {
  test('Should correctly detect fields with errors', () => {
    expect(
      hasErrors({
        name: 'jeff',
        file: {
          fileId: '111-111',
          filename: 'shoot.jpg',
          errorMessage: 'The selected file contains a virus',
          contentLength: 67567,
          contentType: 'image/png',
          fileStatus: fileStatus.complete,
          hasError: true,
          s3Bucket: 'cdp-example-node-frontend',
          s3Key: '678-345/296-347'
        },
        filelist: [
          {
            fileId: '222-222',
            filename: 'yak.jpg'
          },
          {
            fileId: '333-333',
            filename: 'succulent.jpg'
          }
        ]
      })
    ).toEqual(true)
  })

  test('Should correctly detect nested fields with errors', () => {
    expect(
      hasErrors({
        name: 'jeff',
        file: {
          fileId: '111-111',
          filename: 'shoot.jpg'
        },
        filelist: [
          {
            fileId: '222-222',
            filename: 'yak.jpg'
          },
          {
            contentLength: 67567,
            contentType: 'image/png',
            errorMessage: 'The selected file contains a virus',
            fileId: '333-333',
            fileStatus: fileStatus.complete,
            filename: 'succulent.jpg',
            hasError: true,
            s3Bucket: 'cdp-example-node-frontend',
            s3Key: '678-345/296-347'
          }
        ]
      })
    ).toEqual(true)
  })

  test('Should correctly detect fields without errors', () => {
    expect(
      hasErrors({
        name: 'jeff',
        file: {
          fileId: '111-111',
          filename: 'shoot.jpg'
        },
        filelist: [
          {
            fileId: '222-222',
            filename: 'yak.jpg'
          },
          {
            contentLength: 67567,
            contentType: 'image/png',
            fileId: '333-333',
            fileStatus: fileStatus.complete,
            filename: 'succulent.jpg',
            hasError: false,
            s3Bucket: 'cdp-example-node-frontend',
            s3Key: '678-345/296-347'
          }
        ]
      })
    ).toEqual(false)
  })
})
