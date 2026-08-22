import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import { inspectOpenGridShapeQuality } from '../../src/cad-kernel/components/opengrid/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  normalizeOpenGridParameters,
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
  type OpenGridParameters,
} from '../../src/cad-contract/units'

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

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function parameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  })
}

function readShapeBounds(shape: Shape3D): {
  min: [number, number, number]
  max: [number, number, number]
} {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return { min, max }
  } finally {
    boundingBox.delete()
  }
}

function measureIntersectionVolume(
  shape: Shape3D,
  minimum: [number, number, number],
  maximum: [number, number, number],
): number {
  const probe = makeBox(minimum, maximum)
  const intersection = shape.intersect(probe)
  try {
    return measureVolume(intersection)
  } finally {
    if (intersection !== shape && intersection !== probe) intersection.delete()
    probe.delete()
  }
}

describe('OpenGrid target frame builder', () => {
  it.each(['Lite', 'Full', 'Heavy', 'Hybrid'] as const)(
    'reaches a 100 mm target on the X axis for %s',
    async (variant) => {
      const input = parameters({
        variant,
        rows: 2,
        columns: 3,
        halfCellX: 'right',
        halfCellY: 'none',
        targetWidth: 100,
        targetDepth: 56,
        fitToTarget: true,
        chamfers: 'none',
        connectorHoles: 'none',
        screwMode: 'none',
      })
      const shape = await buildOpenGridBRep(input)
      try {
        const bounds = readShapeBounds(shape)
        expect(bounds.min[0]).toBeCloseTo(-50, 5)
        expect(bounds.max[0]).toBeCloseTo(50, 5)
        expect(bounds.min[1]).toBeCloseTo(-28, 5)
        expect(bounds.max[1]).toBeCloseTo(28, 5)
        expect(bounds.max[2]).toBeCloseTo(
          OPENGRID_CONFIGURATION.variants[variant].thickness,
          5,
        )
        expect(
          measureIntersectionVolume(
            shape,
            [-49.9, -0.5, 0.5],
            [-48.95, 0.5, bounds.max[2] - 0.5],
          ),
        ).toBeGreaterThan(0.01)

        const quality = inspectOpenGridShapeQuality(
          shape,
          input,
          meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION),
        )
        expect(quality.passed, quality.failures.join('; ')).toBe(true)
      } finally {
        shape.delete()
      }
    },
    60_000,
  )

  it('splits a dual-axis remainder across all four physical frame sides', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 2,
      columns: 3,
      halfCellX: 'right',
      halfCellY: 'top',
      targetWidth: 100,
      targetDepth: 72,
      fitToTarget: true,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const shape = await buildOpenGridBRep(input)
    try {
      const bounds = readShapeBounds(shape)
      expect(bounds.min[0]).toBeCloseTo(-50, 5)
      expect(bounds.max[0]).toBeCloseTo(50, 5)
      expect(bounds.min[1]).toBeCloseTo(-36, 5)
      expect(bounds.max[1]).toBeCloseTo(36, 5)
      expect(
        measureIntersectionVolume(shape, [-49.9, -0.5, 1], [-48.95, 0.5, 5.8]),
      ).toBeGreaterThan(0.01)
      expect(
        measureIntersectionVolume(shape, [-0.5, 35.05, 1], [0.5, 35.95, 5.8]),
      ).toBeGreaterThan(0.01)
      const quality = inspectOpenGridShapeQuality(
        shape,
        input,
        meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION),
      )
      expect(quality.passed, quality.failures.join('; ')).toBe(true)
    } finally {
      shape.delete()
    }
  }, 60_000)

  it('keeps the default OpenGrid details valid with a target frame', async () => {
    const input = parameters({
      rows: 2,
      columns: 3,
      halfCellX: 'right',
      targetWidth: 100,
      targetDepth: 58,
      fitToTarget: true,
    })
    const shape = await buildOpenGridBRep(input)
    try {
      const quality = inspectOpenGridShapeQuality(
        shape,
        input,
        meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION),
      )
      expect(quality.passed, quality.failures.join('; ')).toBe(true)
    } finally {
      shape.delete()
    }
  }, 60_000)

  it('generates a centered frame when each side remainder is below a half-cell', async () => {
    const input = parameters({
      rows: 3,
      columns: 3,
      targetWidth: 100,
      targetDepth: 100,
      fitToTarget: true,
    })
    const shape = await buildOpenGridBRep(input)
    try {
      const bounds = readShapeBounds(shape)
      expect(bounds.min[0]).toBeCloseTo(-50, 5)
      expect(bounds.max[0]).toBeCloseTo(50, 5)
      expect(bounds.min[1]).toBeCloseTo(-50, 5)
      expect(bounds.max[1]).toBeCloseTo(50, 5)
      const quality = inspectOpenGridShapeQuality(
        shape,
        input,
        meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION),
      )
      expect(quality.passed, quality.failures.join('; ')).toBe(true)
    } finally {
      shape.delete()
    }
  }, 60_000)
})
