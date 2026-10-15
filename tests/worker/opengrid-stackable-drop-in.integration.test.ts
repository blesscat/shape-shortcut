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
import { buildOpenGridOrganizerBox } from '../../src/cad-kernel/components/opengrid-organizer-box/builder'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  normalizeOpenGridParameters,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  openGridOrganizerBoxLayoutFor,
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

function buildSeatFreeTrial(model: 'grid-box' | 'organizer-box'): Shape3D {
  if (model === 'grid-box') {
    return buildOpenGridStackableBox({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 2,
      cornerSeatMode: 'none',
      topRimMode: 'stacking-rail',
      bottomMode: 'stacking',
    })
  }
  const input = {
    ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    holeCountX: 2,
    holeCountY: 2,
    wallThickness: 3,
    cornerSeatMode: 'none' as const,
    boxMode: 'stackable' as const,
  }
  const layout = openGridOrganizerBoxLayoutFor(input)
  expect([layout.gridCountX, layout.gridCountY]).toEqual([2, 2])
  return buildOpenGridOrganizerBox(input)
}

function boardOverlapAt(
  board: Shape3D,
  box: Shape3D,
  z: number,
  dx = 0,
): number {
  const positioned = box.clone().translate(dx, 0, z)
  try {
    return intersectionVolume(board, positioned)
  } finally {
    positioned.delete()
  }
}

describe('current seat-free direct resting', () => {
  it.each([
    { model: 'grid-box' as const, variant: 'Lite' as const },
    { model: 'grid-box' as const, variant: 'Full' as const },
    { model: 'organizer-box' as const, variant: 'Lite' as const },
    { model: 'organizer-box' as const, variant: 'Full' as const },
  ])(
    '$model rests and lifts on a matching $variant board',
    async ({ model, variant }) => {
      const board = await buildOpenGridBRep(
        normalizeOpenGridParameters({
          ...OPENGRID_CONFIGURATION.defaultParameters,
          rows: 2,
          columns: 2,
          variant,
          chamfers: 'none',
          screwMode: 'none',
          connectorHoles: 'none',
        }),
      )
      let box: Shape3D | undefined
      try {
        box = buildSeatFreeTrial(model)
        const boardTop = OPENGRID_CONFIGURATION.variants[variant].thickness
        let collidingZ =
          boardTop - OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight
        let clearZ = boardTop + 0.1
        expect(boardOverlapAt(board, box, collidingZ)).toBeGreaterThan(0.01)
        expect(boardOverlapAt(board, box, clearZ)).toBeLessThan(1e-5)
        // Find actual support instead of reusing the obsolete deep seating datum.
        for (let step = 0; step < 14; step += 1) {
          const candidateZ = (collidingZ + clearZ) / 2
          if (boardOverlapAt(board, box, candidateZ) > 1e-5) {
            collidingZ = candidateZ
          } else {
            clearZ = candidateZ
          }
        }
        expect(clearZ).toBeLessThan(boardTop)
        expect(boardOverlapAt(board, box, clearZ - 0.05)).toBeGreaterThan(0.01)
        expect(boardOverlapAt(board, box, clearZ, 1)).toBeGreaterThan(0.01)
        for (const lift of [0, 0.2, 1, boardTop - clearZ]) {
          expect(boardOverlapAt(board, box, clearZ + lift)).toBeLessThan(1e-5)
        }
      } finally {
        box?.delete()
        board.delete()
      }
    },
    120_000,
  )
})

describe('stacking feet on openGrid boards', () => {
  it('rejects missing straight guide support for the relieved foot', () => {
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

  it('cuts the bottom square corner section and keeps material above it', () => {
    const box = buildOpenGridStackableBox({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
      height: 10,
      cornerSeatMode: 'none',
    })
    const belowChamfer = makeBox([10, 10, 2.2], [10.2, 10.2, 2.3])
    const aboveChamfer = makeBox([10, 10, 2.35], [10.2, 10.2, 2.45])
    try {
      expect(intersectionVolume(box, belowChamfer)).toBeLessThan(0.001)
      expect(intersectionVolume(box, aboveChamfer)).toBeGreaterThan(0.001)
    } finally {
      aboveChamfer.delete()
      belowChamfer.delete()
      box.delete()
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
    'stops corner relief at the $variant board chamfer for $x×$y ($cornerSeatMode)',
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
        const placed = box.clone().translate(offsetX, offsetY, seatedZ)
        try {
          expect(intersectionVolume(board, placed)).toBeGreaterThan(0.01)
        } finally {
          placed.delete()
        }
      } finally {
        box.delete()
        board.delete()
      }
    },
    120_000,
  )
})
