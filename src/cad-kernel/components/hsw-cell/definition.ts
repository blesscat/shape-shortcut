/**
 * The `hsw-cell` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import { isHswCellParameters } from '../../../cad-contract/units'
import { buildHswCell } from './builder'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildHswCellModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isHswCellParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
  }
  const template = await context.getHswCellTemplate()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildHswCell(parameters, template, context)
}

export const definition: ComponentModelDefinition = {
  id: 'hsw-cell',
  build: buildHswCellModel,
}
