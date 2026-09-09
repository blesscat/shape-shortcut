import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, setOC, type BoundingBox, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import {
  buildOpenGridStackableBox,
  assertOpenGridStackableBoxGeometry,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'

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
}, 240_000)

function parameters(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return { ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS, ...overrides }
}

function zExtentOf(shape: Shape3D): number {
  const bounds: BoundingBox = shape.boundingBox
  try {
    const [min, max] = bounds.bounds as number[][]
    return max[2] - min[2]
  } finally {
    bounds.delete()
  }
}

function installTallShapeIntersectCounter(minimumZExtent: number): {
  counted: () => number
  restore: () => void
} {
  let count = 0
  const probe = makeBox([0, 0, 0], [1, 1, 1])
  let owner: object | null = Object.getPrototypeOf(probe)
  probe.delete()
  while (
    owner !== null &&
    !Object.prototype.hasOwnProperty.call(owner, 'intersect')
  ) {
    owner = Object.getPrototypeOf(owner)
  }
  if (owner === null) throw new Error('intersect prototype not found')
  const registry = owner as unknown as Record<
    string,
    (this: Shape3D, ...args: unknown[]) => unknown
  >
  const original = registry.intersect
  registry.intersect = function (this: Shape3D, ...args: unknown[]) {
    if (zExtentOf(this) >= minimumZExtent) count += 1
    return original.apply(this, args)
  }
  return {
    counted: () => count,
    restore: () => {
      registry.intersect = original
    },
  }
}

describe('honeycomb quality inspection stays memory-bounded', () => {
  it('runs a small bounded number of boolean operations on the full candidate', () => {
    const boxParameters = parameters({
      x: 2,
      y: 2,
      height: 20,
      honeycombMode: true,
      cornerSeatMode: 'none',
    })
    // #134 validates the inexpensive solid host before cutting the lattice.
    // Measure only inspection of the completed honeycomb candidate here.
    const shape = buildOpenGridStackableBox(boxParameters)
    const counter = installTallShapeIntersectCounter(boxParameters.height * 0.9)
    try {
      assertOpenGridStackableBoxGeometry(shape, boxParameters, {})
    } finally {
      counter.restore()
      shape.delete()
    }
    // Only the two measurement-region cuts (plus the small fixture-vs-fixture
    // stacking probes) may touch the full-height candidate; a regression back
    // to per-probe full-shape booleans would push this well past 30.
    expect(counter.counted()).toBeLessThanOrEqual(8)
  }, 300_000)
})
