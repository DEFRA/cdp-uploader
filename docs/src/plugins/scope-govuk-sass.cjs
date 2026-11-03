const path = require('node:path')

const openapiThemeDir = path.dirname(
  require.resolve('docusaurus-theme-openapi-docs/package.json')
)

// The GOV.UK theme's /\.scss$/ rule also matches the OpenAPI theme's
// styles.scss, which already has its own Sass rule. Both rules chained break
// `docusaurus start`, so keep the GOV.UK rule off the OpenAPI theme.
// Must be registered after both themes.
module.exports = function scopeGovukSass() {
  return {
    name: 'scope-govuk-sass',
    configureWebpack(config) {
      for (const rule of config.module?.rules ?? []) {
        if (rule && String(rule.test) === String(/\.scss$/)) {
          rule.exclude = [rule.exclude, openapiThemeDir].filter(Boolean).flat()
        }
      }
      return {}
    }
  }
}
