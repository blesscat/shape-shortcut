import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  type OpenGridDividerParameters,
  type OpenGridOpenShelfParameters,
  type OpenGridStackableBoxParameters,
  type OpenGridStackableCylinderParameters,
} from '../../src/cad-contract/units'
import { buildOpenGridDivider } from '../../src/cad-kernel/components/opengrid-divider/builder'
import { buildOpenGridOpenShelf } from '../../src/cad-kernel/components/opengrid-open-shelf/builder'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'

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

type FaceRecord = {
  surfaceType: string
  min: [number, number, number]
  max: [number, number, number]
}

const BOTTOM_FILLET_RADIUS =
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not hide the geometry assertion.
  }
}

function faceRecordsFor(shape: Shape3D): FaceRecord[] {
  return shape.faces.map((face) => {
    const boundingBox = face.boundingBox
    try {
      const [min, max] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      return {
        surfaceType: face.surface.surfaceType,
        min,
        max,
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  })
}

function hasBottomFillet(
  records: FaceRecord[],
  options: {
    minimumPlanSpan: number
    minimumZ: number
    maximumZ: number
    minimumZSpan?: number
    surfaceTypes: readonly string[]
  },
): boolean {
  return records.some((record) => {
    const planSpan = Math.max(
      record.max[0] - record.min[0],
      record.max[1] - record.min[1],
    )
    const zSpan = record.max[2] - record.min[2]
    return (
      options.surfaceTypes.includes(record.surfaceType) &&
      planSpan >= options.minimumPlanSpan &&
      record.min[2] >= options.minimumZ - 0.05 &&
      record.max[2] <= options.maximumZ + 0.05 &&
      zSpan >= (options.minimumZSpan ?? BOTTOM_FILLET_RADIUS * 0.7)
    )
  })
}

function hasIntegratedSeatChamfer(records: FaceRecord[]): boolean {
  const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  return hasBottomFillet(records, {
    minimumPlanSpan: 4.5,
    minimumZ: configuration.integratedSeatMinZ,
    maximumZ:
      configuration.integratedSeatMinZ +
      configuration.integratedSeatBottomChamfer,
    minimumZSpan: configuration.integratedSeatBottomChamfer * 0.7,
    surfaceTypes: ['CONE'],
  })
}

function hasLocatingPegFillet(
  records: FaceRecord[],
  minimumZ: number,
): boolean {
  return hasBottomFillet(records, {
    minimumPlanSpan: 4.5,
    minimumZ,
    maximumZ: minimumZ + BOTTOM_FILLET_RADIUS,
    surfaceTypes: ['TORUS'],
  })
}

describe('OpenGrid bottom edge finishing', () => {
  it('rounds the divider base and chamfers every locating peg', async () => {
    const parameters: OpenGridDividerParameters = {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
    }
    const shape = await buildOpenGridDivider(parameters)
    try {
      const records = faceRecordsFor(shape)
      expect(
        hasBottomFillet(records, {
          minimumPlanSpan: 10,
          minimumZ: 0,
          maximumZ: BOTTOM_FILLET_RADIUS,
          surfaceTypes: ['CYLINDRE'],
        }),
      ).toBe(true)
      expect(hasIntegratedSeatChamfer(records)).toBe(true)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('cuts square-section board-corner relief and chamfers integrated seats', () => {
    const parameters: OpenGridStackableBoxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'integrated',
    }
    const shape = buildOpenGridStackableBox(parameters)
    try {
      const records = faceRecordsFor(shape)
      // The square-section board-corner relief is cut at every grid junction,
      // so it supersedes the R0.5 bottom-edge fillet band (see the
      // square-section-only relief requirement). The finishing gate asserts
      // the relief termination surface near the chamfer-start datum instead.
      expect(
        hasBottomFillet(records, {
          minimumPlanSpan: 2.5,
          minimumZ: 2.325 - 0.15,
          maximumZ: 2.325 + 0.15,
          minimumZSpan: 0,
          surfaceTypes: ['PLANE'],
        }),
      ).toBe(true)
      expect(hasIntegratedSeatChamfer(records)).toBe(true)
      expect(hasLocatingPegFillet(records, -3.8)).toBe(false)
    } finally {
      deleteShape(shape)
    }
  })

  it('keeps the stackable cylinder base fillet and chamfers integrated seats', () => {
    const parameters: OpenGridStackableCylinderParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      bottomSeatMode: 'integrated',
    }
    const shape = buildOpenGridStackableCylinder(parameters)
    try {
      const records = faceRecordsFor(shape)
      expect(
        hasBottomFillet(records, {
          minimumPlanSpan: 10,
          minimumZ: 0,
          maximumZ: BOTTOM_FILLET_RADIUS,
          minimumZSpan: 0.1,
          surfaceTypes: ['TORUS'],
        }),
      ).toBe(true)
      expect(hasIntegratedSeatChamfer(records)).toBe(true)
      expect(hasLocatingPegFillet(records, -3.8)).toBe(false)
    } finally {
      deleteShape(shape)
    }
  })

  it('keeps the open-shelf base fillet and chamfers every locating peg', async () => {
    const parameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
    }
    const shape = await buildOpenGridOpenShelf(parameters)
    try {
      const records = faceRecordsFor(shape)
      expect(
        hasBottomFillet(records, {
          minimumPlanSpan: 10,
          minimumZ: 0,
          maximumZ: BOTTOM_FILLET_RADIUS,
          surfaceTypes: ['CYLINDRE', 'TORUS'],
        }),
      ).toBe(true)
      expect(hasIntegratedSeatChamfer(records)).toBe(true)
      expect(hasLocatingPegFillet(records, -3.8)).toBe(false)
    } finally {
      deleteShape(shape)
    }
  })
})
