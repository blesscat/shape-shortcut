import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { root, sha256, sourceProvenance } from '../desk-assembly/provenance.mjs'

const output = resolve(root, 'public/docs/desk-scroll-assembly')
const scratch = await mkdtemp(resolve(tmpdir(), 'shape-scroll-assembly-'))
try {
  const source = resolve(scratch, 'assembly.json')
  const result = spawnSync(
    process.execPath,
    ['scripts/desk-assembly/native.mjs', source],
    {
      cwd: root,
      stdio: 'inherit',
    },
  )
  assert.equal(result.status, 0, 'Native printable geometry export failed')
  const data = JSON.parse(await readFile(source, 'utf8'))
  const buffers = []
  const meshes = {}
  let offset = 0
  for (const [name, mesh] of Object.entries(data.meshes)) {
    const attributes = {}
    for (const attribute of ['positions', 'normals', 'indices']) {
      let array = new Float32Array(mesh[attribute])
      if (attribute === 'indices') array = new Uint32Array(mesh[attribute])
      const bytes = Buffer.from(array.buffer)
      attributes[attribute] = { offset, count: array.length }
      offset += bytes.length
      buffers.push(bytes)
    }
    meshes[name] = {
      ...attributes,
      bounds: mesh.bounds,
      triangleCount: mesh.triangleCount,
    }
  }
  const bytes = Buffer.concat(buffers)
  const provenance = await sourceProvenance()
  provenance.sources['scripts/desk-scroll-assembly/generate.mjs'] = sha256(
    await readFile(import.meta.filename),
  )
  provenance.sourceHash = sha256(JSON.stringify(provenance.sources))
  const manifest = {
    version: 1,
    asset: 'meshes.bin',
    byteLength: bytes.length,
    sha256: sha256(bytes),
    ...provenance,
    meshes,
    datums: data.datums,
    settings: data.settings,
    verification: data.verification,
  }
  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, 'meshes.bin'), bytes)
  await writeFile(
    resolve(output, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
  console.log(
    `Exported ${Object.keys(meshes).length} actual CAD meshes (${bytes.length} bytes)`,
  )
} finally {
  await rm(scratch, { recursive: true, force: true })
}
