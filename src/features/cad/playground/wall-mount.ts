import type { ModelId } from '../../../cad-contract/units'
import { getModelDefinition } from '../model-catalog'
import type { PlaygroundViewMode } from './store'

/**
 * Whether a component belongs to the scene orientation's system: wall mode
 * offers only components declared for the wall-mount system; desktop mode
 * offers components declared for the desk system plus unrestricted
 * components (which default to the desk catalog).
 */
export function modelVisibleInViewMode(
  modelId: ModelId,
  viewMode: PlaygroundViewMode,
): boolean {
  const contexts = getModelDefinition(modelId)?.supportedSystemContexts
  if (!contexts || contexts.length === 0) return viewMode === 'desktop'
  return contexts.includes(viewMode === 'wall' ? 'wall' : 'desk')
}

/**
 * How a component mounts onto the vertical wall board: `faceZ` pieces are
 * authored flat (base plane Z=0, protrusion +Z) and rotate onto the wall;
 * `faceY` pieces are authored standing with their OpenConnect interface face
 * at the −Y side, which touches the wall directly without rotation.
 */
const WALL_MOUNT_FACE_Y_MODEL_IDS: ReadonlySet<ModelId> = new Set([
  'opengrid-openconnect-shelf',
  'opengrid-openconnect-organizer',
  'opengrid-openconnect-tissue-box',
] as ModelId[])

export type WallMountFace = 'faceZ' | 'faceY'

export function wallMountFace(modelId: ModelId): WallMountFace {
  return WALL_MOUNT_FACE_Y_MODEL_IDS.has(modelId) ? 'faceY' : 'faceZ'
}
