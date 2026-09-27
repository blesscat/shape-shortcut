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
