const baseUrlFromEnv = process.env.DOCS_BASE_URL || '/'
const baseUrl = baseUrlFromEnv.startsWith('/')
  ? baseUrlFromEnv
  : `/${baseUrlFromEnv}`
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

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
            { text: 'POST /initiate', href: '/api/uploader/post-initiate/' },
            {
              text: 'POST /upload-and-scan/{uploadId}',
              href: '/api/uploader/post-uploadandscan-uploadid/'
            },
            {
              text: 'GET /status/{uploadId}',
              href: '/api/uploader/get-status-uploadid/'
            }
          ]
        }
      ],
      phaseBanner: {
        phase: 'beta',
        text: 'This documentation pattern is being tested in CORE-4357 and CORE-4362.',
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
