/**
 * The `box` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import { isBoxParameters } from '../../../cad-contract/units'
import { buildBoxBRep } from './builder'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

function buildBoxModel(
  parameters: ModelParameterValues,
  _context: KernelBuildContext,
): Shape3D {
  if (!isBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:box')
  }
  return buildBoxBRep(parameters)
}

export const definition: ComponentModelDefinition = {
  id: 'box',
  build: buildBoxModel,
}
