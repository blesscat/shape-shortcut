import { describe, expect, it } from 'vitest'

import type { ScenePlacement } from '../../src/cad-contract/scene'
import type { ModelBounds } from '../../src/cad-contract/units'
import {
  boundsForOpenGridStackableBox,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  absoluteCellsFor,
  cellsForInstance,
  findFreeAnchorCell,
  firstPlacementConflict,
  overlappingInstanceIds,
  rotatedFootprintAABB,
  type PlaygroundCellRange,
  type PlaygroundCellsEntry,
} from '../../src/features/cad/playground/occupancy'

function placement(
  cellX: number,
  cellY: number,
  rotation: ScenePlacement['rotation'] = 0,
): ScenePlacement {
  return { cellX, cellY, rotation, supportedBy: null }
}

/** Entry occupying `width` x `height` cells with its min corner on the anchor. */
function cellsEntry(
  id: string,
  cellX: number,
  cellY: number,
  width = 1,
  height = 1,
): PlaygroundCellsEntry {
  return {
    id,
    relativeCells: {
      minCellX: 0,
      maxCellX: width - 1,
      minCellY: 0,
      maxCellY: height - 1,
    },
    placement: { cellX, cellY },
  }
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
    const existing = [cellsEntry('a', 0, 0)]
    expect(firstPlacementConflict([...existing, cellsEntry('b', 0, 0)])).toBe(
      'b',
    )
    expect(
      firstPlacementConflict([...existing, cellsEntry('b', 1, 0)]),
    ).toBeNull()
  })

  it('flags both sides of each overlap', () => {
    const flagged = overlappingInstanceIds([
      cellsEntry('a', 0, 0),
      cellsEntry('b', 0, 0),
      cellsEntry('c', 5, 5),
    ])
    expect([...flagged].sort()).toEqual(['a', 'b'])
  })

  it('flags every instance in an overlap chain', () => {
    const flagged = overlappingInstanceIds([
      cellsEntry('a', 0, 0, 2),
      cellsEntry('b', 1, 0, 2),
      cellsEntry('c', 2, 0, 2),
    ])
    expect([...flagged].sort()).toEqual(['a', 'b', 'c'])
  })

  it('leaves adjacent and disjoint instances unflagged', () => {
    const flagged = overlappingInstanceIds([
      cellsEntry('a', 0, 0),
      cellsEntry('b', 1, 0),
      cellsEntry('c', -3, -3),
    ])
    expect(flagged.size).toBe(0)
  })

  it('respects negative anchor-relative offsets from socket anchoring', () => {
    // A wall display body overhanging one cell left of and below its
    // socket-grid anchor conflicts with a neighbour the anchor alone would
    // clear.
    const overhanging: PlaygroundCellsEntry = {
      id: 'a',
      relativeCells: { minCellX: -1, maxCellX: 1, minCellY: -1, maxCellY: 1 },
      placement: { cellX: 2, cellY: 2 },
    }
    expect(absoluteCellsFor(overhanging)).toEqual({
      minCellX: 1,
      maxCellX: 3,
      minCellY: 1,
      maxCellY: 3,
    })
    expect(firstPlacementConflict([overhanging, cellsEntry('b', 3, 3)])).toBe(
      'b',
    )
    expect(
      firstPlacementConflict([overhanging, cellsEntry('b', 4, 1)]),
    ).toBeNull()
  })

  it('finds a free anchor cell next to existing instances', () => {
    const existing = [cellsEntry('a', 0, 0), cellsEntry('b', 1, 0)]
    const relative: PlaygroundCellRange = {
      minCellX: 0,
      maxCellX: 0,
      minCellY: 0,
      maxCellY: 0,
    }
    const free = findFreeAnchorCell(relative, existing)
    const range = absoluteCellsFor({
      id: 'c',
      relativeCells: relative,
      placement: { cellX: free.cellX, cellY: free.cellY },
    })
    for (const occupied of existing) {
      const taken = absoluteCellsFor(occupied)
      const overlaps =
        range.minCellX <= taken.maxCellX &&
        taken.minCellX <= range.maxCellX &&
        range.minCellY <= taken.maxCellY &&
        taken.minCellY <= range.maxCellY
      expect(overlaps).toBe(false)
    }
  })

  it('finds a free anchor whose overhanging footprint clears neighbours', () => {
    const existing = [cellsEntry('a', 0, 0)]
    const relative: PlaygroundCellRange = {
      minCellX: -1,
      maxCellX: 0,
      minCellY: -1,
      maxCellY: 0,
    }
    const free = findFreeAnchorCell(relative, existing)
    const range = absoluteCellsFor({
      id: 'c',
      relativeCells: relative,
      placement: { cellX: free.cellX, cellY: free.cellY },
    })
    const taken = absoluteCellsFor(existing[0]!)
    const overlaps =
      range.minCellX <= taken.maxCellX &&
      taken.minCellX <= range.maxCellX &&
      range.minCellY <= taken.maxCellY &&
      taken.minCellY <= range.maxCellY
    expect(overlaps).toBe(false)
  })
})
