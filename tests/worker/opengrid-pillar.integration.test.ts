import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeCylinder, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForPillar,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
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
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-v13.step',
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
      length: 3.8,
      offset: 0,
    }
    const shape = await buildPillar(parameters, {
      detachableCornerSeatReference: reference,
    })
    try {
      const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
      const actual = shapeBounds(shape)
      expect(actual[0]?.[0]).toBeCloseTo(configuration.male.bounds.min[0], 5)
      expect(actual[0]?.[1]).toBeCloseTo(-2.45, 5)
      expect(actual[0]?.[2]).toBeCloseTo(configuration.male.bounds.min[2], 5)
      expect(actual[1]?.[0]).toBeCloseTo(configuration.male.bounds.max[0], 5)
      expect(actual[1]?.[1]).toBeCloseTo(2.45, 5)
      expect(actual[1]?.[2]).toBeCloseTo(configuration.male.bounds.max[2], 5)
      expect(actual[1]?.[2]).toBeCloseTo(5.3, 5)
      expect(probeVolumeAt(shape, 2.4, 3.75)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.5, 3.75)).toBeLessThan(1e-8)
      expect(
        probeVolumeAt(shape, 0, configuration.male.indicator.depth / 2),
      ).toBeLessThanOrEqual(
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance,
      )
      expect(
        probeVolumeAt(shape, 0, configuration.male.indicator.depth + 0.02),
      ).toBeGreaterThan(0)
      // The slot runs along local X: void inside the slot off-center on X,
      // material beside it on Y.
      expect(probeVolumeAt(shape, 1.2, 0.2)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, -1.2, 0.2)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 0, 0.2, 0.05, 1.2)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 0, 0.2, 0.05, -1.2)).toBeGreaterThan(0)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(measureVolume(shape)).toBeLessThan(referenceVolume)
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

  it('builds the detachable corner seat with a parameterized locating body', async () => {
    const reference = await importOpenGridDetachableCornerSeatReference(
      new Blob([await readFile(DETACHABLE_CORNER_SEAT_ASSET_URL)], {
        type: 'model/step',
      }),
    )
    const referenceVolume = measureVolume(reference)
    const parameters: PillarParameters = {
      mode: 'detachable-corner-seat',
      length: 5,
      offset: 0.3,
    }
    const shape = await buildPillar(parameters, {
      detachableCornerSeatReference: reference,
    })
    try {
      const expected = boundsForPillar(parameters)
      const actual = shapeBounds(shape)
      expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(actual[0]?.[2]).toBeCloseTo(0, 2)
      expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(actual[1]?.[2]).toBeCloseTo(6.5, 2)
      // Ø5.2 locating body spans Z=0..5 with the shared lead-in and slot.
      expect(probeVolumeAt(shape, 2.55, 4.95)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.75, 4.95)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 0, 0.2)).toBeLessThanOrEqual(
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance,
      )
      expect(probeVolumeAt(shape, 0, 0.42)).toBeGreaterThan(0)
      // The unmodified leaf head rides on top at Z=5..6.5.
      expect(probeVolumeAt(shape, 2.55, 5.675)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.95, 5.675)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.4, 5.675, 0.05, 0.85)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.4, 5.675, 0.05, 1.15)).toBeLessThan(1e-8)
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

  it('builds the detachable corner seat with a negative XY increment', async () => {
    const reference = await importOpenGridDetachableCornerSeatReference(
      new Blob([await readFile(DETACHABLE_CORNER_SEAT_ASSET_URL)], {
        type: 'model/step',
      }),
    )
    const parameters: PillarParameters = {
      mode: 'detachable-corner-seat',
      length: 3.8,
      offset: -1,
    }
    const shape = await buildPillar(parameters, {
      detachableCornerSeatReference: reference,
    })
    try {
      const expected = boundsForPillar(parameters)
      const actual = shapeBounds(shape)
      expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(actual[0]?.[1]).toBeCloseTo(-1.95, 2)
      expect(actual[1]?.[2]).toBeCloseTo(5.3, 2)
      expect(probeVolumeAt(shape, 1.9, 2)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.05, 2)).toBeLessThan(1e-8)
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      expect(assertPillarShapeQuality(shape, parameters, mesh).passed).toBe(
        true,
      )
    } finally {
      deleteShape(shape)
      deleteShape(reference)
    }
  }, 180_000)

  it('rejects an off-step seat locating length before geometry generation', async () => {
    await expect(
      buildPillar({
        mode: 'detachable-corner-seat',
        length: 3.85,
        offset: 0,
      }),
    ).rejects.toThrow('PILLAR_PARAMETERS_INVALID')
  })

  it.each([
    { mode: 'positioning', length: 10, offset: 0 },
  ] as PillarParameters[])(
    'builds a valid centered positioning pillar for %#',
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

  it('builds the custom-length Ø4.9 mm positioning profile with both end chamfers', async () => {
    const parameters: PillarParameters = {
      mode: 'positioning',
      length: 25,
      offset: 0,
    }
    const shape = await buildPillar(parameters)
    try {
      const actual = shapeBounds(shape)
      expect(actual[0]?.[0]).toBeCloseTo(-2.45, 2)
      expect(actual[0]?.[1]).toBeCloseTo(-2.45, 2)
      expect(actual[0]?.[2]).toBeCloseTo(0, 2)
      expect(actual[1]?.[0]).toBeCloseTo(2.45, 2)
      expect(actual[1]?.[1]).toBeCloseTo(2.45, 2)
      expect(actual[1]?.[2]).toBeCloseTo(25, 2)

      expect(probeVolumeAt(shape, 2.2, 0.1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.5, 0.1)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.4, 1.1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.5, 1.1)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.4, 24.4)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.5, 24.4)).toBeLessThan(1e-8)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('expands the custom-length positioning body in XY while keeping height fixed', async () => {
    const parameters: PillarParameters = {
      mode: 'positioning',
      length: 25,
      offset: 1,
    }
    const shape = await buildPillar(parameters)
    try {
      const actual = shapeBounds(shape)
      expect(actual[0]?.[0]).toBeCloseTo(-2.95, 2)
      expect(actual[0]?.[1]).toBeCloseTo(-2.95, 2)
      expect(actual[0]?.[2]).toBeCloseTo(0, 2)
      expect(actual[1]?.[0]).toBeCloseTo(2.95, 2)
      expect(actual[1]?.[1]).toBeCloseTo(2.95, 2)
      expect(actual[1]?.[2]).toBeCloseTo(25, 2)
      expect(probeVolumeAt(shape, 2.9, 2)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 3, 2)).toBeLessThan(1e-8)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('expands the positioning pillar in XY without moving its center or Z base', async () => {
    const parameters: PillarParameters = {
      mode: 'positioning',
      length: 25,
      offset: 1,
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
      expect(actual[1]?.[2]).toBeCloseTo(25, 2)
      expect(probeVolumeAt(shape, 2.9, 0.4)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 3, 0.4)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.9, 1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 3, 1)).toBeLessThan(1e-8)
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
      mode: 'positioning',
      length: 25,
      offset: -1,
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

  it('uses a 0.2 mm chamfer at both ends of the positioning pillar', async () => {
    const parameters: PillarParameters = {
      mode: 'positioning',
      length: 25,
      offset: 0,
    }
    const shape = await buildPillar(parameters)
    try {
      expect(probeVolumeAt(shape, 2.2, 0.1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.5, 0.1)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.2, 24.9)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.5, 24.9)).toBeLessThan(1e-8)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)
})
