import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  importOpenGridDetachableCornerSeatReference,
  importOpenGridDetachableCornerSeatHolderReference,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import {
  buildOpenGridStackableBox,
  assertOpenGridStackableBoxGeometry,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  normalizeOpenGridParameters,
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

let detachableCornerSeatReference: Shape3D
let detachableCornerSeatHolderReference: Shape3D

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
  detachableCornerSeatReference =
    await importOpenGridDetachableCornerSeatReference(
      new Blob([
        readFileSync(
          new URL(
            '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-v13.step',
            import.meta.url,
          ),
        ),
      ]),
    )
  detachableCornerSeatHolderReference =
    await importOpenGridDetachableCornerSeatHolderReference(
      new Blob([
        readFileSync(
          new URL(
            '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-holder-11.step',
            import.meta.url,
          ),
        ),
      ]),
    )
})

afterAll(() => {
  detachableCornerSeatReference.delete()
  detachableCornerSeatHolderReference.delete()
})

function intersectionVolume(a: Shape3D, b: Shape3D): number {
  const intersection = a.intersect(b)
  try {
    return measureVolume(intersection)
  } finally {
    intersection.delete()
  }
}

describe('stacking feet on openGrid boards', () => {
  it('rejects missing straight support after clearing the board junctions', () => {
    const input = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 4,
      height: 10,
      cornerSeatMode: 'none' as const,
    }
    const shape = buildOpenGridStackableBox(input)
    const foot = OPENGRID_STACKABLE_BOX_CONFIGURATION
    const halfWidth = (foot.gridPitch - foot.clearanceTotal) / 2
    const cellCenterY = (-input.y * foot.gridPitch) / 2 + foot.gridPitch / 2
    const cutter = makeBox(
      [halfWidth - 4, cellCenterY - 2.1, 0.4],
      [halfWidth, cellCenterY + 2.1, 3.7],
    )
    const damaged = shape.cut(cutter)
    try {
      expect(() => assertOpenGridStackableBoxGeometry(damaged, input)).toThrow()
    } finally {
      damaged.delete()
      cutter.delete()
      shape.delete()
    }
  }, 120_000)

  it.each([
    { x: 1, y: 1, variant: 'Lite' as const },
    { x: 1, y: 2, variant: 'Lite' as const },
    { x: 2, y: 2, variant: 'Lite' as const },
    { x: 1, y: 1, variant: 'Full' as const },
    { x: 1, y: 2, variant: 'Full' as const },
    { x: 2, y: 2, variant: 'Full' as const },
    { x: 1.5, y: 1, variant: 'Lite' as const },
    { x: 1, y: 1.5, variant: 'Full' as const },
    { x: 1.5, y: 1.5, variant: 'Lite' as const },
    { x: 0.5, y: 1, variant: 'Lite' as const },
    { x: 1, y: 0.5, variant: 'Full' as const },
    { x: 0.5, y: 0.5, variant: 'Lite' as const },
    {
      x: 1,
      y: 1,
      variant: 'Lite' as const,
      cornerSeatMode: 'detachable-corner-seat' as const,
    },
  ])(
    'seats and lifts $x×$y on $variant ($cornerSeatMode)',
    async ({ x, y, variant, cornerSeatMode }) => {
      const board = await buildOpenGridBRep(
        normalizeOpenGridParameters({
          ...OPENGRID_CONFIGURATION.defaultParameters,
          rows: Math.max(1, Math.floor(y)),
          columns: Math.max(1, Math.floor(x)),
          halfCellX: Number.isInteger(x) ? 'none' : 'right',
          halfCellY: Number.isInteger(y) ? 'none' : 'top',
          variant,
          chamfers: 'none',
          screwMode: 'none',
          connectorHoles: 'none',
        }),
      )
      const box = buildOpenGridStackableBox(
        {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          x,
          y,
          height: 10,
          cornerSeatMode: cornerSeatMode ?? 'none',
        },
        { detachableCornerSeatReference, detachableCornerSeatHolderReference },
      )
      const foot = OPENGRID_STACKABLE_BOX_CONFIGURATION
      const grid = OPENGRID_CONFIGURATION
      // Independent contact calculation for the two straight 45-degree faces.
      const guideTop =
        foot.bottomFootChamferHeight +
        foot.bottomSupportBandHeight +
        foot.wallThickness +
        foot.topRailInnerChamfer -
        foot.topRailMiddleChamfer
      const boardTopInset =
        (grid.gridPitch - grid.tileInnerSize) / 2 - grid.insideGridTopChamfer
      const insertionDepth = guideTop - boardTopInset + foot.clearanceTotal / 2
      // A standalone half-cell foot sits in the extension of a larger board.
      const offsetX = x < 1 ? grid.gridPitch / 2 : 0
      const offsetY = y < 1 ? grid.gridPitch / 2 : 0
      const seatedZ =
        OPENGRID_CONFIGURATION.variants[variant].thickness - insertionDepth
      try {
        for (const lift of [0, 0.2, 1, 2, insertionDepth]) {
          const placed = box.clone().translate(offsetX, offsetY, seatedZ + lift)
          try {
            expect(
              intersectionVolume(board, placed),
              `lift=${lift}`,
            ).toBeLessThan(1e-5)
          } finally {
            placed.delete()
          }
        }
        for (const [dx, dy] of [
          [0.25, 0],
          [-0.25, 0],
          [0, 0.25],
          [0, -0.25],
        ]) {
          const shifted = box
            .clone()
            .translate(offsetX + dx, offsetY + dy, seatedZ)
          try {
            expect(intersectionVolume(board, shifted)).toBeGreaterThan(0.01)
          } finally {
            shifted.delete()
          }
        }
        const below = box.clone().translate(offsetX, offsetY, seatedZ - 0.05)
        try {
          expect(intersectionVolume(board, below)).toBeGreaterThan(0.01)
        } finally {
          below.delete()
        }
      } finally {
        box.delete()
        board.delete()
      }
    },
    120_000,
  )
})
