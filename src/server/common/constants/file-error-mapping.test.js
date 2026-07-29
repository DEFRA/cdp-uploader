import { fileErrorMessages } from '~/src/server/common/constants/file-error-messages.js'
import { fileErrorCodes } from '~/src/server/common/constants/file-error-codes.js'

describe('file error mapping', () => {
  test('error messages and codes define identical keys', () => {
    expect(Object.keys(fileErrorCodes).sort()).toEqual(
      Object.keys(fileErrorMessages).sort()
    )
  })

  test('all message and code values are populated strings', () => {
    for (const key of Object.keys(fileErrorMessages)) {
      expect(typeof fileErrorMessages[key]).toBe('string')
      expect(fileErrorMessages[key]).not.toBe('')
      expect(typeof fileErrorCodes[key]).toBe('string')
      expect(fileErrorCodes[key]).not.toBe('')
    }
  })
})
