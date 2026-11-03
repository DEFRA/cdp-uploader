import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import hapi from '@hapi/hapi'
import HapiSwagger from 'hapi-swagger'
import Vision from '@hapi/vision'

import { router } from '~/src/server/router.js'
import { swaggerOptions } from '~/src/server/swagger-options.js'

const outputFile = path.resolve(process.argv[2] ?? 'docs/openapi/swagger.json')

const server = hapi.server()

await server.register([
  Vision,
  { plugin: HapiSwagger, options: swaggerOptions },
  router
])

const { statusCode, payload } = await server.inject('/swagger.json')

if (statusCode !== 200) {
  throw new Error(`/swagger.json returned ${statusCode}`)
}

const spec = JSON.parse(payload)
// hapi fills these in from the machine generating the spec, not a real service URL.
delete spec.host
delete spec.schemes
if (spec.basePath === '/') {
  delete spec.basePath
}

await mkdir(path.dirname(outputFile), { recursive: true })
await writeFile(outputFile, `${JSON.stringify(spec, null, 2)}\n`)

process.stdout.write(
  `Wrote ${Object.keys(spec.paths).length} paths to ${outputFile}\n`
)
