import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

export const root = resolve(import.meta.dirname, '../..')
export const outputDirectory = resolve(root, 'public/docs/desk-assembly')
export const width = 960
export const height = 640
export const fps = 24

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

async function filesIn(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await filesIn(path)))
    else files.push(path)
  }
  return files
}

export async function sourceProvenance() {
  const paths = [resolve(root, 'pnpm-lock.yaml')]
  for (const directory of [
    'scripts/desk-assembly',
    'src/cad-contract',
    'src/cad-kernel',
    'vendor/replicad-opencascadejs',
  ]) {
    for (const path of await filesIn(resolve(root, directory))) {
      if (/\.(?:ts|mjs|step|wasm)$/.test(path)) paths.push(path)
    }
  }
  const sources = {}
  for (const path of paths.sort())
    sources[relative(root, path)] = sha256(await readFile(path))
  return { sources, sourceHash: sha256(JSON.stringify(sources)) }
}
