import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { integratedSeatRecordCountFor } from '../../src/cad-kernel/components/opengrid-stackable-box/quality-interface'
import { countOrdinaryBottomHoleFaces } from '../../src/cad-kernel/components/opengrid-stackable-box/quality-holes'
import { readFaceQualityRecords } from '../../src/cad-kernel/components/opengrid-stackable-box/quality-metrics'
import {
  boundsForOpenGridStackableBox,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
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
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 1.5,
    y: 1.5,
    height: 20,
    cornerSeatMode: 'integrated',
    fullBottomHoleGrid: true,
    ...overrides,
  }
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not hide the geometry assertion.
  }
}

describe('OpenGrid stackable-box integrated seat profiles', () => {
  it.each([
    { name: 'stacking bottom', bottomMode: 'stacking' as const },
    {
      name: 'thin-shell bottom',
      bottomMode: 'thin-shell' as const,
      topRimMode: 'flat-top' as const,
    },
  ])(
    'fuses exact chamfered seats and preserves ordinary holes in the $name profile',
    ({ bottomMode, topRimMode }) => {
      const input = parameters({
        bottomMode,
        ...(topRimMode === undefined ? {} : { topRimMode }),
      })
      const shape = buildOpenGridStackableBox(input)
      try {
        const expectedSeatCount =
          openGridStackableBoxSocketCentersFor(input).length
        const expectedOrdinaryHoleCount =
          openGridStackableBoxOrdinaryBottomHoleCentersFor(input).length
        const expectedBounds = boundsForOpenGridStackableBox(input)

        expect(integratedSeatRecordCountFor(shape, input)).toBe(
          expectedSeatCount,
        )
        const integratedRecords = readFaceQualityRecords(shape).filter(
          (record) => record.surfaceType === 'CYLINDRE',
        )
        for (const [centerX, centerY] of openGridStackableBoxSocketCentersFor(
          input,
        )) {
          const record = integratedRecords.find((candidate) => {
            const candidateCenterX = (candidate.min[0] + candidate.max[0]) / 2
            const candidateCenterY = (candidate.min[1] + candidate.max[1]) / 2
            return (
              Math.abs(candidateCenterX - centerX) <= 0.08 &&
              Math.abs(candidateCenterY - centerY) <= 0.08
            )
          })
          expect(record).toBeDefined()
          expect(record!.max[0] - record!.min[0]).toBeCloseTo(5, 1)
          expect(record!.max[1] - record!.min[1]).toBeCloseTo(5, 1)
          expect(record!.max[2] - record!.min[2]).toBeCloseTo(
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight -
              OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatBottomChamfer,
            1,
          )
          expect(record!.min[2]).toBeCloseTo(
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ +
              OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatBottomChamfer,
            1,
          )
          expect(record!.max[2]).toBeCloseTo(0, 1)
        }
        expect(
          countOrdinaryBottomHoleFaces(
            shape,
            openGridStackableBoxOrdinaryBottomHoleCentersFor(input),
            input,
          ),
        ).toBe(expectedOrdinaryHoleCount)
        const actualBounds = boundsOf(shape)
        expect(actualBounds[0]?.[2]).toBeCloseTo(expectedBounds.min[2], 2)
        expect(actualBounds[1]?.[2]).toBeCloseTo(expectedBounds.max[2], 2)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )
})
