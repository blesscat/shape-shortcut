/**
 * The `game-box` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import { isGameBoxParameters } from '../../../cad-contract/units'
import { buildGameBox } from './builder'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

function buildGameBoxModel(
  parameters: ModelParameterValues,
  _context: KernelBuildContext,
): Shape3D {
  if (!isGameBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
  }
  return buildGameBox(parameters).shape
}

export const definition: ComponentModelDefinition = {
  id: 'game-box',
  build: buildGameBoxModel,
}
