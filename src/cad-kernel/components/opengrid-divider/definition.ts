/**
 * The `opengrid-divider` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridDividerModelParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import { buildOpenGridDivider, buildOpenGridDividerWithParts } from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridDividerModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridDividerModelParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return buildOpenGridDivider(parameters, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    reportProgress: context.reportProgress,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridDividerWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (!isOpenGridDividerModelParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return buildOpenGridDividerWithParts(parameters, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    reportProgress: context.reportProgress,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-divider',
  build: buildOpenGridDividerModel,
  buildWithParts: buildOpenGridDividerWithPartsModel,
}
