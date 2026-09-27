import { Vector3 } from 'three'

import { PLAYGROUND_GRID_PITCH } from '../../../cad-contract/scene'
import { CAD_VIEWPORT_CAMERA } from '../viewport/coordinates'
import type { PlaygroundGridSize } from './grid-size'

export type PlaygroundCameraPose = {
  position: [number, number, number]
  target: [number, number, number]
}

export type PlaygroundCameraState = {
  desktop?: PlaygroundCameraPose
  wall?: PlaygroundCameraPose
}

export const PLAYGROUND_CAMERA_STORAGE_KEY =
  'shape-shortcut:playground-camera:v1'
export const PLAYGROUND_CAMERA_MIN_FAR = 20_000

type DefaultPlaygroundCameraPoseOptions = {
  mode: keyof PlaygroundCameraState
  gridSize: PlaygroundGridSize
  aspect: number
}

const DESKTOP_CAMERA_MARGIN = 1.15
const WALL_CAMERA_MARGIN = 1.1
const CAMERA_FAR_MARGIN = 1.1
// Wall pieces protrude toward +Y, so this three-quarter view keeps their
// usable face dominant while making their side and depth easy to read.
const WALL_CAMERA_DIRECTION = new Vector3(-0.75, 1, 0.4).normalize()
const WALL_UP = new Vector3(0, 0, 1)

function vectorTuple(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z]
}

function gridDimensions(gridSize: PlaygroundGridSize): {
  width: number
  height: number
} {
  return {
    width: Math.max(Math.round(gridSize.x), 1) * PLAYGROUND_GRID_PITCH,
    height: Math.max(Math.round(gridSize.y), 1) * PLAYGROUND_GRID_PITCH,
  }
}

function defaultDesktopCameraPose(
  gridSize: PlaygroundGridSize,
): PlaygroundCameraPose {
  const { width, height } = gridDimensions(gridSize)
  const radius = Math.hypot(width, height) / 2
  const halfVerticalFov = (CAD_VIEWPORT_CAMERA.fov * Math.PI) / 360
  const distance = (radius / Math.sin(halfVerticalFov)) * DESKTOP_CAMERA_MARGIN
  const position = new Vector3(...CAD_VIEWPORT_CAMERA.position)
    .normalize()
    .multiplyScalar(distance)

  return {
    position: vectorTuple(position),
    target: [0, 0, 0],
  }
}

function wallCameraDistance(
  width: number,
  height: number,
  aspect: number,
): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const halfVerticalFov = (CAD_VIEWPORT_CAMERA.fov * Math.PI) / 360
  const halfHorizontalFov = Math.atan(Math.tan(halfVerticalFov) * safeAspect)
  const forward = WALL_CAMERA_DIRECTION.clone().negate()
  const right = new Vector3().crossVectors(forward, WALL_UP).normalize()
  const cameraUp = new Vector3().crossVectors(right, forward).normalize()
  const halfWidth = width / 2
  const halfHeight = height / 2
  let requiredDistance = 0

  // Find the nearest distance where every grid corner fits both axes of the
  // perspective frustum. The forward offset accounts for the slight tilt.
  for (const x of [-halfWidth, halfWidth]) {
    for (const z of [-halfHeight, halfHeight]) {
      const corner = new Vector3(x, 0, z)
      const forwardOffset = corner.dot(forward)
      const requiredHorizontalDistance =
        (Math.abs(corner.dot(right)) * WALL_CAMERA_MARGIN) /
          Math.tan(halfHorizontalFov) -
        forwardOffset
      const requiredVerticalDistance =
        (Math.abs(corner.dot(cameraUp)) * WALL_CAMERA_MARGIN) /
          Math.tan(halfVerticalFov) -
        forwardOffset

      requiredDistance = Math.max(
        requiredDistance,
        requiredHorizontalDistance,
        requiredVerticalDistance,
      )
    }
  }

  return requiredDistance
}

function defaultWallCameraPose(
  gridSize: PlaygroundGridSize,
  aspect: number,
): PlaygroundCameraPose {
  const { width, height } = gridDimensions(gridSize)
  const distance = wallCameraDistance(width, height, aspect)
  const position = WALL_CAMERA_DIRECTION.clone().multiplyScalar(distance)

  return {
    position: vectorTuple(position),
    target: [0, 0, 0],
  }
}

export function defaultPlaygroundCameraPose({
  mode,
  gridSize,
  aspect,
}: DefaultPlaygroundCameraPoseOptions): PlaygroundCameraPose {
  if (mode === 'desktop') {
    return defaultDesktopCameraPose(gridSize)
  }

  return defaultWallCameraPose(gridSize, aspect)
}

export function playgroundCameraFarPlane({
  mode,
  gridSize,
  pose,
}: {
  mode: keyof PlaygroundCameraState
  gridSize: PlaygroundGridSize
  pose: PlaygroundCameraPose
}): number {
  const { width, height } = gridDimensions(gridSize)
  const cameraPosition = new Vector3(...pose.position)
  const forward = new Vector3(...pose.target).sub(cameraPosition)
  const targetDistance = forward.length()
  if (targetDistance === 0) return PLAYGROUND_CAMERA_MIN_FAR
  forward.normalize()

  let farthestDepth = targetDistance
  for (const horizontal of [-width / 2, width / 2]) {
    for (const vertical of [-height / 2, height / 2]) {
      const corner =
        mode === 'wall'
          ? new Vector3(horizontal, 0, vertical)
          : new Vector3(horizontal, vertical, 0)
      const depth = corner.sub(cameraPosition).dot(forward)
      farthestDepth = Math.max(farthestDepth, depth)
    }
  }

  // Keep the usual range for depth precision and expand it only when the
  // current pose would put part of the grid beyond the far clipping plane.
  return Math.max(PLAYGROUND_CAMERA_MIN_FAR, farthestDepth * CAMERA_FAR_MARGIN)
}

type CameraStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): CameraStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function isPose(value: unknown): value is PlaygroundCameraPose {
  if (typeof value !== 'object' || value === null) return false
  const pose = value as Record<string, unknown>
  return (
    Array.isArray(pose.position) &&
    pose.position.length === 3 &&
    pose.position.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    Array.isArray(pose.target) &&
    pose.target.length === 3 &&
    pose.target.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

function parseState(value: unknown): PlaygroundCameraState {
  if (typeof value !== 'object' || value === null) return {}
  const record = value as Record<string, unknown>
  const state: PlaygroundCameraState = {}
  if (isPose(record.desktop)) state.desktop = record.desktop
  if (isPose(record.wall)) state.wall = record.wall
  return state
}

/**
 * Loads the camera poses the user left the scene in, per orientation.
 * Missing or corrupt entries mean "no custom pose": the orientation's
 * default (grid-fitting) pose applies.
 */
export function loadPlaygroundCameraState(
  storage: CameraStorage | undefined = browserStorage(),
): PlaygroundCameraState {
  try {
    const saved: unknown = JSON.parse(
      storage?.getItem(PLAYGROUND_CAMERA_STORAGE_KEY) ?? 'null',
    )
    return parseState(saved)
  } catch {
    return {}
  }
}

export function savePlaygroundCameraState(
  state: PlaygroundCameraState,
  storage: CameraStorage | undefined = browserStorage(),
): void {
  try {
    storage?.setItem(PLAYGROUND_CAMERA_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Camera persistence is best-effort; editing stays usable without it.
  }
}
