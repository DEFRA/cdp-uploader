import { aboutController } from '~/src/server/about/controller'

const about = {
  plugin: {
    name: 'about',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/about',
          ...aboutController
        }
      ])
    }
  }
}

export { about }
