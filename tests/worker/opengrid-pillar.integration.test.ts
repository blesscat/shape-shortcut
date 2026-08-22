import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeCylinder, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForPillar,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  PILLAR_CONFIGURATION,
  type PillarParameters,
} from '../../src/cad-contract/units'
import { buildPillar } from '../../src/cad-kernel/components/opengrid-pillar/builder'
import { assertPillarShapeQuality } from '../../src/cad-kernel/components/opengrid-pillar/quality'
import { importOpenGridDetachableCornerSeatReference } from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')
const DETACHABLE_CORNER_SEAT_ASSET_URL = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-3.8.step',
  import.meta.url,
)

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep cleanup failures from hiding the geometry assertion.
  }
}

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function probeVolumeAt(
  shape: Shape3D,
  x: number,
  z: number,
  probeRadius = 0.05,
  y = 0,
): number {
  const probe = makeCylinder(probeRadius, 0.02, [x, y, z])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    probe.delete()
  }
}

describe('OpenGrid pillar CAD kernel integration', () => {
  it('builds the detachable corner seat with a 3.8 mm locating body', async () => {
    const reference = await importOpenGridDetachableCornerSeatReference(
      new Blob([await readFile(DETACHABLE_CORNER_SEAT_ASSET_URL)], {
        type: 'model/step',
      }),
    )
    const referenceVolume = measureVolume(reference)
    const parameters: PillarParameters = {
      mode: 'detachable-corner-seat',
    }
    const shape = await buildPillar(parameters, {
      detachableCornerSeatReference: reference,
    })
    try {
      const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
      const actual = shapeBounds(shape)
      expect(actual[0]?.[0]).toBeCloseTo(configuration.male.bounds.min[0], 5)
      expect(actual[0]?.[1]).toBeCloseTo(configuration.male.bounds.min[1], 5)
      expect(actual[0]?.[2]).toBeCloseTo(configuration.male.bounds.min[2], 5)
      expect(actual[1]?.[0]).toBeCloseTo(configuration.male.bounds.max[0], 5)
      expect(actual[1]?.[1]).toBeCloseTo(configuration.male.bounds.max[1], 5)
      expect(actual[1]?.[2]).toBeCloseTo(configuration.male.bounds.max[2], 5)
      expect(actual[1]?.[2]).toBeCloseTo(5.3, 5)
      expect(probeVolumeAt(shape, 2.4, 3.75)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.6, 3.75)).toBeLessThan(1e-8)
      expect(
        probeVolumeAt(shape, 0, configuration.indicator.depth / 2),
      ).toBeLessThanOrEqual(
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance,
      )
      expect(
        probeVolumeAt(shape, 0, configuration.indicator.depth + 0.02),
      ).toBeGreaterThan(0)
      expect(measureVolume(shape)).toBeCloseTo(
        configuration.male.markedNominalVolume,
        3,
      )
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      expect(assertPillarShapeQuality(shape, parameters, mesh).passed).toBe(
        true,
      )
    } finally {
      deleteShape(shape)
      expect(measureVolume(reference)).toBeCloseTo(referenceVolume, 8)
      deleteShape(reference)
    }
  }, 180_000)

  it.each([
    { mode: 'standard', offset: 0 },
    { mode: 'thin-shell', offset: 0 },
  ] as PillarParameters[])(
    'builds a valid centered fixed-mode pillar for %#',
    async (parameters) => {
      const shape = await buildPillar(parameters)
      try {
        const actual = shapeBounds(shape)
        const expected = boundsForPillar(parameters)
        expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
        expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
        expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 2)
        expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
        expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
        expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 2)
        expect(measureVolume(shape)).toBeGreaterThan(0)

        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        expect(mesh.triangleCount).toBeGreaterThan(0)
        expect(
          [...new Float32Array(mesh.positions)].every(Number.isFinite),
        ).toBe(true)
        expect([...new Float32Array(mesh.normals)].every(Number.isFinite)).toBe(
          true,
        )
        expect(
          [...new Uint32Array(mesh.indices)].every(Number.isSafeInteger),
        ).toBe(true)
        const quality = assertPillarShapeQuality(shape, parameters, mesh)
        expect(quality.solidCount).toBe(1)
        expect(quality.passed).toBe(true)
        expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
        expect(
          (
            await exportStlBytes(shape, {
              tolerance: 0.05,
              angularTolerance: 0.1,
            })
          ).byteLength,
        ).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )

  it('builds the custom-length Ø5 mm positioning profile with both end chamfers', async () => {
    const parameters: PillarParameters = {
      mode: 'positioning',
      length: 25,
      offset: 0,
    }
    const shape = await buildPillar(parameters)
    try {
      const actual = shapeBounds(shape)
      expect(actual[0]?.[0]).toBeCloseTo(-2.5, 2)
      expect(actual[0]?.[1]).toBeCloseTo(-2.5, 2)
      expect(actual[0]?.[2]).toBeCloseTo(0, 2)
      expect(actual[1]?.[0]).toBeCloseTo(2.5, 2)
      expect(actual[1]?.[1]).toBeCloseTo(2.5, 2)
      expect(actual[1]?.[2]).toBeCloseTo(25, 2)

      expect(probeVolumeAt(shape, 1.4, 0.1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 1.7, 0.1)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.4, 1.1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.6, 1.1)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.4, 24.4)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.6, 24.4)).toBeLessThan(1e-8)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('expands the custom-length positioning body in XY while keeping height fixed', async () => {
    const parameters: PillarParameters = {
      mode: 'positioning',
      length: 25,
      offset: 0.5,
    }
    const shape = await buildPillar(parameters)
    try {
      const actual = shapeBounds(shape)
      expect(actual[0]?.[0]).toBeCloseTo(-2.75, 2)
      expect(actual[0]?.[1]).toBeCloseTo(-2.75, 2)
      expect(actual[0]?.[2]).toBeCloseTo(0, 2)
      expect(actual[1]?.[0]).toBeCloseTo(2.75, 2)
      expect(actual[1]?.[1]).toBeCloseTo(2.75, 2)
      expect(actual[1]?.[2]).toBeCloseTo(25, 2)
      expect(probeVolumeAt(shape, 2.7, 2)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.8, 2)).toBeLessThan(1e-8)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('expands the complete pillar in XY without moving its center or Z base', async () => {
    const parameters: PillarParameters = {
      mode: 'standard',
      offset: 0.5,
    }
    const shape = await buildPillar(parameters)
    try {
      const actual = shapeBounds(shape)
      const expected = boundsForPillar(parameters)
      expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(actual[0]?.[2]).toBeCloseTo(0, 2)
      expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(actual[1]?.[2]).toBeCloseTo(9, 2)
      expect(probeVolumeAt(shape, 3.7, 0.4)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 3.8, 0.4)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.7, 1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.8, 1)).toBeLessThan(1e-8)
      expect(
        assertPillarShapeQuality(
          shape,
          parameters,
          meshBRep(shape, {
            tolerance: 0.05,
            angularTolerance: 0.1,
          }),
        ).passed,
      ).toBe(true)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it.each([
    {
      mode: 'thin-shell',
      offset: -0.5,
    },
    {
      mode: 'positioning',
      length: 25,
      offset: -0.5,
    },
  ] as PillarParameters[])(
    'resizes %s geometry bounds and quality probes',
    async (parameters) => {
      const shape = await buildPillar(parameters)
      try {
        const actual = shapeBounds(shape)
        const expected = boundsForPillar(parameters)
        expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
        expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
        expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 2)
        expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
        expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
        expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 2)

        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        expect(assertPillarShapeQuality(shape, parameters, mesh).passed).toBe(
          true,
        )
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )

  it.each([
    { mode: 'standard', offset: 0 },
    { mode: 'thin-shell', offset: 0 },
  ] as PillarParameters[])(
    'keeps the Ø7 x 0.8 mm flange, sharp shoulder, Ø5 mm body, and upper chamfer for %#',
    async (parameters) => {
      const shape = await buildPillar(parameters)
      const totalLength = boundsForPillar(parameters).max[2]
      const bodyRadius = PILLAR_CONFIGURATION.bodyDiameter / 2
      const upperChamferBoundaryRadius =
        bodyRadius - PILLAR_CONFIGURATION.upperChamfer / 2
      const upperChamferZ = totalLength - PILLAR_CONFIGURATION.upperChamfer / 2
      try {
        expect(probeVolumeAt(shape, 3.4, 0.4)).toBeGreaterThan(0)
        expect(probeVolumeAt(shape, 3.6, 0.4)).toBeLessThan(1e-8)
        expect(
          probeVolumeAt(shape, 3.4, PILLAR_CONFIGURATION.baseHeight - 0.01),
        ).toBeGreaterThan(0)
        expect(
          probeVolumeAt(shape, 3.4, PILLAR_CONFIGURATION.baseHeight + 0.01),
        ).toBeLessThan(1e-8)
        expect(
          probeVolumeAt(
            shape,
            bodyRadius - 0.01,
            PILLAR_CONFIGURATION.baseHeight + 0.05,
            0.005,
          ),
        ).toBeGreaterThan(0)
        expect(
          probeVolumeAt(
            shape,
            bodyRadius + 0.01,
            PILLAR_CONFIGURATION.baseHeight + 0.05,
            0.005,
          ),
        ).toBeLessThan(1e-8)
        expect(
          probeVolumeAt(
            shape,
            upperChamferBoundaryRadius - 0.15,
            upperChamferZ,
          ),
        ).toBeGreaterThan(0)
        expect(
          probeVolumeAt(
            shape,
            upperChamferBoundaryRadius + 0.15,
            upperChamferZ,
          ),
        ).toBeLessThan(1e-8)
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )
})
