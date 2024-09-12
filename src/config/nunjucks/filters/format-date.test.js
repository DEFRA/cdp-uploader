import { formatDate } from '~/src/config/nunjucks/filters/format-date.js'

describe('#formatDate', () => {
  beforeAll(() => {
    jest.useFakeTimers({
      now: new Date('2023-04-01')
    })
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('With defaults', () => {
    test('Date should be in expected format', () => {
      expect(formatDate('2022-01-17T11:40:02.242Z')).toBe(
        'Mon 17th January 2022'
      )
    })
  })

  describe('With format attribute', () => {
    test('Date should be in provided format', () => {
      expect(
        formatDate(
          '2022-01-17T11:40:02.242Z',
          "h:mm aaa 'on' EEEE do MMMM yyyy"
        )
      ).toBe('11:40 am on Monday 17th January 2022')
    })
  })
})
