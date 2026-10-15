import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { root, sha256, sourceProvenance } from '../desk-assembly/provenance.mjs'

const directory = resolve(root, 'public/docs/desk-scroll-assembly')
const manifest = JSON.parse(
  await readFile(resolve(directory, 'manifest.json'), 'utf8'),
)
const bytes = await readFile(resolve(directory, manifest.asset))
assert.equal(manifest.version, 1)
assert.equal(bytes.length, manifest.byteLength)
assert.equal(sha256(bytes), manifest.sha256)
const provenance = await sourceProvenance()
provenance.sources['scripts/desk-scroll-assembly/generate.mjs'] = sha256(
  await readFile(resolve(root, 'scripts/desk-scroll-assembly/generate.mjs')),
)
provenance.sourceHash = sha256(JSON.stringify(provenance.sources))
assert.deepEqual(
  manifest.sources,
  provenance.sources,
  'Meshes are stale; regenerate',
)
assert.equal(manifest.sourceHash, provenance.sourceHash)
assert.equal(Object.keys(manifest.meshes).length, 6)
let checked = 0
for (const mesh of Object.values(manifest.meshes)) {
  for (const name of ['positions', 'normals', 'indices']) {
    const { offset, count } = mesh[name]
    assert(Number.isInteger(offset) && offset % 4 === 0 && offset >= 0)
    assert(Number.isInteger(count) && count > 0)
    assert(offset + count * 4 <= bytes.length)
  }
  assert.equal(mesh.positions.count, mesh.normals.count)
  assert.equal(mesh.indices.count, mesh.triangleCount * 3)
  const vertexCount = mesh.positions.count / 3
  const indices = new Uint32Array(
    bytes.buffer,
    bytes.byteOffset + mesh.indices.offset,
    mesh.indices.count,
  )
  for (const index of indices) assert(index < vertexCount)
  const positions = new Float32Array(
    bytes.buffer,
    bytes.byteOffset + mesh.positions.offset,
    mesh.positions.count,
  )
  assert(positions.every(Number.isFinite))
  checked += 1
}
assert(Object.keys(manifest.verification).length >= 38)
console.log(
  `Verified ${checked} actual CAD meshes, checksums, source freshness and recorded assembly contacts`,
)
