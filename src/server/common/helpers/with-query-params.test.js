import { withQueryParams } from '~/src/server/common/helpers/with-query-params'

describe('#withQueryParams', () => {
  test('Should provide expected url without query params', () => {
    expect(withQueryParams('https://yo.io')).toEqual('https://yo.io')
  })

  test('Should provide expected url with uploadId query param', () => {
    expect(
      withQueryParams('https://yo.io', {
        uploadId: '123456-76443224-7799043-233455666'
      })
    ).toEqual('https://yo.io?uploadId=123456-76443224-7799043-233455666')
  })

  test('Should provide expected url with query params', () => {
    expect(
      withQueryParams('https://yo.io', {
        one: 123456575,
        fish: 'yes',
        veg: ['carrot', 'cauliflower', 'onion']
      })
    ).toEqual(
      'https://yo.io?one=123456575&fish=yes&veg=carrot&veg=cauliflower&veg=onion'
    )
  })

  test('Should provide expected url with new query params', () => {
    expect(
      withQueryParams('https://yo.io?fruit=grapefruit&fruit=pineapple')
    ).toEqual('https://yo.io?fruit=grapefruit&fruit=pineapple')
  })

  test('Should provide expected url with merged array query params', () => {
    expect(
      withQueryParams('https://yo.io?hats=true&fruit=pears', {
        fruit: ['dates', 'figs', 'coconut']
      })
    ).toEqual(
      'https://yo.io?hats=true&fruit=dates&fruit=figs&fruit=coconut&fruit=pears'
    )
  })

  test('Should provide expected url with merged object and array query params', () => {
    expect(
      withQueryParams('https://yo.io?hats=true&fruit=blueberry&fruit=apricot', {
        fruit: ['mango', 'lychee', 'kumquat']
      })
    ).toEqual(
      'https://yo.io?hats=true&fruit=blueberry&fruit=apricot&fruit=mango&fruit=lychee&fruit=kumquat'
    )
  })

  test('Should provide expected url with overridden query params', () => {
    expect(
      withQueryParams('https://yo.io?hats=false&fruit=lychee', {
        hats: true
      })
    ).toEqual('https://yo.io?hats=true&fruit=lychee')
  })
})
