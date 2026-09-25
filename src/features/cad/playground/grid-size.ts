import { PLAYGROUND_GRID_PITCH } from '../../../cad-contract/scene'

export const PLAYGROUND_GRID_CELLS_DEFAULT = 50
export const PLAYGROUND_GRID_CELLS_MIN = 10
export const PLAYGROUND_GRID_CELLS_MAX = 200

export const PLAYGROUND_GRID_STORAGE_KEY = 'shape-shortcut:playground-grid:v1'

type GridStorage = Pick<Storage, 'getItem' | 'setItem'>

export function clampPlaygroundGridCells(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    return PLAYGROUND_GRID_CELLS_DEFAULT
  }
  return Math.min(
    PLAYGROUND_GRID_CELLS_MAX,
    Math.max(PLAYGROUND_GRID_CELLS_MIN, value),
  )
}

function browserStorage(): GridStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/**
 * Reads the persisted visual grid extent (whole cells per axis) for this
 * browser; missing, corrupt, or out-of-range values fall back to the 50×50
 * default. The logical scene stays unbounded regardless of this value.
 */
export function loadPlaygroundGridCells(
  storage: GridStorage | undefined = browserStorage(),
): number {
  try {
    const saved: unknown = JSON.parse(
      storage?.getItem(PLAYGROUND_GRID_STORAGE_KEY) ?? 'null',
    )
    return clampPlaygroundGridCells(saved)
  } catch {
    return PLAYGROUND_GRID_CELLS_DEFAULT
  }
}

export function savePlaygroundGridCells(
  cells: number,
  storage: GridStorage | undefined = browserStorage(),
): void {
  try {
    storage?.setItem(
      PLAYGROUND_GRID_STORAGE_KEY,
      JSON.stringify(clampPlaygroundGridCells(cells)),
    )
  } catch {
    // Keep editing usable in memory when browser storage is unavailable.
  }
}

export function playgroundGridExtentMm(cells: number): number {
  return clampPlaygroundGridCells(cells) * PLAYGROUND_GRID_PITCH
}
