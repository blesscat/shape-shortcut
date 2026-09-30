import type {
  ModelBounds,
  ModelParameterValues,
} from '../../../cad-contract/units'
import { PLAYGROUND_GRID_PITCH } from '../../../cad-contract/scene'
import type { ScenePlacement } from '../../../cad-contract/scene'
import type {
  ModelDefinition,
  WallDisplayPlan,
  WallDisplayRotation,
} from '../model-catalog/types'
import { rotatedFootprintAABB } from './occupancy'
import type { PlaygroundCellRange } from './occupancy'

/**
 * Row-major 3x3 rotation mapping print-frame directions into the wall-ready
 * frame: the OpenConnect interface face toward -Z (the wall board after the
 * mount), the body protrusion toward +Z, storage openings toward -Y (up
 * after the mount).
 */
export type WallDisplayMatrix = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

type Point3 = readonly [number, number, number]

export type { Point3 as WallDisplayPoint }

function rotationXMatrix(degrees: number): WallDisplayMatrix {
  const radians = (degrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return [1, 0, 0, 0, cosine, -sine, 0, sine, cosine]
}

function rotationZMatrix(degrees: number): WallDisplayMatrix {
  const radians = (degrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return [cosine, -sine, 0, sine, cosine, 0, 0, 0, 1]
}

function axisAngleMatrix(
  axis: WallDisplayRotation['axis'],
  degrees: number,
): WallDisplayMatrix {
  const radians = (degrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const [x, y, z] = axis
  const length = Math.hypot(x, y, z)
  const ux = x / length
  const uy = y / length
  const uz = z / length
  const oneMinusCosine = 1 - cosine
  return [
    cosine + ux * ux * oneMinusCosine,
    ux * uy * oneMinusCosine - uz * sine,
    ux * uz * oneMinusCosine + uy * sine,
    uy * ux * oneMinusCosine + uz * sine,
    cosine + uy * uy * oneMinusCosine,
    uy * uz * oneMinusCosine - ux * sine,
    uz * ux * oneMinusCosine - uy * sine,
    uz * uy * oneMinusCosine + ux * sine,
    cosine + uz * uz * oneMinusCosine,
  ]
}

function multiplyMatrices(
  first: WallDisplayMatrix,
  second: WallDisplayMatrix,
): WallDisplayMatrix {
  const result: number[] = []
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let sum = 0
      for (let index = 0; index < 3; index += 1) {
        sum += first[row * 3 + index]! * second[index * 3 + column]!
      }
      result.push(sum)
    }
  }
  return result as unknown as WallDisplayMatrix
}

function applyMatrix(matrix: WallDisplayMatrix, point: Point3): Point3 {
  return [
    matrix[0]! * point[0] + matrix[1]! * point[1] + matrix[2]! * point[2],
    matrix[3]! * point[0] + matrix[4]! * point[1] + matrix[5]! * point[2],
    matrix[6]! * point[0] + matrix[7]! * point[1] + matrix[8]! * point[2],
  ]
}

export function wallDisplayPlanFor(
  definition: ModelDefinition | undefined,
): WallDisplayPlan | null {
  return definition?.wallDisplay ?? null
}

/** Composed print-frame to wall-ready-frame rotation for the parameters. */
export function wallDisplayRotationMatrix(
  plan: WallDisplayPlan,
  parameters: ModelParameterValues,
): WallDisplayMatrix {
  const printToInstalled = rotationXMatrix(
    plan.printToInstalledRotXDegrees(parameters),
  )
  const installedToReady = axisAngleMatrix(
    plan.wallReadyRotation.axis,
    plan.wallReadyRotation.degrees,
  )
  return multiplyMatrices(installedToReady, printToInstalled)
}

/**
 * Ready-frame translation of the print-frame mesh: the plan's print-to-
 * installed translation carried through the installed-to-ready rotation.
 */
export function wallDisplayTranslationFor(
  plan: WallDisplayPlan,
  parameters: ModelParameterValues,
): Point3 {
  const installedOffset = plan.printToInstalledTranslationFor
    ? plan.printToInstalledTranslationFor(parameters)
    : ([0, 0, 0] as Point3)
  const matrix = axisAngleMatrix(
    plan.wallReadyRotation.axis,
    plan.wallReadyRotation.degrees,
  )
  return applyMatrix(matrix, installedOffset)
}

/**
 * A mount for geometry that is still in the print frame: the display
 * rotation is applied inside the mount orientation, before the placement
 * rotation and the board mount. `readyOffset` (from
 * `wallDisplayTranslationFor`) carries the plan's installed-frame
 * translation into the composed world position.
 */
export function withWallDisplayRotation(
  mount: WallMountPlacement,
  display: WallDisplayMatrix,
  readyOffset: Point3 = [0, 0, 0],
): WallMountPlacement {
  return {
    orientation: multiplyMatrices(mount.orientation, display),
    translation: [
      mount.orientation[0]! * readyOffset[0] +
        mount.orientation[1]! * readyOffset[1] +
        mount.orientation[2]! * readyOffset[2] +
        mount.translation[0],
      mount.orientation[3]! * readyOffset[0] +
        mount.orientation[4]! * readyOffset[1] +
        mount.orientation[5]! * readyOffset[2] +
        mount.translation[1],
      mount.orientation[6]! * readyOffset[0] +
        mount.orientation[7]! * readyOffset[1] +
        mount.orientation[8]! * readyOffset[2] +
        mount.translation[2],
    ],
  }
}

/**
 * Axis-aligned bounds of the component in the wall-ready frame, derived from
 * the installed-frame bounds. The plan-frame X/Y extents are the wall
 * footprint (horizontal width x vertical height); Z is the protrusion span.
 */
export function wallReadyBoundsFor(
  plan: WallDisplayPlan,
  parameters: ModelParameterValues,
): ModelBounds {
  const installed = plan.installedBoundsFor(parameters)
  // Installed-frame bounds only need the constant installed-to-ready
  // rotation; the print-to-installed tilt applies to mesh-frame points.
  const matrix = axisAngleMatrix(
    plan.wallReadyRotation.axis,
    plan.wallReadyRotation.degrees,
  )
  const corners: Point3[] = []
  for (const x of [installed.min[0], installed.max[0]]) {
    for (const y of [installed.min[1], installed.max[1]]) {
      for (const z of [installed.min[2], installed.max[2]]) {
        corners.push(applyMatrix(matrix, [x, y, z]))
      }
    }
  }
  return {
    min: [
      Math.min(...corners.map((point) => point[0])),
      Math.min(...corners.map((point) => point[1])),
      Math.min(...corners.map((point) => point[2])),
    ],
    max: [
      Math.max(...corners.map((point) => point[0])),
      Math.max(...corners.map((point) => point[1])),
      Math.max(...corners.map((point) => point[2])),
    ],
  }
}

/** Mount placement derived from authored-frame wall bounds. */
export type WallMountPlacement = {
  /** Row-major 3x3 mount rotation: RotX(-90deg) after RotZ(placement). */
  orientation: WallDisplayMatrix
  translation: readonly [number, number, number]
}

/**
 * Ready-frame XY span of the OpenConnect socket grid, before the placement
 * rotation. The span covers the socket cells (center extents grown by half
 * the grid pitch), so anchoring its minimum corner at a placement cell
 * registers every socket center with a board cell center.
 */
export type WallSocketAnchor = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Ready-frame socket-grid cell span for the parameters, or null when the
 * plan declares no socket origins (the body bounds anchor the placement
 * instead).
 */
export function wallSocketAnchorFor(
  plan: WallDisplayPlan,
  parameters: ModelParameterValues,
): WallSocketAnchor | null {
  const origins = plan.installedSocketOriginsFor?.(parameters)
  if (!origins || origins.length === 0) return null
  const matrix = axisAngleMatrix(
    plan.wallReadyRotation.axis,
    plan.wallReadyRotation.degrees,
  )
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const origin of origins) {
    const ready = applyMatrix(matrix, origin)
    minX = Math.min(minX, ready[0])
    maxX = Math.max(maxX, ready[0])
    minY = Math.min(minY, ready[1])
    maxY = Math.max(maxY, ready[1])
  }
  const halfPitch = PLAYGROUND_GRID_PITCH / 2
  return {
    minX: minX - halfPitch,
    maxX: maxX + halfPitch,
    minY: minY - halfPitch,
    maxY: maxY + halfPitch,
  }
}

/**
 * Mount for a piece expressed in the wall-ready frame (wall interface toward
 * -Z, protrusion +Z): the placement rotation stays in the wall plane and the
 * board plane seats on the wall. The footprint anchor is the socket-grid
 * span when declared (sockets register with board cells and the body may
 * overhang), otherwise the ready bounds' own minimum corner. Apply an extra
 * display rotation to `orientation` only when the geometry is not yet in the
 * wall-ready frame.
 */
export function wallMountPlacementFor(
  wallBounds: ModelBounds,
  placement: Pick<ScenePlacement, 'cellX' | 'cellY' | 'rotation'>,
  socketAnchor: WallSocketAnchor | null = null,
): WallMountPlacement {
  const anchorBounds: ModelBounds = socketAnchor
    ? {
        min: [socketAnchor.minX, socketAnchor.minY, 0],
        max: [socketAnchor.maxX, socketAnchor.maxY, 0],
      }
    : wallBounds
  const aabb = rotatedFootprintAABB(anchorBounds, placement.rotation)
  const anchorX = placement.cellX * PLAYGROUND_GRID_PITCH
  const anchorY = placement.cellY * PLAYGROUND_GRID_PITCH
  return {
    orientation: multiplyMatrices(
      rotationXMatrix(-90),
      rotationZMatrix(placement.rotation),
    ),
    translation: [anchorX - aabb.minX, -wallBounds.min[2], anchorY + aabb.maxY],
  }
}

/**
 * Board cells covered by the mounted body footprint, derived from the same
 * mount translation the viewport renders with: consistent with the socket
 * anchor and the placement rotation, including body overhang past the
 * socket span.
 */
export function wallDisplayCellRangeFor(
  plan: WallDisplayPlan,
  parameters: ModelParameterValues,
  placement: Pick<ScenePlacement, 'cellX' | 'cellY' | 'rotation'>,
): PlaygroundCellRange {
  const wallBounds = wallReadyBoundsFor(plan, parameters)
  const socketAnchor = wallSocketAnchorFor(plan, parameters)
  const mount = wallMountPlacementFor(wallBounds, placement, socketAnchor)
  // The mount maps a ready-frame point (x, y, z) to world
  // (x + tx, z + ty, -y + tz); the board plane is world Y=0 with +Z up.
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const x of [wallBounds.min[0], wallBounds.max[0]]) {
    for (const y of [wallBounds.min[1], wallBounds.max[1]]) {
      const worldX = x + mount.translation[0]
      const worldZ = -y + mount.translation[2]
      minX = Math.min(minX, worldX)
      maxX = Math.max(maxX, worldX)
      minZ = Math.min(minZ, worldZ)
      maxZ = Math.max(maxZ, worldZ)
    }
  }
  return {
    minCellX: Math.floor(minX / PLAYGROUND_GRID_PITCH),
    maxCellX: Math.ceil(maxX / PLAYGROUND_GRID_PITCH) - 1,
    minCellY: Math.floor(minZ / PLAYGROUND_GRID_PITCH),
    maxCellY: Math.ceil(maxZ / PLAYGROUND_GRID_PITCH) - 1,
  }
}
