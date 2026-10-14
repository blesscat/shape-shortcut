import { describe, expect, it } from 'vitest'

import type { ScenePlacement } from '../../src/cad-contract/scene'
import type { ModelBounds } from '../../src/cad-contract/units'
import {
  boundsForOpenGridStackableBox,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  PLAYGROUND_STACK_CLEARANCE_MM,
  absoluteCellsFor,
  cellsForInstance,
  findFreeAnchorCell,
  rotatedFootprintAABB,
  stackedBaseZFor,
  stackConflictInstanceIds,
  type PlaygroundCellRange,
  type PlaygroundCellsEntry,
  type PlaygroundStackEntry,
} from '../../src/features/cad/playground/occupancy'
import {
  stackingInterfaceFor,
  stackingInterfacesCompatible,
  type StackingInterface,
} from '../../src/features/cad/playground/stacking-compatibility'

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

/** Fully stackable box interface: rail top, stacking bottom. */
const BOX_STACKING: StackingInterface = {
  top: true,
  bottom: true,
  cylinderDiameter: null,
  seatDatumMm: 25,
  seatingDropMm: 0.15,
}

/** No stacking interface: neither receives nor seats pieces. */
const NO_STACKING: StackingInterface = {
  top: false,
  bottom: false,
  cylinderDiameter: null,
  seatDatumMm: null,
  seatingDropMm: null,
}

function cylinderStacking(
  diameter: number,
  { bottom = true }: { bottom?: boolean } = {},
): StackingInterface {
  return {
    top: true,
    bottom,
    cylinderDiameter: diameter,
    seatDatumMm: 20,
    seatingDropMm: bottom ? 0.65 : null,
  }
}

/** Render gap between seated mating faces, from the occupancy module. */
const SEAT_GAP = PLAYGROUND_STACK_CLEARANCE_MM

/** Base Z for an entry seating directly on a support grounded at Z=0. */
const SEAT_ON_FLOOR = 25 - 0.15 + SEAT_GAP

const CYLINDER_SEAT_ON_FLOOR = 20 - 0.65 + SEAT_GAP

/** Stack entry occupying `width` x `height` cells with an authored height. */
function stackEntry(
  id: string,
  cellX: number,
  cellY: number,
  heightMm: number | null,
  stacking: StackingInterface = BOX_STACKING,
  width = 1,
  height = 1,
): PlaygroundStackEntry {
  return {
    ...cellsEntry(id, cellX, cellY, width, height),
    heightMm,
    stacking,
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

  /** Wraps plain cells entries as heightless, non-stacking instances. */
  function asStack(entry: PlaygroundCellsEntry): PlaygroundStackEntry {
    return { ...entry, heightMm: null, stacking: NO_STACKING }
  }

  it('detects overlapping placements and accepts adjacent ones', () => {
    const flagged = stackConflictInstanceIds(
      [cellsEntry('a', 0, 0), cellsEntry('b', 0, 0)].map(asStack),
      { zAware: false },
    )
    expect([...flagged].sort()).toEqual(['a', 'b'])
    expect(
      stackConflictInstanceIds(
        [cellsEntry('a', 0, 0), cellsEntry('b', 1, 0)].map(asStack),
        { zAware: false },
      ).size,
    ).toBe(0)
  })

  it('flags both sides of each overlap', () => {
    const flagged = stackConflictInstanceIds(
      [
        cellsEntry('a', 0, 0),
        cellsEntry('b', 0, 0),
        cellsEntry('c', 5, 5),
      ].map(asStack),
      { zAware: false },
    )
    expect([...flagged].sort()).toEqual(['a', 'b'])
  })

  it('flags every instance in an overlap chain', () => {
    const flagged = stackConflictInstanceIds(
      [
        cellsEntry('a', 0, 0, 2),
        cellsEntry('b', 1, 0, 2),
        cellsEntry('c', 2, 0, 2),
      ].map(asStack),
      { zAware: false },
    )
    expect([...flagged].sort()).toEqual(['a', 'b', 'c'])
  })

  it('leaves adjacent and disjoint instances unflagged', () => {
    const flagged = stackConflictInstanceIds(
      [
        cellsEntry('a', 0, 0),
        cellsEntry('b', 1, 0),
        cellsEntry('c', -3, -3),
      ].map(asStack),
      { zAware: false },
    )
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
    expect(
      stackConflictInstanceIds([overhanging, cellsEntry('b', 3, 3)].map(asStack), {
        zAware: false,
      }).has('b'),
    ).toBe(true)
    expect(
      stackConflictInstanceIds([overhanging, cellsEntry('b', 4, 1)].map(asStack), {
        zAware: false,
      }).has('b'),
    ).toBe(false)
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

  it('stacks a chain of fully overlapping instances on the mating datum', () => {
    const { baseZ } = stackedBaseZFor([
      stackEntry('a', 0, 0, 20),
      stackEntry('b', 0, 0, 30),
      stackEntry('c', 0, 0, 10),
    ])
    expect(baseZ.get('a')).toBe(0)
    expect(baseZ.get('b')).toBeCloseTo(SEAT_ON_FLOOR)
    expect(baseZ.get('c')).toBeCloseTo(SEAT_ON_FLOOR * 2)
  })

  it('stacks partially overlapping footprints only where they overlap', () => {
    // 'a' spans two cells; 'b' sits on cell x=1, 'c' rests on cell x=0.
    const { baseZ } = stackedBaseZFor([
      stackEntry('a', 0, 0, 20, BOX_STACKING, 2, 1),
      stackEntry('b', 1, 0, 10),
      stackEntry('c', 0, 0, 5),
    ])
    expect(baseZ.get('a')).toBe(0)
    expect(baseZ.get('b')).toBeCloseTo(SEAT_ON_FLOOR)
    expect(baseZ.get('c')).toBeCloseTo(SEAT_ON_FLOOR)
  })

  it('keeps heightless instances grounded and unsupported', () => {
    const { baseZ } = stackedBaseZFor([
      stackEntry('a', 0, 0, null),
      stackEntry('b', 0, 0, 10),
    ])
    expect(baseZ.get('a')).toBe(0)
    expect(baseZ.get('b')).toBe(0)
  })

  it('derives stacking from array order', () => {
    const first = stackedBaseZFor([
      stackEntry('a', 0, 0, 20),
      stackEntry('b', 0, 0, 10),
    ])
    expect(first.baseZ.get('a')).toBe(0)
    expect(first.baseZ.get('b')).toBeCloseTo(SEAT_ON_FLOOR)

    const reversed = stackedBaseZFor([
      stackEntry('b', 0, 0, 10),
      stackEntry('a', 0, 0, 20),
    ])
    expect(reversed.baseZ.get('b')).toBe(0)
    expect(reversed.baseZ.get('a')).toBeCloseTo(SEAT_ON_FLOOR)
  })

  it('lifts later overlapping instances onto the highest datum instead of colliding', () => {
    const entries = [
      stackEntry('a', 0, 0, 20, BOX_STACKING, 2, 1),
      stackEntry('b', 0, 0, 10),
      stackEntry('c', 1, 0, 10),
      stackEntry('d', 0, 0, 5, BOX_STACKING, 2, 1),
    ]
    // 'd' overlaps every earlier instance, so its base derives above all of
    // their datums: b and c are siblings seated on a, and d rests on the
    // greater of the two sibling datums.
    const { baseZ, matings } = stackedBaseZFor(entries)
    expect(baseZ.get('d')).toBeCloseTo(SEAT_ON_FLOOR * 2)
    expect(matings.has('b\u0000a')).toBe(true)
    expect(matings.has('c\u0000a')).toBe(true)
    expect(matings.has('d\u0000b')).toBe(true)
    expect(
      stackConflictInstanceIds(entries, {
        zAware: true,
        precomputedBaseZ: baseZ,
        matings,
      }).size,
    ).toBe(0)
  })

  it('flags a heightless instance against any footprint overlap', () => {
    const conflicts = stackConflictInstanceIds(
      [stackEntry('a', 0, 0, null), stackEntry('b', 0, 0, 10)],
      { zAware: true },
    )
    expect([...conflicts].sort()).toEqual(['a', 'b'])
  })

  it('leaves stacked and disjoint instances out of the conflict set', () => {
    const conflicts = stackConflictInstanceIds(
      [
        stackEntry('a', 0, 0, 20),
        stackEntry('b', 0, 0, 10),
        stackEntry('c', 5, 5, 10),
      ],
      { zAware: true },
    )
    expect(conflicts.size).toBe(0)
  })

  it('stacks cylinders only on the same inner diameter', () => {
    const entries = [
      stackEntry('a', 0, 0, 20, cylinderStacking(60)),
      stackEntry('b', 0, 0, 10, cylinderStacking(60)),
      stackEntry('c', 0, 0, 10, cylinderStacking(40)),
    ]
    const { baseZ, matings } = stackedBaseZFor(entries)
    expect(baseZ.get('b')).toBeCloseTo(CYLINDER_SEAT_ON_FLOOR)
    expect(baseZ.get('c')).toBe(0)
    const conflicts = stackConflictInstanceIds(entries, {
      zAware: true,
      precomputedBaseZ: baseZ,
      matings,
    })
    expect([...conflicts].sort()).toEqual(['a', 'c'])
  })

  it('lets mated pairs share their duplicated interface height', () => {
    // A low datum with a tall piece: the seated bounding box interpenetrates
    // the supporter's rail zone by design, and the mated pair must not flag.
    const lowDatum: StackingInterface = {
      ...BOX_STACKING,
      seatDatumMm: 15,
    }
    const entries = [
      stackEntry('a', 0, 0, 40, lowDatum),
      stackEntry('b', 0, 0, 40),
    ]
    const { baseZ, matings } = stackedBaseZFor(entries)
    expect(baseZ.get('b')).toBeCloseTo(15 - 0.15 + SEAT_GAP)
    const conflicts = stackConflictInstanceIds(entries, {
      zAware: true,
      precomputedBaseZ: baseZ,
      matings,
    })
    expect(conflicts.size).toBe(0)
  })

  it('never stacks a cylinder on a box or a box on a cylinder', () => {
    const entries = [
      stackEntry('box', 0, 0, 20, BOX_STACKING),
      stackEntry('cyl', 0, 0, 10, cylinderStacking(60)),
    ]
    expect(stackedBaseZFor(entries).baseZ.get('box')).toBe(0)
    expect(stackedBaseZFor(entries).baseZ.get('cyl')).toBe(0)
    expect(
      stackConflictInstanceIds(entries, { zAware: true }).size,
    ).toBe(2)
  })

  it('flags incompatible overlapping pairs on the desktop', () => {
    const conflicts = stackConflictInstanceIds(
      [
        stackEntry('a', 0, 0, 20, BOX_STACKING),
        stackEntry('b', 0, 0, 10, NO_STACKING),
      ],
      { zAware: true },
    )
    expect([...conflicts].sort()).toEqual(['a', 'b'])
  })

  it('does not resurrect conflicts for stacked pairs in wall orientation', () => {
    // Desktop-stacked pairs keep overlapping footprints; switching to the
    // wall board must not flag them again.
    const conflicts = stackConflictInstanceIds(
      [stackEntry('a', 0, 0, 20), stackEntry('b', 0, 0, 10)],
      { zAware: false },
    )
    expect(conflicts.size).toBe(0)
  })

  it('flags incompatible overlapping pairs in wall orientation', () => {
    const conflicts = stackConflictInstanceIds(
      [
        stackEntry('a', 0, 0, 20, NO_STACKING),
        stackEntry('b', 0, 0, 10, NO_STACKING),
      ],
      { zAware: false },
    )
    expect([...conflicts].sort()).toEqual(['a', 'b'])
  })

  it('derives stacking interfaces from component parameters', () => {
    expect(stackingInterfaceFor('box', {} as never)).toEqual({
      top: false,
      bottom: false,
      cylinderDiameter: null,
      seatDatumMm: null,
      seatingDropMm: null,
    })
    const boxInterface = stackingInterfaceFor('opengrid-stackable-box', {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    } as never)
    const boxConfiguration = OPENGRID_STACKABLE_BOX_CONFIGURATION
    const boxDatum =
      OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.height +
      boxConfiguration.bottomAssemblyHeight +
      boxConfiguration.topRailInnerChamfer +
      boxConfiguration.topRailInnerVerticalHeight
    expect(boxInterface).toEqual({
      top: true,
      bottom: true,
      cylinderDiameter: null,
      seatDatumMm: boxDatum,
      seatingDropMm: boxConfiguration.stackingGuideClearance,
    })
    // A bottom-plate cylinder has a flat bottom: it can support a same
    // diameter cylinder but cannot seat on one.
    const plate = cylinderStacking(60, { bottom: false })
    expect(
      stackingInterfacesCompatible(plate, cylinderStacking(60)),
    ).toBe(false)
    expect(
      stackingInterfacesCompatible(cylinderStacking(60), plate),
    ).toBe(true)
    expect(
      stackingInterfacesCompatible(
        cylinderStacking(60),
        cylinderStacking(40),
      ),
    ).toBe(false)
  })
})
