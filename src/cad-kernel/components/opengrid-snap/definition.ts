/**
 * The `opengrid-snap` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import { isOpenGridSnapParameters } from '../../../cad-contract/units'
import { buildOpenGridSnap } from './builder'
import type { OpenGridSnapFixedFootprint } from './builder'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridSnapModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  return buildOpenGridSnap(parameters, {
    getOpenGridSnapReference: context.getOpenGridSnapReference,
    getOpenGridSnapFixedFootprint: context.getOpenGridSnapFixedFootprint,
    getOpenGridSnapOpenConnectHead: context.getOpenGridSnapOpenConnectHead,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-snap',
  build: buildOpenGridSnapModel,
}
