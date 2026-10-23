// Native Node strips TypeScript, but needs extension resolution for the kernel's
// bundler-style imports. This hook is confined to the offline CAD process.
import { registerHooks, createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const url = new URL(specifier, context.parentURL)
      for (const suffix of ['.ts', '/index.ts']) {
        if (existsSync(fileURLToPath(url) + suffix)) {
          return nextResolve(url.href + suffix, context)
        }
      }
    }
    return nextResolve(specifier, context)
  },
})

const require = createRequire(import.meta.url)
globalThis.require = require
globalThis.__dirname = dirname(fileURLToPath(import.meta.url))
const { setOC } = await import('replicad')
const init = require('replicad-opencascadejs').default
setOC(
  await init({
    locateFile: () =>
      require.resolve('replicad-opencascadejs/src/replicad_single.wasm'),
  }),
)
const { produceHomeVisuals } = await import('./produce.ts')
await produceHomeVisuals(process.argv[2])
