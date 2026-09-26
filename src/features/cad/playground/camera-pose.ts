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
