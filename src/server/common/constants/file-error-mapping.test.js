import { fileErrors } from '~/src/server/common/constants/file-errors.js'

describe('file error mapping', () => {
  test('all fileErrors entries have non-empty code and message strings', () => {
    for (const key of Object.keys(fileErrors)) {
      expect(typeof fileErrors[key].message).toBe('string')
      expect(fileErrors[key].message).not.toBe('')
      expect(typeof fileErrors[key].code).toBe('string')
      expect(fileErrors[key].code).not.toBe('')
    }
  })
})
