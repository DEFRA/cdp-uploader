import { fileStatus } from '~/src/server/common/constants/file-status.js'
import { fileErrorMessages } from '~/src/server/common/constants/file-error-messages.js'
import { updateFormsResponse } from '~/src/server/common/helpers/update-forms-response.js'

describe('#updateFieldsResponse', () => {
  let formData

  beforeEach(() => {
    formData = {
      name: 'jeff',
      file: {
        fileId: '111-111',
        filename: 'shoot.jpg',
        contentType: 'image/jpeg'
      },
      filelist: [
        { fileId: '222-222', filename: 'yak.jpg' },
        { fileId: '333-333', filename: 'succulent.jpg' }
      ]
    }
  })

  test('Should return empty object', () => {
    expect(
      updateFormsResponse({}, [
        {
          fileId: '111-111',
          fileStatus: fileStatus.pending,
          s3Key: '123-4567/89-10',
          s3Bucket: 'cdp-example-node-frontend',
          contentType: 'image/jpeg',
          contentLength: 25624,
          hasError: false
        }
      ])
    ).toEqual({})
  })

  test('Should update root field', () => {
    expect(
      updateFormsResponse(formData, [
        {
          fileId: '111-111',
          fileStatus: fileStatus.pending,
          s3Key: '456-4567/309-10',
          s3Bucket: 'cdp-example-node-frontend',
          contentType: 'image/jpeg',
          contentLength: 56783,
          hasError: false
        }
      ])
    ).toEqual({
      name: 'jeff',
      file: {
        contentLength: 56783,
        contentType: 'image/jpeg',
        fileId: '111-111',
        fileStatus: fileStatus.pending,
        filename: 'shoot.jpg',
        hasError: false,
        s3Bucket: 'cdp-example-node-frontend',
        s3Key: '456-4567/309-10'
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
  })

  test('Should update nested field', () => {
    expect(
      updateFormsResponse(formData, [
        {
          fileId: '333-333',
          fileStatus: fileStatus.complete,
          s3Key: '678-345/296-347',
          s3Bucket: 'cdp-example-node-frontend',
          contentType: 'image/png',
          contentLength: 67567,
          hasError: true,
          errorMessage: fileErrorMessages.virus
        }
      ])
    ).toEqual({
      name: 'jeff',
      file: {
        fileId: '111-111',
        filename: 'shoot.jpg',
        contentType: 'image/jpeg'
      },
      filelist: [
        {
          fileId: '222-222',
          filename: 'yak.jpg'
        },
        {
          contentLength: 67567,
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
  })

  test('With non matching fileId, Should not add updates to any field', () => {
    expect(
      updateFormsResponse(formData, [
        {
          fileId: 'non-matching-id-12345',
          fileStatus: fileStatus.complete,
          s3Key: '634-34/239-598',
          s3Bucket: 'cdp-example-node-frontend',
          contentType: 'image/png',
          contentLength: 91245,
          hasError: true,
          errorMessage: fileErrorMessages.virus
        }
      ])
    ).toEqual({
      name: 'jeff',
      file: {
        fileId: '111-111',
        filename: 'shoot.jpg',
        contentType: 'image/jpeg'
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
  })
})
