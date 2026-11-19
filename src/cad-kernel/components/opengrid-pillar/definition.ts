/**
 * The `opengrid-pillar` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import { isPillarParameters } from '../../../cad-contract/units'
import { buildPillar } from './builder'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildPillarModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isPillarParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  if (parameters.mode === 'detachable-corner-seat') {
    if (!context.getOpenGridDetachableCornerSeatReference) {
      throw new Error('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')
    }
    detachableCornerSeatReference =
      await context.getOpenGridDetachableCornerSeatReference()
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
  }
  return buildPillar(parameters, {
    detachableCornerSeatReference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-pillar',
  build: buildPillarModel,
}
