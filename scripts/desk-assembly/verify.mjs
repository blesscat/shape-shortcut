import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { assemblyScenes } from './scenes.mjs'
import {
  root,
  outputDirectory,
  width,
  height,
  fps,
  sha256,
  sourceProvenance,
} from './provenance.mjs'

const manifest = JSON.parse(
  await readFile(resolve(outputDirectory, 'manifest.json'), 'utf8'),
)
assert.equal(manifest.version, 1)
assert.equal(manifest.width, width)
assert.equal(manifest.height, height)
assert.equal(manifest.fps, fps)
assert.deepEqual(manifest.scenes, assemblyScenes)
const current = await sourceProvenance()
assert.equal(
  manifest.sourceHash,
  current.sourceHash,
  'CAD/media sources changed: regenerate desk assembly media',
)
assert.deepEqual(manifest.sources, current.sources)

const expected = []
for (const scene of assemblyScenes) {
  for (const theme of ['light', 'dark']) {
    for (const extension of ['mp4', 'webm', 'webp']) {
      const filename = `${scene.id}.${theme}.${extension}`
      expected.push(filename)
      const path = resolve(outputDirectory, filename)
      const bytes = await readFile(path)
      assert(
        bytes.length > 1000 && bytes.length < 25 * 1024 * 1024,
        `${filename}: invalid deployment size`,
      )
      assert.equal(
        manifest.assets[filename]?.sha256,
        sha256(bytes),
        `${filename}: changed output`,
      )
      assert.equal(manifest.assets[filename]?.bytes, bytes.length)
      const metadata = JSON.parse(
        execFileSync(
          'ffprobe',
          ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
          { encoding: 'utf8' },
        ),
      )
      assert.equal(
        metadata.streams.length,
        1,
        `${filename}: silent single-stream media required`,
      )
      const stream = metadata.streams[0]
      assert.equal(stream.width, width)
      assert.equal(stream.height, height)
      if (extension !== 'webp') {
        assert(
          Math.abs(Number(metadata.format.duration) - scene.duration) < 0.05,
          `${filename}: incorrect duration`,
        )
        assert.equal(stream.r_frame_rate, `${fps}/1`)
        const codec = extension === 'mp4' ? 'h264' : 'vp9'
        assert.equal(stream.codec_name, codec)
      }
      execFileSync(
        'ffmpeg',
        ['-v', 'error', '-xerror', '-i', path, '-f', 'null', '-'],
        { stdio: 'pipe' },
      )
    }
  }
}
assert.deepEqual(
  Object.keys(manifest.assets).sort(),
  expected.sort(),
  'Unexpected or missing generated assets',
)
assert.equal(Object.keys(manifest.verification).length, 38)
if (process.argv.includes('--geometry')) {
  const scratch = await mkdtemp(resolve(tmpdir(), 'shape-desk-verify-'))
  try {
    const output = resolve(scratch, 'assembly.json')
    execFileSync(
      process.execPath,
      ['scripts/desk-assembly/native.mjs', output],
      { cwd: root, stdio: 'inherit' },
    )
    const native = JSON.parse(await readFile(output, 'utf8'))
    assert.deepEqual(native.settings, manifest.settings)
    assert.deepEqual(native.datums, manifest.datums)
    assert.deepEqual(native.verification, manifest.verification)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}
console.log(
  `Verified ${expected.length} assembly media assets, provenance and 38 recorded native contact checks`,
)
