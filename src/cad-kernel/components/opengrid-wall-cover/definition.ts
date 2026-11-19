/**
 * The `opengrid-wall-cover` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  validateOpenGridWallCoverParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import {
  buildOpenGridWallCover,
  buildOpenGridWallCoverWithFlatText,
} from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridWallCoverModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  const validation = validateOpenGridWallCoverParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  return buildOpenGridWallCover(validation.value, {
    getOpenGridSnapReference: context.getOpenGridSnapReference,
    getOpenGridWallCoverReference: context.getOpenGridWallCoverReference,
    getOpenGridSnapFixedFootprint: context.getOpenGridSnapFixedFootprint,
    getOpenGridSnapOpenConnectHead: context.getOpenGridSnapOpenConnectHead,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
    reportProgress: context.reportProgress,
  })
}

async function buildOpenGridWallCoverWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  const validation = validateOpenGridWallCoverParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  return buildOpenGridWallCoverWithFlatText(validation.value, {
    getOpenGridSnapReference: context.getOpenGridSnapReference,
    getOpenGridWallCoverReference: context.getOpenGridWallCoverReference,
    getOpenGridSnapFixedFootprint: context.getOpenGridSnapFixedFootprint,
    getOpenGridSnapOpenConnectHead: context.getOpenGridSnapOpenConnectHead,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
    reportProgress: context.reportProgress,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-wall-cover',
  build: buildOpenGridWallCoverModel,
  buildWithParts: buildOpenGridWallCoverWithPartsModel,
}
