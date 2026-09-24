import { describe, expect, it } from 'vitest'

import type { ScenePlacement } from '../../src/cad-contract/scene'
import type { ModelBounds } from '../../src/cad-contract/units'
import {
  boundsForOpenGridStackableBox,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  cellsForInstance,
  findFreeAnchorCell,
  firstPlacementConflict,
  rotatedFootprintAABB,
} from '../../src/features/cad/playground/occupancy'

function placement(
  cellX: number,
  cellY: number,
  rotation: ScenePlacement['rotation'] = 0,
): ScenePlacement {
  return { cellX, cellY, rotation, supportedBy: null }
}

function boxBounds(width: number, depth: number, height: number): ModelBounds {
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [width / 2, depth / 2, height],
  }
}

describe('playground occupancy', () => {
  it('maps a 2x1 OpenGrid stackable box to exactly two cells', () => {
    const bounds = boundsForOpenGridStackableBox({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 1,
    })
    const range = cellsForInstance({ bounds, placement: placement(0, 0) })
    expect(range).toEqual({
      minCellX: 0,
      maxCellX: 1,
      minCellY: 0,
      maxCellY: 0,
    })
  })

  it('maps a 1x1 OpenGrid box to exactly one cell', () => {
    const bounds = boundsForOpenGridStackableBox({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
    })
    const range = cellsForInstance({ bounds, placement: placement(5, 7) })
    expect(range).toEqual({
      minCellX: 5,
      maxCellX: 5,
      minCellY: 7,
      maxCellY: 7,
    })
  })

  it('covers conservative cells for non-grid components', () => {
    const range = cellsForInstance({
      bounds: boxBounds(30, 50, 40),
      placement: placement(0, 0),
    })
    expect(range.minCellX).toBe(0)
    expect(range.maxCellX).toBe(1)
    expect(range.minCellY).toBe(0)
    expect(range.maxCellY).toBe(1)
  })

  it('accepts negative coordinates without boundary errors', () => {
    const range = cellsForInstance({
      bounds: boxBounds(28, 28, 28),
      placement: placement(-4, -3),
    })
    expect(range).toEqual({
      minCellX: -4,
      maxCellX: -4,
      minCellY: -3,
      maxCellY: -3,
    })
  })

  it('rotates the footprint AABB around the instance origin', () => {
    const rotated = rotatedFootprintAABB(boxBounds(56, 28, 10), 90)
    expect(rotated.minX).toBeCloseTo(-14)
    expect(rotated.maxX).toBeCloseTo(14)
    expect(rotated.minY).toBeCloseTo(-28)
    expect(rotated.maxY).toBeCloseTo(28)

    const back = rotatedFootprintAABB(boxBounds(56, 28, 10), 270)
    expect(back.minX).toBeCloseTo(-14)
    expect(back.maxX).toBeCloseTo(14)
    expect(back.minY).toBeCloseTo(-28)
    expect(back.maxY).toBeCloseTo(28)

    const half = rotatedFootprintAABB(boxBounds(56, 28, 10), 180)
    expect(half.minX).toBeCloseTo(-28)
    expect(half.maxX).toBeCloseTo(28)
    expect(half.minY).toBeCloseTo(-14)
    expect(half.maxY).toBeCloseTo(14)
  })

  it('keeps a rotated 2x1 box on exactly two cells', () => {
    const bounds = boundsForOpenGridStackableBox({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 1,
    })
    const range = cellsForInstance({
      bounds,
      placement: placement(0, 0, 90),
    })
    expect(range.minCellX).toBe(0)
    expect(range.maxCellX).toBe(0)
    expect(range.minCellY).toBe(0)
    expect(range.maxCellY).toBe(1)
  })

  it('detects overlapping placements and accepts adjacent ones', () => {
    const bounds = boxBounds(28, 28, 10)
    const existing = [{ id: 'a', bounds, placement: placement(0, 0) }]
    expect(
      firstPlacementConflict([
        ...existing,
        { id: 'b', bounds, placement: placement(0, 0) },
      ]),
    ).toBe('b')
    expect(
      firstPlacementConflict([
        ...existing,
        { id: 'b', bounds, placement: placement(1, 0) },
      ]),
    ).toBeNull()
  })

  it('finds a free anchor cell next to existing instances', () => {
    const bounds = boxBounds(28, 28, 10)
    const existing = [
      { id: 'a', bounds, placement: placement(0, 0) },
      { id: 'b', bounds, placement: placement(1, 0) },
    ]
    const free = findFreeAnchorCell(bounds, existing)
    const range = cellsForInstance({
      bounds,
      placement: { ...placement(free.cellX, free.cellY) },
    })
    for (const occupied of existing) {
      const taken = cellsForInstance(occupied)
      const overlaps =
        range.minCellX <= taken.maxCellX &&
        taken.minCellX <= range.maxCellX &&
        range.minCellY <= taken.maxCellY &&
        taken.minCellY <= range.maxCellY
      expect(overlaps).toBe(false)
    }
  })
})
