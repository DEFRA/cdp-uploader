const path = require('node:path')

const shim = path.resolve(__dirname, '../lib/govuk-router-shim.js')

// Swaps the GOV.UK theme's router shim for ../lib/govuk-router-shim.js, which
// wraps it. Must be registered after the theme, so it sees the request the
// theme has already pointed at its own shim.
module.exports = function fixGovukNavBaseUrl() {
  return {
    name: 'fix-govuk-nav-base-url',
    configureWebpack(config, isServer, utils) {
      const webpack = utils.currentBundler?.instance ?? require('webpack')
      return {
        plugins: [
          new webpack.NormalModuleReplacementPlugin(
            /react-foundry-router-shim\.js$/,
            (resource) => {
              // The wrapper imports the theme's shim, leave that one alone
              if (resource.contextInfo?.issuer === shim) return
              resource.request = shim
            }
          )
        ]
      }
    }
  }
}
