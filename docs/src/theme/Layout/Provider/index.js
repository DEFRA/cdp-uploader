import React from 'react'
import { composeProviders } from '@docusaurus/theme-common'
import {
  ColorModeProvider,
  AnnouncementBarProvider,
  ScrollControllerProvider,
  NavbarProvider,
  PluginHtmlClassNameProvider
} from '@docusaurus/theme-common/internal'
import { DocsPreferredVersionContextProvider } from '@docusaurus/plugin-content-docs/client'

// The GOV.UK theme's LayoutProvider renders no providers, but the OpenAPI
// theme components call hooks such as useColorMode that need them.
const Provider = composeProviders([
  ColorModeProvider,
  AnnouncementBarProvider,
  ScrollControllerProvider,
  DocsPreferredVersionContextProvider,
  PluginHtmlClassNameProvider,
  NavbarProvider
])

export default function LayoutProvider({ children }) {
  return <Provider>{children}</Provider>
}
