import {
  PLAYGROUND_GRID_PITCH,
  type ScenePlacement,
} from '../../../cad-contract/scene'
import type { ModelBounds } from '../../../cad-contract/units'
import {
  stackingInterfacesCompatible,
  type StackingInterface,
} from './stacking-compatibility'

/**
 * Inclusive integer grid-cell range covered by a footprint, on the OpenGrid
 * 28 mm pitch. Cells may be negative; the occupancy space is unbounded.
 */
export type PlaygroundCellRange = {
  minCellX: number
  maxCellX: number
  minCellY: number
  maxCellY: number
}

export type PlaygroundOccupancyInput = {
  bounds: ModelBounds
  placement: ScenePlacement
}

/**
 * Rotates the X/Y footprint AABB around the instance origin (components are
 * X/Y centered) and applies the min-corner grid anchor: the rotated footprint
 * minimum corner is placed at `(cellX * pitch, cellY * pitch)`.
 */
export function rotatedFootprintAABB(
  bounds: ModelBounds,
  rotation: ScenePlacement['rotation'],
): { minX: number; maxX: number; minY: number; maxY: number } {
  const minX = bounds.min[0]
  const maxX = bounds.max[0]
  const minY = bounds.min[1]
  const maxY = bounds.max[1]
  switch (rotation) {
    case 90:
      return { minX: -maxY, maxX: -minY, minY: minX, maxY: maxX }
    case 180:
      return { minX: -maxX, maxX: -minX, minY: -maxY, maxY: -minY }
    case 270:
      return { minX: minY, maxX: maxY, minY: -maxX, maxY: -minX }
    default:
      return { minX, maxX, minY, maxY }
  }
}

export function cellsForInstance(
  input: PlaygroundOccupancyInput,
): PlaygroundCellRange {
  const aabb = rotatedFootprintAABB(input.bounds, input.placement.rotation)
  const anchorX = input.placement.cellX * PLAYGROUND_GRID_PITCH
  const anchorY = input.placement.cellY * PLAYGROUND_GRID_PITCH
  const worldMinX = anchorX
  const worldMaxX = anchorX + (aabb.maxX - aabb.minX)
  const worldMinY = anchorY
  const worldMaxY = anchorY + (aabb.maxY - aabb.minY)
  return {
    minCellX: Math.floor(worldMinX / PLAYGROUND_GRID_PITCH),
    maxCellX: Math.ceil(worldMaxX / PLAYGROUND_GRID_PITCH) - 1,
    minCellY: Math.floor(worldMinY / PLAYGROUND_GRID_PITCH),
    maxCellY: Math.ceil(worldMaxY / PLAYGROUND_GRID_PITCH) - 1,
  }
}

/**
 * Occupancy entry with cells expressed relative to the placement anchor
 * (`cellX`/`cellY` treated as 0). Wall display plans anchor on the
 * OpenConnect socket grid, so their body footprint may spill into negative
 * offsets around the anchor; min-corner anchored bounds never do.
 */
export type PlaygroundCellsEntry = {
  id: string
  relativeCells: PlaygroundCellRange
  placement: Pick<ScenePlacement, 'cellX' | 'cellY'>
}

/**
 * Occupancy entry extended with the authored height above the base plane
 * (mm) for desktop stacking derivation. `null` height means the instance
 * stays grounded and cannot support anything. `stacking` carries the
 * physical stacking interface derived from the component parameters.
 */
export type PlaygroundStackEntry = PlaygroundCellsEntry & {
  heightMm: number | null
  stacking: StackingInterface
}

/** Fixed vertical render gap between seated mating faces, in mm. */
export const PLAYGROUND_STACK_CLEARANCE_MM = 0.05

export function absoluteCellsFor(
  entry: PlaygroundCellsEntry,
): PlaygroundCellRange {
  return {
    minCellX: entry.relativeCells.minCellX + entry.placement.cellX,
    maxCellX: entry.relativeCells.maxCellX + entry.placement.cellX,
    minCellY: entry.relativeCells.minCellY + entry.placement.cellY,
    maxCellY: entry.relativeCells.maxCellY + entry.placement.cellY,
  }
}

function rangesOverlap(
  a: PlaygroundCellRange,
  b: PlaygroundCellRange,
): boolean {
  return (
    a.minCellX <= b.maxCellX &&
    b.minCellX <= a.maxCellX &&
    a.minCellY <= b.maxCellY &&
    b.minCellY <= a.maxCellY
  )
}

/**
 * Stacked base Z in mm per instance id, derived in array order (later
 * entries stack on earlier ones): each seatable, heighted instance rests on
 * the greatest mating datum among footprint-overlapping, interface-
 * compatible placed instances minus its seating drop (the interface
 * engagement both pieces share), plus the small render gap. Overlapping
 * instances with incompatible interfaces never lift — they share ground
 * level and the conflict pass flags them. Heightless instances stay
 * grounded and contribute no datum, so nothing can stack on them. The
 * returned `matings` set records every `child\u0000support` pair whose base
 * was derived from that support's datum: mated pairs interpenetrate their
 * bounding boxes by design and are excluded from conflict flagging.
 */
export function stackedBaseZFor(
  instances: ReadonlyArray<PlaygroundStackEntry>,
): { baseZ: Map<string, number>; matings: Set<string> } {
  const baseZ = new Map<string, number>()
  const matings = new Set<string>()
  const placed: {
    id: string
    cells: PlaygroundCellRange
    baseZ: number
    seatDatumMm: number | null
    stacking: StackingInterface
  }[] = []
  for (const entry of instances) {
    if (entry.heightMm === null || entry.stacking.seatingDropMm === null) {
      baseZ.set(entry.id, 0)
      continue
    }
    const cells = absoluteCellsFor(entry)
    let base = 0
    let supportId: string | null = null
    for (const candidate of placed) {
      if (candidate.seatDatumMm === null) continue
      if (!rangesOverlap(cells, candidate.cells)) continue
      if (!stackingInterfacesCompatible(entry.stacking, candidate.stacking))
        continue
      const seatZ =
        candidate.baseZ +
        candidate.seatDatumMm -
        entry.stacking.seatingDropMm +
        PLAYGROUND_STACK_CLEARANCE_MM
      if (seatZ > base) {
        base = seatZ
        supportId = candidate.id
      }
    }
    baseZ.set(entry.id, base)
    if (supportId !== null) matings.add(`${entry.id}\u0000${supportId}`)
    placed.push({
      id: entry.id,
      cells,
      baseZ: base,
      seatDatumMm: entry.stacking.seatDatumMm,
      stacking: entry.stacking,
    })
  }
  return { baseZ, matings }
}

/**
 * Conflict set for overlapping instances that cannot stack: both sides of
 * every footprint overlap whose stacking interfaces are incompatible — the
 * desktop pass additionally requires the stacked Z spans to intersect, so
 * compatible pairs that actually mate (recorded in `matings`) and share
 * their duplicated interface height never flag, while compatible pairs
 * colliding at the same level do. A heightless instance is treated as an
 * unbounded span so it keeps conflicting with any footprint overlap. Pass
 * the `precomputedBaseZ`/`matings` results from `stackedBaseZFor` over the
 * same instances to avoid deriving them twice on the desktop pass.
 */
export function stackConflictInstanceIds(
  instances: ReadonlyArray<PlaygroundStackEntry>,
  options: {
    zAware: boolean
    precomputedBaseZ?: ReadonlyMap<string, number>
    matings?: ReadonlySet<string>
  },
): Set<string> {
  const baseZ =
    options.precomputedBaseZ ?? stackedBaseZFor(instances).baseZ
  const spans = instances.map((entry) => {
    const base = baseZ.get(entry.id) ?? 0
    return {
      id: entry.id,
      cells: absoluteCellsFor(entry),
      base,
      top:
        entry.heightMm === null
          ? Number.POSITIVE_INFINITY
          : base + entry.heightMm,
      stacking: entry.stacking,
    }
  })
  const conflicts = new Set<string>()
  for (let a = 0; a < spans.length; a += 1) {
    for (let b = a + 1; b < spans.length; b += 1) {
      const spanA = spans[a]!
      const spanB = spans[b]!
      if (!rangesOverlap(spanA.cells, spanB.cells)) continue
      if (!options.zAware) {
        // No Z stacking on the wall: compatible pairs stay mounted where
        // they are (a desktop stack keeps its overlap) without flagging;
        // incompatible overlaps flag directly.
        if (stackingInterfacesCompatible(spanA.stacking, spanB.stacking))
          continue
        conflicts.add(spanA.id)
        conflicts.add(spanB.id)
        continue
      }
      // Desktop: a mated pair interpenetrates its bounding boxes by design,
      // so its duplicated interface height is not a conflict.
      if (
        options.matings?.has(`${spanA.id}\u0000${spanB.id}`) ||
        options.matings?.has(`${spanB.id}\u0000${spanA.id}`)
      )
        continue
      // Everything else conflicts when its bounding spans intersect:
      // incompatible pairs never lift, and compatible pairs that neither
      // supports collide at shared cells.
      if (spanA.base < spanB.top && spanB.base < spanA.top) {
        conflicts.add(spanA.id)
        conflicts.add(spanB.id)
      }
    }
  }
  return conflicts
}

/**
 * Finds an unoccupied anchor cell near the origin for a new instance whose
 * footprint (relative to the anchor, possibly with negative offsets) is
 * `relativeCells`, scanning outward in square rings.
 */
export function findFreeAnchorCell(
  relativeCells: PlaygroundCellRange,
  existing: ReadonlyArray<PlaygroundCellsEntry>,
): { cellX: number; cellY: number } {
  const occupied = new Set(
    existing.flatMap((entry) => {
      const range = absoluteCellsFor(entry)
      const cells: string[] = []
      for (let x = range.minCellX; x <= range.maxCellX; x += 1) {
        for (let y = range.minCellY; y <= range.maxCellY; y += 1) {
          cells.push(`${x},${y}`)
        }
      }
      return cells
    }),
  )

  const spanX = relativeCells.maxCellX - relativeCells.minCellX
  const spanY = relativeCells.maxCellY - relativeCells.minCellY
  const overhang = Math.max(
    0,
    -Math.min(relativeCells.minCellX, relativeCells.minCellY),
  )
  const ringMax =
    Math.ceil(Math.sqrt(occupied.size + 1)) + spanX + spanY + 2 + overhang

  const candidateCells = (cellX: number, cellY: number) => {
    const cells: string[] = []
    for (
      let x = cellX + relativeCells.minCellX;
      x <= cellX + relativeCells.maxCellX;
      x += 1
    ) {
      for (
        let y = cellY + relativeCells.minCellY;
        y <= cellY + relativeCells.maxCellY;
        y += 1
      ) {
        cells.push(`${x},${y}`)
      }
    }
    return cells
  }

  for (let ring = 0; ring <= ringMax; ring += 1) {
    for (let cellY = -ring; cellY <= ring; cellY += 1) {
      for (let cellX = -ring; cellX <= ring; cellX += 1) {
        if (Math.max(Math.abs(cellX), Math.abs(cellY)) !== ring) continue
        if (candidateCells(cellX, cellY).every((cell) => !occupied.has(cell)))
          return { cellX, cellY }
      }
    }
  }
  return { cellX: 0, cellY: 0 }
}
