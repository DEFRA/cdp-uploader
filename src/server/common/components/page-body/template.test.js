import { renderComponent } from '~/src/server/common/test-helpers/component-helpers.js'

describe('Page Body Component', () => {
  /** @type {CheerioAPI} */
  let $pageBody

  describe('With child content', () => {
    beforeEach(() => {
      $pageBody = renderComponent(
        'page-body',
        {},
        '<p>Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.</p>'
      )
    })

    test('Should render expected page body', () => {
      expect($pageBody('[data-testid="app-page-body"]').html()?.trim()).toBe(
        '<p>Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.</p>'
      )
    })
  })

  describe('With text param', () => {
    beforeEach(() => {
      $pageBody = renderComponent('page-body', {
        text: 'Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.'
      })
    })

    test('Should render expected page body', () => {
      expect($pageBody('[data-testid="app-page-body"]').html()?.trim()).toBe(
        'Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.'
      )
    })
  })

  describe('With html param', () => {
    beforeEach(() => {
      $pageBody = renderComponent('page-body', {
        html: '<p>Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.</p>'
      })
    })

    test('Should render expected page body', () => {
      expect($pageBody('[data-testid="app-page-body"]').html()?.trim()).toBe(
        '<p>Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.</p>'
      )
    })
  })
})

/**
 * @import { CheerioAPI } from 'cheerio'
 */
