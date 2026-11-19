/**
 * The `opengrid-snap-remover` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import { isOpenGridSnapRemoverParameters } from '../../../cad-contract/units'
import { buildOpenGridSnapRemover } from './builder'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridSnapRemoverModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  if (!context.getOpenGridSnapRemoverAsset) {
    throw new Error('MODEL_ASSET_CONTEXT_MISSING:opengrid-snap-remover')
  }

  const source = await context.getOpenGridSnapRemoverAsset()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildOpenGridSnapRemover(source, context)
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-snap-remover',
  build: buildOpenGridSnapRemoverModel,
}
