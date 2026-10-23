import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { root, sha256 } from '../desk-assembly/provenance.mjs'

const output = resolve(root, 'public/home')
const manifest = JSON.parse(
  await readFile(resolve(output, 'manifest.json'), 'utf8'),
)
assert.equal(sha256(JSON.stringify(manifest.sources)), manifest.sourceHash)
for (const [path, checksum] of Object.entries(manifest.sources)) {
  assert.equal(
    sha256(await readFile(resolve(root, path))),
    checksum,
    `Stale source: ${path}`,
  )
}
for (const scene of ['desk', 'wall']) {
  for (const theme of ['light', 'dark']) {
    const name = `${scene}.${theme}.webp`
    const asset = manifest.assets[name]
    assert(asset, `Missing asset: ${name}`)
    const bytes = await readFile(resolve(output, name))
    assert.equal(bytes.length, asset.bytes)
    assert.equal(sha256(bytes), asset.sha256, `Changed image: ${name}`)
    const result = spawnSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'stream=width,height',
        '-of',
        'json',
        resolve(output, name),
      ],
      { encoding: 'utf8' },
    )
    assert.equal(result.status, 0, `Undecodable image: ${name}`)
    const { streams } = JSON.parse(result.stdout)
    assert.equal(streams[0].width, manifest.width)
    assert.equal(streams[0].height, manifest.height)
  }
}
console.log('Verified four homepage visuals, source hashes and dimensions.')
