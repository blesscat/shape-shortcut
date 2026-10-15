import { createServer } from 'node:http'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { chromium } from '@playwright/test'
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

async function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', cwd: root })
  const [code] = await once(child, 'exit')
  if (code !== 0) throw new Error(`${command} exited ${code}`)
}

const preview = process.argv.includes('--preview')
let outputExtensions = ['mp4', 'webm', 'webp']
if (preview) outputExtensions = ['webp']
const scratch = await mkdtemp(resolve(tmpdir(), 'shape-desk-assembly-'))
const json = resolve(scratch, 'assembly.json')
const output = preview ? resolve(scratch, 'preview') : outputDirectory
await mkdir(output, { recursive: true })
let browser
let server
try {
  await run(process.execPath, ['scripts/desk-assembly/native.mjs', json])
  const resources = new Map([
    ['/assembly.json', [json, 'application/json']],
    [
      '/renderer.mjs',
      [resolve(import.meta.dirname, 'renderer.mjs'), 'text/javascript'],
    ],
    [
      '/scenes.mjs',
      [resolve(import.meta.dirname, 'scenes.mjs'), 'text/javascript'],
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
    viewport: { width, height },
    deviceScaleFactor: 1,
  })
  page.on('pageerror', (error) => console.error(error))
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(
    () => typeof window.renderAssembly === 'function',
    null,
    { timeout: 60_000 },
  )
  const assets = {}
  for (const scene of assemblyScenes) {
    for (const theme of ['light', 'dark']) {
      const name = `${scene.id}.${theme}`
      const poster = resolve(scratch, 'poster.png')
      await page.evaluate(
        ([id, theme, time]) => window.renderAssembly(id, theme, time),
        [scene.id, theme, scene.posterTime],
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
      if (!preview) {
        const encoder = spawn(
          'ffmpeg',
          [
            '-hide_banner',
            '-loglevel',
            'error',
            '-y',
            '-f',
            'image2pipe',
            '-framerate',
            String(fps),
            '-vcodec',
            'png',
            '-i',
            'pipe:0',
            '-an',
            '-c:v',
            'libx264',
            '-preset',
            'slow',
            '-crf',
            '23',
            '-pix_fmt',
            'yuv420p',
            '-movflags',
            '+faststart',
            resolve(output, `${name}.mp4`),
            '-an',
            '-c:v',
            'libvpx-vp9',
            '-b:v',
            '0',
            '-crf',
            '34',
            '-row-mt',
            '1',
            '-pix_fmt',
            'yuv420p',
            resolve(output, `${name}.webm`),
          ],
          { stdio: ['pipe', 'inherit', 'inherit'] },
        )
        const finished = once(encoder, 'exit')
        for (let frame = 0; frame < scene.duration * fps; frame += 1) {
          await page.evaluate(
            ([id, theme, time]) => window.renderAssembly(id, theme, time),
            [scene.id, theme, frame / fps],
          )
          const bytes = await page.screenshot({ type: 'png' })
          if (!encoder.stdin.write(bytes)) await once(encoder.stdin, 'drain')
        }
        encoder.stdin.end()
        const [code] = await finished
        if (code !== 0) throw new Error(`FFmpeg failed for ${name}`)
      }
      for (const extension of outputExtensions) {
        const filename = `${name}.${extension}`
        const bytes = await readFile(resolve(output, filename))
        assets[filename] = { bytes: bytes.length, sha256: sha256(bytes) }
      }
      console.log(`Captured ${name}`)
    }
  }
  const native = JSON.parse(await readFile(json, 'utf8'))
  await writeFile(
    resolve(output, 'manifest.json'),
    JSON.stringify(
      {
        version: 1,
        width,
        height,
        fps,
        scenes: assemblyScenes,
        ...(await sourceProvenance()),
        settings: native.settings,
        datums: native.datums,
        verification: native.verification,
        meshes: Object.fromEntries(
          Object.entries(native.meshes).map(([id, mesh]) => [
            id,
            { bounds: mesh.bounds, triangleCount: mesh.triangleCount },
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
  if (!preview) await rm(scratch, { recursive: true, force: true })
}
