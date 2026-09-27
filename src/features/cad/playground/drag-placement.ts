import {
  PLAYGROUND_GRID_PITCH,
  type ScenePlacement,
} from '../../../cad-contract/scene'

export type PlaygroundDragViewMode = 'desktop' | 'wall'

export type PlaygroundGridPoint = {
  x: number
  y: number
}

type WorldPoint = {
  x: number
  y: number
  z: number
}

type SnappedPlacementInput = {
  original: ScenePlacement
  start: PlaygroundGridPoint
  current: PlaygroundGridPoint
}

export function gridPointFromWorld(
  point: WorldPoint,
  mode: PlaygroundDragViewMode,
): PlaygroundGridPoint {
  if (mode === 'wall') {
    return { x: point.x, y: point.z }
  }

  return { x: point.x, y: point.y }
}

function snappedCellDelta(distance: number): number {
  const magnitude = Math.floor(Math.abs(distance) / PLAYGROUND_GRID_PITCH + 0.5)
  return Math.sign(distance) * magnitude
}

export function snappedPlacementForDrag({
  original,
  start,
  current,
}: SnappedPlacementInput): ScenePlacement {
  return {
    cellX: original.cellX + snappedCellDelta(current.x - start.x),
    cellY: original.cellY + snappedCellDelta(current.y - start.y),
    rotation: original.rotation,
    supportedBy: null,
  }
}
