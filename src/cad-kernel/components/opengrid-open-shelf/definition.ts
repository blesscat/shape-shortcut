/**
 * The `opengrid-open-shelf` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridOpenShelfParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import { buildOpenGridOpenShelf } from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
} from '../../model/types'

async function buildOpenGridOpenShelfModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridOpenShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
  }
  return buildOpenGridOpenShelf(parameters, {
    isGenerationCurrent: context.isGenerationCurrent,
    yieldToEventLoop: context.yieldToEventLoop,
    reportProgress: context.reportProgress,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-open-shelf',
  build: buildOpenGridOpenShelfModel,
}
