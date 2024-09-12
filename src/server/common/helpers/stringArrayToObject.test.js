import { stringArrayToObject } from '~/src/server/common/helpers/stringArrayToObject.js'

describe('#stringArrayToObject', () => {
  const mockPayload = {
    'date[day]': '',
    'date[month]': '',
    'date[year]': '',
    addressLine1: '',
    addressLine2: '',
    addressTown: '',
    addressPostcode: '',
    creatureFiles: {
      hapi: {
        filename: '',
        headers: {
          'content-disposition': 'form-data; name="creatureFiles"; filename=""',
          'content-type': 'application/octet-stream'
        }
      }
    }
  }

  test('Should convert payload with array object as expected', () => {
    expect(stringArrayToObject(mockPayload)).toEqual({
      date: {
        day: '',
        month: '',
        year: ''
      },
      addressLine1: '',
      addressLine2: '',
      addressPostcode: '',
      addressTown: '',
      creatureFiles: {
        hapi: {
          filename: '',
          headers: {
            'content-disposition':
              'form-data; name="creatureFiles"; filename=""',
            'content-type': 'application/octet-stream'
          }
        }
      }
    })
  })

  const mockPayloadObject = {
    'date[day]': '1',
    'date[month][feb]': '2',
    addressLine1: '',
    addressLine2: '',
    addressTown: '',
    addressPostcode: '',
    creatureFiles: {
      hapi: {
        filename: '',
        headers: {
          'content-disposition': 'form-data; name="creatureFiles"; filename=""',
          'content-type': 'application/octet-stream'
        }
      }
    }
  }

  test('Should convert nested array objects as expected', () => {
    expect(stringArrayToObject(mockPayloadObject)).toEqual({
      date: {
        day: '1',
        month: {
          feb: '2'
        }
      },
      addressLine1: '',
      addressLine2: '',
      addressTown: '',
      addressPostcode: '',
      creatureFiles: {
        hapi: {
          filename: '',
          headers: {
            'content-disposition':
              'form-data; name="creatureFiles"; filename=""',
            'content-type': 'application/octet-stream'
          }
        }
      }
    })
  })

  const mockPayloadArray = {
    date: ['3', '2', '2024'],
    addressLine1: '',
    addressLine2: '',
    addressTown: '',
    addressPostcode: '',
    creatureFiles: {
      hapi: {
        filename: '',
        headers: {
          'content-disposition': 'form-data; name="creatureFiles"; filename=""',
          'content-type': 'application/octet-stream'
        }
      }
    }
  }

  test('Should convert arrays as expected', () => {
    expect(stringArrayToObject(mockPayloadArray)).toEqual({
      date: ['3', '2', '2024'],
      addressLine1: '',
      addressLine2: '',
      addressTown: '',
      addressPostcode: '',
      creatureFiles: {
        hapi: {
          filename: '',
          headers: {
            'content-disposition':
              'form-data; name="creatureFiles"; filename=""',
            'content-type': 'application/octet-stream'
          }
        }
      }
    })
  })
})
