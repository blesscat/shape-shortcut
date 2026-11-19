/**
 * The `hexagonal-column` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import { isHexagonalColumnParameters } from '../../../cad-contract/units'
import { buildHexagonalColumn } from './builder'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildHexagonalColumnModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isHexagonalColumnParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hexagonal-column')
  }
  if (!context.getHexagonalColumnReference) {
    throw new Error('MODEL_ASSET_INVALID:hexagonal-column-reference-missing')
  }
  const reference = await context.getHexagonalColumnReference()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildHexagonalColumn(parameters, {
    reference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    reportProgress: context.reportProgress,
    reportPhase: context.reportPhase,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'hexagonal-column',
  build: buildHexagonalColumnModel,
}
