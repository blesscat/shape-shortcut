import { createServer } from 'node:http'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { chromium } from '@playwright/test'
import { root, sha256, sourceProvenance } from '../desk-assembly/provenance.mjs'

async function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', cwd: root })
  const [code] = await once(child, 'exit')
  if (code !== 0) throw new Error(`${command} exited ${code}`)
}

const scratch = await mkdtemp(resolve(tmpdir(), 'shape-home-visuals-'))
const json = resolve(scratch, 'assembly.json')
const output = resolve(root, 'public/home')
await mkdir(output, { recursive: true })
let browser
let server
try {
  await run(process.execPath, ['scripts/home-visuals/native.mjs', json])
  const resources = new Map([
    ['/assembly.json', [json, 'application/json']],
    [
      '/renderer.mjs',
      [resolve(import.meta.dirname, 'renderer.mjs'), 'text/javascript'],
    ],
    [
      '/three/three.module.js',
      [
        resolve(root, 'node_modules/three/build/three.module.js'),
        'text/javascript',
      ],
    ],
    [
      '/three/three.core.js',
      [
        resolve(root, 'node_modules/three/build/three.core.js'),
        'text/javascript',
      ],
    ],
  ])
  server = createServer(async (request, response) => {
    try {
      if (request.url === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html' })
        response.end(
          '<!doctype html><html><body><script type="module" src="/renderer.mjs"></script></body></html>',
        )
        return
      }
      const resource = resources.get(request.url)
      if (!resource) {
        response.writeHead(404)
        response.end()
        return
      }
      response.writeHead(200, { 'Content-Type': resource[1] })
      response.end(await readFile(resource[0]))
    } catch {
      response.writeHead(500)
      response.end()
    }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  })
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 1,
  })
  page.on('pageerror', (error) => console.error(error))
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(
    () => typeof window.renderHome === 'function',
    null,
    { timeout: 60_000 },
  )
  const assets = {}
  for (const scene of ['desk', 'wall']) {
    for (const theme of ['light', 'dark']) {
      const name = `${scene}.${theme}`
      const poster = resolve(scratch, 'poster.png')
      await page.evaluate(
        ([kind, theme]) => window.renderHome(kind, theme),
        [scene, theme],
      )
      await page.screenshot({ path: poster })
      await run('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        poster,
        '-c:v',
        'libwebp',
        '-quality',
        '88',
        resolve(output, `${name}.webp`),
      ])
      const bytes = await readFile(resolve(output, `${name}.webp`))
      assets[`${name}.webp`] = { bytes: bytes.length, sha256: sha256(bytes) }
      console.log(`Captured ${name}`)
    }
  }
  const native = JSON.parse(await readFile(json, 'utf8'))
  const provenance = await sourceProvenance()
  for (const name of [
    'capture.mjs',
    'native.mjs',
    'produce.ts',
    'renderer.mjs',
  ]) {
    provenance.sources[`scripts/home-visuals/${name}`] = sha256(
      await readFile(resolve(import.meta.dirname, name)),
    )
  }
  provenance.sourceHash = sha256(JSON.stringify(provenance.sources))
  await writeFile(
    resolve(output, 'manifest.json'),
    JSON.stringify(
      {
        version: 1,
        width: 1200,
        height: 800,
        ...provenance,
        settings: native.settings,
        placements: native.placements,
        wallParts: native.wallParts,
        wallClearances: native.wallClearances,

        meshes: Object.fromEntries(
          Object.entries(native.meshes).map(([id, mesh]) => [
            id,
            { bounds: mesh.bounds },
          ]),
        ),
        assets,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`Media output: ${output}`)
} finally {
  await browser?.close()
  if (server) await new Promise((done) => server.close(done))
  await rm(scratch, { recursive: true, force: true })
}
