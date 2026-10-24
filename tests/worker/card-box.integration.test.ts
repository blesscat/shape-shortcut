import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { cast, getOC, makeBox, measureVolume, type Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { buildCardBoxBox } from '../../src/cad-kernel/components/card-box/box'
import { buildCardBoxLid } from '../../src/cad-kernel/components/card-box/lid'
import { countSolids } from '../../src/cad-kernel/shape-query/solids'
import { CARD_BOX_CONFIGURATION } from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

beforeAll(async () => {
  await initialiseCadKernel(WASM_PATH)
})

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/card-box',
)

function loadBrepFixture(fileName: string): Shape3D {
  const text = readFileSync(resolve(FIXTURES_DIR, fileName), 'utf8')
  const oc = getOC()
  return cast(oc.BRepToolsWrapper.Read(text)) as Shape3D
}

function boundsOf(shape: Shape3D): { min: number[]; max: number[] } {
  const bounds = shape.boundingBox
  try {
    const [min, max] = bounds.bounds as [number[], number[]]
    return { min: [...min], max: [...max] }
  } finally {
    bounds.delete()
  }
}

function expectClose(
  actual: number,
  expected: number,
  tolerance: number,
  label: string,
): void {
  expect(
    Math.abs(actual - expected),
    `${label}: ${actual.toFixed(4)} vs ${expected.toFixed(4)} (±${tolerance})`,
  ).toBeLessThanOrEqual(tolerance)
}

describe('card-box default box matches the FreeCAD reference', () => {
  it('matches bbox, volume, and solid count of box-floor-fixed.brep', () => {
    const built = buildCardBoxBox({
      ...defaultParameters(),
      part: 'box',
    })
    const reference = loadBrepFixture('box-floor-fixed.brep')
    try {
      const builtBounds = boundsOf(built)
      const referenceBounds = boundsOf(reference)
      for (const axis of [0, 1, 2]) {
        expectClose(
          builtBounds.min[axis]!,
          referenceBounds.min[axis]!,
          0.05,
          `bbox min[${axis}]`,
        )
        expectClose(
          builtBounds.max[axis]!,
          referenceBounds.max[axis]!,
          0.05,
          `bbox max[${axis}]`,
        )
      }
      const builtVolume = measureVolume(built)
      const referenceVolume = measureVolume(reference)
      expectClose(
        builtVolume,
        referenceVolume,
        referenceVolume * 0.005,
        'volume',
      )
      expect(countSolids(built)).toBe(1)
    } finally {
      built.delete()
      reference.delete()
    }
  })

  it('keeps divider slots above the floor top surface', () => {
    const built = buildCardBoxBox({
      ...defaultParameters(),
      part: 'box',
    })
    try {
      // Probe column at a slot y position (y=33, center of a groove) just
      // inside the side wall: below the floor top only the 2 mm floor may
      // be present; above it nothing.
      const probeBelow = makeBox([35.3, 32.9, 0], [35.45, 33.1, 2]) as Shape3D
      const probeAbove = makeBox([35.3, 32.9, 2], [35.45, 33.1, 130]) as Shape3D
      const belowInter = built.intersect(probeBelow)
      const aboveInter = built.intersect(probeAbove)
      try {
        const belowVolume = measureVolume(belowInter)
        const aboveVolume = measureVolume(aboveInter)
        // Full floor coverage in the probe column is 0.15 × 0.2 × 2 = 0.06.
        expect(belowVolume).toBeGreaterThan(0.03)
        expect(aboveVolume).toBeLessThan(0.01)
      } finally {
        belowInter.delete()
        aboveInter.delete()
        probeBelow.delete()
        probeAbove.delete()
      }
    } finally {
      built.delete()
    }
  })
})

describe('card-box default lid matches the FreeCAD reference', () => {
  it('matches bbox, volume, and solid count of lid.brep in the assembled frame', () => {
    const built = buildCardBoxLid({
      ...defaultParameters(),
      part: 'lid',
    })
    const reference = loadBrepFixture('lid.brep')
    try {
      const builtBounds = boundsOf(built)
      const referenceBounds = boundsOf(reference)
      for (const axis of [0, 1, 2]) {
        expectClose(
          builtBounds.min[axis]!,
          referenceBounds.min[axis]!,
          0.05,
          `bbox min[${axis}]`,
        )
        expectClose(
          builtBounds.max[axis]!,
          referenceBounds.max[axis]!,
          0.05,
          `bbox max[${axis}]`,
        )
      }
      const builtVolume = measureVolume(built)
      const referenceVolume = measureVolume(reference)
      expectClose(
        builtVolume,
        referenceVolume,
        referenceVolume * 0.005,
        'volume',
      )
      expect(countSolids(built)).toBe(1)
    } finally {
      built.delete()
      reference.delete()
    }
  })
})

function defaultParameters() {
  return {
    ...CARD_BOX_CONFIGURATION.defaultParameters,
  }
}
