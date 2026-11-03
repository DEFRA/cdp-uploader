// Wraps the GOV.UK theme's router shim to fix which top-level tab is active.
//
// The theme treats "/" or a one-segment path (for example /interactive-map) as
// the home link and highlights it only on that exact page. Two problems here:
//
// 1. cdp-api-docs serves this site under /api/<service>/latest/. The home
//    tab's href is then several segments deep, falls through to the prefix
//    rule, and is highlighted on every page, including API Reference.
// 2. On the guide pages (/api/overview/ and so on) no tab is highlighted,
//    because they are not the exact home page.
//
// Here the home tab is active for any page under the site's baseUrl that no
// other tab claims.
//
// Registered by src/plugins/fix-govuk-nav-base-url.cjs.
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import {
  useIsActive as themeUseIsActive,
  useLocation
} from '@defra/docusaurus-theme-govuk/src/lib/react-foundry-router-shim.js'

export * from '@defra/docusaurus-theme-govuk/src/lib/react-foundry-router-shim.js'

const withoutTrailingSlash = (pathname) =>
  pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname

export const useIsActive = () => {
  const themeIsActive = themeUseIsActive()
  const location = useLocation()
  const { siteConfig } = useDocusaurusContext()

  const baseUrl = withoutTrailingSlash(siteConfig.baseUrl)
  const nav = siteConfig.themeConfig?.govuk?.navigation ?? []
  const otherTabs = nav
    .map(({ href }) => withoutTrailingSlash(`${baseUrl}${href}`.replace('//', '/')))
    .filter((href) => href !== baseUrl)

  return (href, ...rest) => {
    const target = withoutTrailingSlash(href.split(/[?#]/)[0])
    if (target !== baseUrl) return themeIsActive(href, ...rest)

    const pathname = withoutTrailingSlash(location.pathname)
    const inSite =
      baseUrl === '/' || pathname === baseUrl || pathname.startsWith(`${baseUrl}/`)
    return (
      inSite && !otherTabs.some((tab) => themeIsActive(`${tab}/`, ...rest))
    )
  }
}
