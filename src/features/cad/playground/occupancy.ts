import {
  PLAYGROUND_GRID_PITCH,
  type ScenePlacement,
} from '../../../cad-contract/scene'
import type { ModelBounds } from '../../../cad-contract/units'

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
 * Returns the id of the first instance whose footprint overlaps a later
 * instance's footprint, or `null` when all placements are compatible.
 */
export function firstPlacementConflict(
  instances: ReadonlyArray<PlaygroundCellsEntry>,
): string | null {
  for (let a = 0; a < instances.length; a += 1) {
    for (let b = a + 1; b < instances.length; b += 1) {
      const rangeA = absoluteCellsFor(instances[a]!)
      const rangeB = absoluteCellsFor(instances[b]!)
      if (rangesOverlap(rangeA, rangeB)) return instances[b]!.id
    }
  }
  return null
}

/**
 * Returns the ids of every instance participating in at least one pairwise
 * footprint overlap — both sides of each conflict, including chains.
 */
export function overlappingInstanceIds(
  instances: ReadonlyArray<PlaygroundCellsEntry>,
): Set<string> {
  const overlapping = new Set<string>()
  for (let a = 0; a < instances.length; a += 1) {
    for (let b = a + 1; b < instances.length; b += 1) {
      const rangeA = absoluteCellsFor(instances[a]!)
      const rangeB = absoluteCellsFor(instances[b]!)
      if (rangesOverlap(rangeA, rangeB)) {
        overlapping.add(instances[a]!.id)
        overlapping.add(instances[b]!.id)
      }
    }
  }
  return overlapping
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
