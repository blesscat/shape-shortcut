import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { buildOpenGridLabelHolder } from '../../src/cad-kernel/components/opengrid-label-holder/builder'
import { boundsForOpenGridLabelHolder } from '../../src/cad-contract/units'
import { assertOpenGridLabelHolderShapeQuality } from '../../src/cad-kernel/components/opengrid-label-holder/quality'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function volumeInBox(
  shape: Shape3D,
  min: [number, number, number],
  max: [number, number, number],
): number {
  const probe = makeBox(min, max)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) intersection.delete()
    probe.delete()
  }
}

describe('OpenGrid Label Holder generated geometry', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
  })

  afterAll(() => undefined)

  it('builds a single-solid holder within bounds with a hollow card pocket', async () => {
    const parameters = { widthTier: 40, gripThickness: 1.2 } as const
    const shape = await buildOpenGridLabelHolder(parameters, {})
    try {
      const expected = boundsForOpenGridLabelHolder(parameters)
      const bounds = shapeBounds(shape)
      expect(bounds[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(bounds[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(bounds[0]?.[2]).toBeCloseTo(expected.min[2], 2)
      expect(bounds[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(bounds[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(bounds[1]?.[2]).toBeCloseTo(expected.max[2], 2)
      assertOpenGridLabelHolderShapeQuality(shape, parameters)

      // The pocket interior (card seat) must be hollow: a probe box over the
      // pocket seat must not intersect solid material.
      const pocketHalfWidth = 20 + 0.15
      const pocketBottom = 2 - 0.45
      const occupied = volumeInBox(
        shape,
        [-pocketHalfWidth + 0.05, -1.95, pocketBottom + 0.05],
        [pocketHalfWidth - 0.05, 7.95, 1.95],
      )
      expect(occupied).toBeLessThan(0.5)
    } finally {
      shape.delete()
    }
  })

  it('keeps the same hang envelope across width tiers', async () => {
    const builds = []
    for (const widthTier of [20, 60] as const) {
      builds.push(buildOpenGridLabelHolder({ widthTier, gripThickness: 2 }, {}))
    }
    const shapes = await Promise.all(builds)
    try {
      const boundsList = shapes.map((shape) => shapeBounds(shape))
      expect(
        (boundsList[0]![1]![0] ?? 0) - (boundsList[0]![0]![0] ?? 0),
      ).toBeCloseTo(23.2, 2)
      expect(
        (boundsList[1]![1]![0] ?? 0) - (boundsList[1]![0]![0] ?? 0),
      ).toBeCloseTo(63.2, 2)
      for (const bounds of boundsList) {
        expect(bounds[0]?.[1]).toBeCloseTo(-8, 2)
        expect(bounds[1]?.[2]).toBeCloseTo(5.8, 2)
      }
    } finally {
      for (const shape of shapes) shape.delete()
    }
  })
})
