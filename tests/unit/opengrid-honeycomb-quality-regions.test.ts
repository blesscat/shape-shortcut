import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  openGridStackableBoxUpperInnerRimZFor,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { bottomGridSeamApexTopZ } from '../../src/cad-kernel/components/opengrid-stackable-box/geometry'
import {
  createOpenGridStackableBoxQualityRegions,
  openGridStackableBoxQualityRegionZBounds,
} from '../../src/cad-kernel/components/opengrid-stackable-box/shared'
import { socketSeatChipZone } from '../../src/cad-kernel/components/opengrid-stackable-box/quality-gate'
import { inspectOpenGridStackableBoxInterface } from '../../src/cad-kernel/components/opengrid-stackable-box/quality-interface'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'

const createdShapes: Shape3D[] = []

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

afterEach(() => {
  for (const shape of createdShapes.splice(0)) shape.delete()
})

function remember<T extends Shape3D>(shape: T): T {
  createdShapes.push(shape)
  return shape
}

function parameters(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return { ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS, ...overrides }
}

function boundsZ(shape: Shape3D): { minZ: number; maxZ: number } {
  const bounds = shape.boundingBox
  try {
    const [min, max] = bounds.bounds as number[][]
    return { minZ: min[2], maxZ: max[2] }
  } finally {
    bounds.delete()
  }
}

describe('stackable-box quality region bounds', () => {
  const cases = [
    { x: 0.5, y: 0.5, height: 10 },
    { x: 2, y: 2, height: 20 },
    { x: 5, y: 8, height: 20 },
    { x: 10, y: 10, height: 200 },
  ]

  for (const testCase of cases) {
    it(`cover every probe window for ${testCase.x}x${testCase.y} h=${testCase.height}`, () => {
      const boxParameters = parameters(testCase)
      const bounds = openGridStackableBoxQualityRegionZBounds(boxParameters)
      const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
      const upperInnerRimZ =
        openGridStackableBoxUpperInnerRimZFor(boxParameters)

      const highestBottomProbeZ = Math.max(
        bottomGridSeamApexTopZ() + 0.03,
        configuration.bottomAssemblyHeight + 0.03,
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.totalHeight,
      )
      const lowestTopProbeZ =
        upperInnerRimZ +
        configuration.topRailHeight -
        configuration.topRailOuterChamfer -
        0.55
      const highestTopProbeZ = upperInnerRimZ + configuration.topRailHeight

      expect(bounds.bottomMaxZ).toBeGreaterThanOrEqual(highestBottomProbeZ)
      expect(bounds.topMinZ).toBeLessThanOrEqual(lowestTopProbeZ)
      expect(bounds.topMaxZ).toBeGreaterThanOrEqual(highestTopProbeZ)
      expect(bounds.bottomMinZ).toBeLessThanOrEqual(0)
    })
  }

  it('keeps every detachable-seat probe inside its chip zone', () => {
    const boxParameters = parameters({
      x: 2,
      y: 2,
      height: 20,
      cornerSeatMode: 'detachable-corner-seat',
    })
    const seatConfiguration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const bounds = openGridStackableBoxQualityRegionZBounds(boxParameters)
    const socketCenter = [0, 0] as const
    const zone = socketSeatChipZone(boxParameters, socketCenter)

    // The socket-void probe is a cylinder of the holder envelope radius: the
    // chip zone must fully contain it or the residual check would ignore the
    // outer annulus.
    const voidEnvelopeRadius =
      seatConfiguration.female.outerDiameter / 2 +
      seatConfiguration.geometryTolerance
    expect(zone[1][0] - socketCenter[0]).toBeGreaterThanOrEqual(
      voidEnvelopeRadius,
    )
    expect(socketCenter[0] - zone[0][0]).toBeGreaterThanOrEqual(
      voidEnvelopeRadius,
    )
    expect(zone[1][1]).toBeGreaterThanOrEqual(0)
    expect(zone[0][1]).toBeLessThanOrEqual(0)
    expect(bounds.bottomMaxZ).toBeGreaterThanOrEqual(
      seatConfiguration.male.totalHeight,
    )
  })

  it('cuts regions inside the declared bounds with geometry at both probe bands', () => {
    const boxParameters = parameters({
      x: 2,
      y: 2,
      height: 20,
      honeycombMode: true,
      cornerSeatMode: 'none',
    })
    const shape = remember(buildOpenGridStackableBox(boxParameters))
    const regions = createOpenGridStackableBoxQualityRegions(
      shape,
      boxParameters,
    )
    createdShapes.push(regions.bottom, regions.top)
    const bounds = openGridStackableBoxQualityRegionZBounds(boxParameters)
    const bottom = boundsZ(regions.bottom)
    const top = boundsZ(regions.top)

    expect(bottom.minZ).toBeLessThanOrEqual(0)
    expect(bottom.maxZ).toBeLessThanOrEqual(bounds.bottomMaxZ + 1e-6)
    expect(bottom.maxZ).toBeGreaterThanOrEqual(0)
    expect(top.minZ).toBeGreaterThanOrEqual(bounds.topMinZ - 1e-6)
    expect(top.maxZ).toBeLessThanOrEqual(bounds.topMaxZ + 1e-6)
    expect(top.maxZ).toBeGreaterThanOrEqual(bounds.topMaxZ - 1.2)
  }, 240_000)
})

describe('regional inspection parity', () => {
  it('reports the same honeycomb quality values with and without regions', () => {
    const boxParameters = parameters({
      x: 2,
      y: 2,
      height: 20,
      honeycombMode: true,
      cornerSeatMode: 'none',
    })
    const shape = remember(buildOpenGridStackableBox(boxParameters))
    const withoutRegions = inspectOpenGridStackableBoxInterface(
      shape,
      boxParameters,
    )
    const regions = createOpenGridStackableBoxQualityRegions(
      shape,
      boxParameters,
    )
    const withRegions = inspectOpenGridStackableBoxInterface(
      shape,
      boxParameters,
      regions,
    )
    regions.dispose()

    expect(withRegions.honeycombCellCount).toBeGreaterThan(0)
    expect(withRegions.honeycombCellCount).toBe(
      withoutRegions.honeycombCellCount,
    )
    expectSameReport(withRegions, withoutRegions)
  }, 600_000)

  it('reports the same solid quality values with and without regions', () => {
    const boxParameters = parameters({
      x: 2,
      y: 2,
      height: 20,
      cornerSeatMode: 'none',
    })
    const shape = remember(buildOpenGridStackableBox(boxParameters))
    const withoutRegions = inspectOpenGridStackableBoxInterface(
      shape,
      boxParameters,
    )
    const regions = createOpenGridStackableBoxQualityRegions(
      shape,
      boxParameters,
    )
    const withRegions = inspectOpenGridStackableBoxInterface(
      shape,
      boxParameters,
      regions,
    )
    regions.dispose()

    expectSameReport(withRegions, withoutRegions)
  }, 240_000)
})

function expectSameReport(
  withRegions: Record<string, unknown>,
  withoutRegions: Record<string, unknown>,
): void {
  const keys = new Set([
    ...Object.keys(withoutRegions),
    ...Object.keys(withRegions),
  ])
  for (const key of keys) {
    expectSameValue(key, withRegions[key], withoutRegions[key])
  }
}

function expectSameValue(key: string, left: unknown, right: unknown): void {
  if (typeof left === 'number' && typeof right === 'number') {
    const tolerance = Math.max(1e-9, Math.abs(right) * 1e-6)
    expect(Math.abs(left - right), `key=${key}`).toBeLessThanOrEqual(tolerance)
    return
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    expect(left.length, `key=${key} length`).toBe(right.length)
    for (let index = 0; index < left.length; index += 1) {
      expectSameValue(`${key}[${index}]`, left[index], right[index])
    }
    return
  }
  expect(right, `key=${key}`).toEqual(left)
}
