import { toScanResultResponse } from '~/src/server/common/helpers/scan-result-response.js'

/**
 * Proves that toScanResultResponse omits numberOfRejectedFiles from the
 * serialised output when uploadDetails.numberOfRejectedFiles is undefined.
 *
 * This happens in production when upload-and-scan/controller.js jumps
 * straight to 'ready' without files (fileStatuses.length === 0) because
 * that code path never assigns numberOfRejectedFiles on uploadDetails.
 *
 * Downstream consumers (fcp-sfd-object-processor) require the field when
 * uploadStatus is 'ready', so its absence causes a 502.
 */
describe('#toScanResultResponse - numberOfRejectedFiles contract', () => {
  const baseUploadDetails = {
    uploadId: 'aaa11111-1111-1111-1111-111111111111',
    uploadStatus: 'ready',
    initiated: '2026-07-16T09:00:00.000Z',
    pending: '2026-07-16T09:00:01.000Z',
    ready: '2026-07-16T09:00:01.000Z',
    isDownloadRequest: false,
    form: {},
    fileIds: [],
    request: {
      metadata: { customerId: '123' },
      redirect: '/done',
      s3Bucket: 'test-bucket'
    }
  }

  test('Should include numberOfRejectedFiles in JSON output when value is 0', () => {
    const uploadDetails = {
      ...baseUploadDetails,
      numberOfRejectedFiles: 0
    }

    const result = toScanResultResponse(
      uploadDetails.uploadId,
      uploadDetails,
      [],
      false
    )

    const serialised = JSON.parse(JSON.stringify(result))

    expect(serialised).toHaveProperty('numberOfRejectedFiles')
    expect(serialised.numberOfRejectedFiles).toBe(0)
  })

  test('Should include numberOfRejectedFiles when uploadStatus is ready and no files were submitted', () => {
    // This simulates the state produced by upload-and-scan/controller.js
    // when fileStatuses.length === 0: uploadStatus is set to 'ready' but
    // numberOfRejectedFiles is never assigned.
    const uploadDetails = {
      ...baseUploadDetails
      // numberOfRejectedFiles is intentionally absent
    }

    const result = toScanResultResponse(
      uploadDetails.uploadId,
      uploadDetails,
      [],
      false
    )

    const serialised = JSON.parse(JSON.stringify(result))

    // This assertion FAILS, proving the bug:
    // numberOfRejectedFiles is stripped by JSON.stringify because it is undefined
    expect(serialised).toHaveProperty('numberOfRejectedFiles')
    expect(serialised.numberOfRejectedFiles).toBe(0)
  })
})
