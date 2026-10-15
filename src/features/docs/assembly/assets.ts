import type { AssemblyAssets, AssemblyManifest } from './types'

let pending: Promise<AssemblyAssets> | undefined

async function download(): Promise<AssemblyAssets> {
  const directory = '/docs/desk-scroll-assembly/'
  const response = await fetch(`${directory}manifest.json`)
  if (!response.ok) throw new Error('Assembly metadata is unavailable')
  const manifest: AssemblyManifest = await response.json()
  if (manifest.version !== 1 || manifest.asset !== 'meshes.bin') {
    throw new Error('Unsupported assembly geometry')
  }
  const model = await fetch(`${directory}${manifest.asset}`)
  if (!model.ok) throw new Error('Assembly geometry is unavailable')
  const bytes = await model.arrayBuffer()
  if (bytes.byteLength !== manifest.byteLength)
    throw new Error('Incomplete assembly geometry')
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const checksum = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  if (checksum !== manifest.sha256) throw new Error('Invalid assembly geometry')
  return { manifest, bytes }
}

export function loadAssemblyAssets(): Promise<AssemblyAssets> {
  if (!pending) {
    pending = download().catch((error: unknown) => {
      pending = undefined
      throw error
    })
  }
  return pending
}
