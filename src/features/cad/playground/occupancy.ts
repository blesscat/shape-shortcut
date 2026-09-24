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
  instances: ReadonlyArray<PlaygroundOccupancyInput & { id: string }>,
): string | null {
  for (let a = 0; a < instances.length; a += 1) {
    for (let b = a + 1; b < instances.length; b += 1) {
      const rangeA = cellsForInstance(instances[a])
      const rangeB = cellsForInstance(instances[b])
      if (rangesOverlap(rangeA, rangeB)) return instances[b].id
    }
  }
  return null
}

/**
 * Finds an unoccupied anchor cell near the origin for a new instance with
 * the given footprint, scanning outward in square rings.
 */
export function findFreeAnchorCell(
  bounds: ModelBounds,
  existing: ReadonlyArray<PlaygroundOccupancyInput & { id: string }>,
): { cellX: number; cellY: number } {
  const occupied = new Set(
    existing.flatMap((instance) => {
      const range = cellsForInstance(instance)
      const cells: string[] = []
      for (let x = range.minCellX; x <= range.maxCellX; x += 1) {
        for (let y = range.minCellY; y <= range.maxCellY; y += 1) {
          cells.push(`${x},${y}`)
        }
      }
      return cells
    }),
  )

  const candidateRange = cellsForInstance({
    bounds,
    placement: { cellX: 0, cellY: 0, rotation: 0, supportedBy: null },
  })
  const spanX = candidateRange.maxCellX - candidateRange.minCellX
  const spanY = candidateRange.maxCellY - candidateRange.minCellY
  const ringMax = Math.ceil(Math.sqrt(occupied.size + 1)) + spanX + spanY + 2

  for (let ring = 0; ring <= ringMax; ring += 1) {
    for (let cellY = -ring; cellY <= ring; cellY += 1) {
      for (let cellX = -ring; cellX <= ring; cellX += 1) {
        if (Math.max(Math.abs(cellX), Math.abs(cellY)) !== ring) continue
        let conflicts = false
        for (let x = cellX; x <= cellX + spanX && !conflicts; x += 1) {
          for (let y = cellY; y <= cellY + spanY && !conflicts; y += 1) {
            if (occupied.has(`${x},${y}`)) conflicts = true
          }
        }
        if (!conflicts) return { cellX, cellY }
      }
    }
  }
  return { cellX: 0, cellY: 0 }
}
