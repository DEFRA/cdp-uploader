import React from 'react'
import ApiItem from '@theme-original/ApiItem'
import { DocProvider } from '@theme/DocItem/docContext'

// The GOV.UK theme's DocItem components read from its own DocProvider, which
// the OpenAPI ApiItem does not set up.
export default function ApiItemWrapper(props) {
  return (
    <DocProvider content={props.content}>
      <ApiItem {...props} />
    </DocProvider>
  )
}
