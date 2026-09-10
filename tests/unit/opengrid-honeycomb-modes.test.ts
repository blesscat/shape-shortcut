import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  buildOpenGridStackableCylinder,
  inspectOpenGridStackableCylinderInterface,
} from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import { openGridStackableCylinderBottomHoneycombCellCountFor } from '../../src/cad-kernel/lattice/opengrid-honeycomb'

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
})

function remember<T extends Shape3D>(shape: T): T {
  createdShapes.push(shape)
  return shape
}

afterEach(() => {
  for (const shape of createdShapes.splice(0)) shape.delete()
})

describe('OpenGrid honeycomb material-saving profile modes', () => {
  it.each([
    { name: 'box base-plate', model: 'box-base-plate' as const },
    { name: 'box thin-shell', model: 'box-thin-shell' as const },
  ])(
    'keeps $name honeycomb geometry valid',
    ({ model }) => {
      const shape = remember(
        buildOpenGridStackableBox({
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          height: 30,
          cornerSeatMode: 'none',
          basePlateMode: model === 'box-base-plate',
          thinShellMode: model === 'box-thin-shell',
          honeycombMode: true,
        }),
      )

      expect(measureVolume(shape)).toBeGreaterThan(0)
    },
    120_000,
  )

  it.each([
    { name: 'cylinder thin', bottomPlateMode: false },
    {
      name: 'cylinder bottom-plate',
      bottomPlateMode: true,
    },
  ])(
    'keeps $name honeycomb geometry valid',
    ({ bottomPlateMode }) => {
      const shape = remember(
        buildOpenGridStackableCylinder({
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          height: 30,
          bottomSeatMode: 'none',
          bottomPlateMode,
          honeycombMode: true,
        }),
      )

      expect(measureVolume(shape)).toBeGreaterThan(0)
    },
    120_000,
  )

  it.each([
    {
      name: 'cylinder thin',
      innerDiameter: 44,
      bottomPlateMode: false,
    },
    {
      name: 'cylinder bottom-plate',
      innerDiameter: 44,
      bottomPlateMode: true,
    },
  ])(
    'keeps the $name lower stacking boundary while adding eligible bottom honeycomb cells',
    ({ innerDiameter, bottomPlateMode }) => {
      const input = {
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        innerDiameter,
        height: 20,
        bottomPlateMode,
        bottomSeatMode: 'none' as const,
        honeycombMode: true,
      }
      const baselineInput = { ...input, honeycombMode: false }
      const honeycomb = remember(buildOpenGridStackableCylinder(input))
      const baseline = remember(buildOpenGridStackableCylinder(baselineInput))
      const honeycombReport = inspectOpenGridStackableCylinderInterface(
        honeycomb,
        input,
      )
      const baselineReport = inspectOpenGridStackableCylinderInterface(
        baseline,
        baselineInput,
      )

      expect(
        openGridStackableCylinderBottomHoneycombCellCountFor(input),
      ).toBeGreaterThan(0)
      expect(honeycombReport.bottomProtrusionVolume).toBeGreaterThan(0)
      expect(honeycombReport.bottomProtrusionVolume).toBeLessThan(
        baselineReport.bottomProtrusionVolume,
      )
      expect(honeycombReport.bottomMatingBoundaryProbeCount).toBe(
        baselineReport.bottomMatingBoundaryProbeCount,
      )
      expect(honeycombReport.bottomFootChamferFaceCount).toBe(
        baselineReport.bottomFootChamferFaceCount,
      )
      expect(honeycombReport.bottomFootChamferHeight).toBeCloseTo(
        baselineReport.bottomFootChamferHeight,
        4,
      )
      expect(honeycombReport.bottomOuterChamferFaceCount).toBe(
        baselineReport.bottomOuterChamferFaceCount,
      )
      expect(honeycombReport.bottomOuterChamferHeight).toBeCloseTo(
        baselineReport.bottomOuterChamferHeight,
        4,
      )
      expect(honeycombReport.lowerUnexpectedConicalFaceCount).toBe(
        baselineReport.lowerUnexpectedConicalFaceCount,
      )
      expect(measureVolume(honeycomb)).toBeLessThan(measureVolume(baseline))
    },
    120_000,
  )
})
