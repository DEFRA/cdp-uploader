const baseUrlFromEnv = process.env.DOCS_BASE_URL || '/'
const baseUrl = baseUrlFromEnv.startsWith('/')
  ? baseUrlFromEnv
  : `/${baseUrlFromEnv}`
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

const fs = require('node:fs')
const path = require('node:path')

const specPath = path.join(__dirname, 'openapi/swagger.json')

// The same kebabCase the OpenAPI plugin uses to name each operation's page, so
// these links always match the generated pages.
const kebabCase = require(
  require.resolve('lodash/kebabCase', {
    paths: [require.resolve('docusaurus-plugin-openapi-docs')]
  })
)

// Integration order. Operations not listed here follow in spec order.
const operationOrder = [
  'POST /initiate',
  'POST /upload-and-scan/{uploadId}',
  'GET /status/{uploadId}'
]

// One nav link per operation in the spec, so a new or renamed route shows up
// without editing this file. Empty until `npm run docs:openapi` has run.
function apiReferenceLinks() {
  if (!fs.existsSync(specPath)) return []
  const { paths } = JSON.parse(fs.readFileSync(specPath, 'utf8'))
  const operations = Object.entries(paths).flatMap(([route, methods]) =>
    Object.entries(methods).map(([method, { operationId }]) => ({
      text: `${method.toUpperCase()} ${route}`,
      href: `/api/uploader/${kebabCase(operationId)}/`
    }))
  )
  const rank = ({ text }) => {
    const index = operationOrder.indexOf(text)
    return index === -1 ? operationOrder.length : index
  }
  return operations.sort((a, b) => rank(a) - rank(b))
}

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'CDP Uploader API Docs',
  tagline: 'Reference docs for integrating with CDP Uploader',
  favicon: 'img/favicon.ico',

  url: 'https://cdp-int.defra.cloud',
  baseUrl: normalizedBaseUrl,
  trailingSlash: true,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn'
    }
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        docsRouteBasePath: '/',
        indexBlog: false,
        indexPages: false,
        hashed: 'filename',
        highlightSearchTermsOnTargetPage: true,
        searchResultContextMaxLength: 60
      }
    ],
    '@defra/docusaurus-theme-govuk',
    'docusaurus-theme-openapi-docs',
    require.resolve('./src/plugins/scope-govuk-sass.cjs'),
    require.resolve('./src/plugins/fix-govuk-nav-base-url.cjs')
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'guides',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js')
        },
        blog: false,
        pages: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ],

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'api',
        config: {
          cdpUploader: {
            specPath: 'openapi/swagger.json',
            outputDir: 'docs/api/uploader',
            // Same as the plugin's default page template, plus `slug: /` on the
            // generated intro page so it is served at /api/uploader/ itself.
            template: 'templates/api-page.mustache',
            hideSendButton: true,
            sidebarOptions: {
              groupPathsBy: 'tag'
            }
          }
        }
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'api',
        path: 'docs/api/uploader',
        routeBasePath: 'api/uploader',
        sidebarPath: require.resolve('./sidebarsApi.js'),
        docItemComponent: '@theme/ApiItem'
      }
    ]
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false
    },
    docs: {
      versionPersistence: 'localStorage'
    },
    govuk: {
      header: {
        serviceName: 'CDP Uploader API Docs',
        serviceHref: '/',
        organisationText: 'DEFRA',
        organisationHref: 'https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs'
      },
      navigation: [
        {
          text: 'Documentation',
          href: '/',
          sidebar: [
            { text: 'Overview', href: '/' },
            { text: 'API overview', href: '/api/overview/' },
            { text: 'Initiate upload', href: '/api/initiate/' },
            { text: 'Upload and scan', href: '/api/upload-and-scan/' },
            { text: 'Status polling', href: '/api/status/' },
            { text: 'Callback model', href: '/api/callback/' }
          ]
        },
        {
          text: 'API Reference',
          // Trailing slash matters: the theme highlights a tab on its path and
          // everything below it only when the href ends in "/".
          href: '/api/uploader/',
          sidebar: [
            { text: 'Overview', href: '/api/uploader/' },
            ...apiReferenceLinks()
          ]
        }
      ],
      phaseBanner: {
        phase: 'beta',
        text: 'This documentation is new. Your feedback will help us improve it.',
        feedbackHref: 'https://github.com/DEFRA/cdp-uploader/issues'
      },
      footer: {
        meta: [
          { text: 'cdp-uploader', href: 'https://github.com/DEFRA/cdp-uploader' },
          { text: 'cdp-api-docs', href: 'https://github.com/DEFRA/cdp-api-docs' }
        ]
      },
      homepage: {
        getStartedHref: '/api/overview',
        description:
          'Integration guide and OpenAPI reference for teams using the CDP Uploader service.'
      }
    }
  }
}
