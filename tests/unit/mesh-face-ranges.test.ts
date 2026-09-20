import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, setOC, type Shape3D } from 'replicad'
import { meshBRep, serializeMesh } from '../../src/cad-kernel/mesh'

const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const wasmPath =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => wasmPath,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

describe('meshBRep face ranges', () => {
  it('records contiguous non-overlapping ranges that cover the box mesh', () => {
    const shape = makeBox([0, 0, 0], [20, 10, 30])
    const mesh = meshBRep(shape as Shape3D, {
      tolerance: 0.01,
      angularTolerance: 0.1,
    })
    const ranges = mesh.faceRanges
    expect(ranges).toBeDefined()
    if (!ranges) throw new Error('FACE_RANGES_MISSING')

    // A box tessellates to six planar faces; degenerate zero-triangle faces
    // are skipped, so there are between 6 and 12 recorded ranges depending on
    // triangulation of the corners.
    const rangeCount = ranges.length / 2
    expect(rangeCount).toBeGreaterThanOrEqual(6)
    expect(rangeCount).toBeLessThanOrEqual(12)

    let previousEnd = -1
    let covered = 0
    for (let index = 0; index < ranges.length; index += 2) {
      const start = ranges[index] as number
      const count = ranges[index + 1] as number
      expect(count).toBeGreaterThan(0)
      expect(start).toBeGreaterThan(previousEnd)
      previousEnd = start + count - 1
      covered += count
    }
    expect(previousEnd).toBe(mesh.triangleCount - 1)
    expect(covered).toBe(mesh.triangleCount)
  })

  it('serializes ranges into the mesh snapshot as an ArrayBuffer', () => {
    const shape = makeBox([0, 0, 0], [20, 10, 30])
    const snapshot = serializeMesh(
      meshBRep(shape as Shape3D, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      }),
    )
    expect(snapshot.faceTriangleRanges).toBeInstanceOf(ArrayBuffer)
    const ranges = new Uint32Array(snapshot.faceTriangleRanges!)
    expect(ranges.length).toBeGreaterThan(0)
    expect(ranges.length % 2).toBe(0)
    const firstStart = ranges[0] as number
    const firstCount = ranges[1] as number
    expect(firstStart).toBe(0)
    expect(firstCount).toBeGreaterThan(0)
  })
})
