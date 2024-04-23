import { withQueryParams } from '~/src/server/common/helpers/with-query-params'

describe('#withQueryParams', () => {
  test('Should provide expected url without query params', () => {
    expect(withQueryParams('https://example.com')).toEqual(
      'https://example.com'
    )
  })

  test('Should provide expected url with query params', () => {
    expect(
      withQueryParams('https://example.com', {
        one: 123456575,
        fish: 'yes',
        veg: ['carrot', 'cauliflower', 'onion']
      })
    ).toEqual(
      'https://example.com?one=123456575&fish=yes&veg=carrot&veg=cauliflower&veg=onion'
    )
  })

  test('Should provide expected url with new query params', () => {
    expect(
      withQueryParams('https://example.com?fruit=grapefruit&fruit=pineapple')
    ).toEqual('https://example.com?fruit=grapefruit&fruit=pineapple')
  })

  test('Should provide expected url with merged array query params', () => {
    expect(
      withQueryParams('https://example.com?hats=true&fruit=pears', {
        fruit: ['dates', 'figs', 'coconut']
      })
    ).toEqual(
      'https://example.com?hats=true&fruit=dates&fruit=figs&fruit=coconut'
    )
  })

  test('Should provide expected url with overridden query params', () => {
    expect(
      withQueryParams('https://example.com?hats=false&fruit=lychee', {
        hats: true
      })
    ).toEqual('https://example.com?hats=true&fruit=lychee')
  })
})
