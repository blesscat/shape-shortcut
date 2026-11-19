/**
 * The `opengrid-label-card` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridLabelCardParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import {
  buildOpenGridLabelCard,
  buildOpenGridLabelCardWithParts,
} from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridLabelCardModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridLabelCardParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  return buildOpenGridLabelCard(parameters, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
  })
}

async function buildOpenGridLabelCardWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (!isOpenGridLabelCardParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  return buildOpenGridLabelCardWithParts(parameters, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-label-card',
  build: buildOpenGridLabelCardModel,
  buildWithParts: buildOpenGridLabelCardWithPartsModel,
}
