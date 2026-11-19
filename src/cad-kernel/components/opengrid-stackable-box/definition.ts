/**
 * The `opengrid-stackable-box` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridStackableBoxParameters,
  validateOpenGridStackableBoxParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import {
  buildOpenGridStackableBoxAsync,
  buildOpenGridStackableBoxWithParts,
} from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridStackableBoxModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  const validation = validateOpenGridStackableBoxParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (validation.value.cornerSeatMode === 'detachable-corner-seat') {
    if (!context.getOpenGridDetachableCornerSeatReference) {
      throw new Error('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')
    }
    if (!context.getOpenGridDetachableCornerSeatHolderReference) {
      throw new Error(
        'MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat-holder',
      )
    }
    ;[detachableCornerSeatReference, detachableCornerSeatHolderReference] =
      await Promise.all([
        context.getOpenGridDetachableCornerSeatReference(),
        context.getOpenGridDetachableCornerSeatHolderReference(),
      ])
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
  }
  return buildOpenGridStackableBoxAsync(validation.value, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridStackableBoxWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  const validation = validateOpenGridStackableBoxParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (validation.value.cornerSeatMode === 'detachable-corner-seat') {
    if (!context.getOpenGridDetachableCornerSeatReference) {
      throw new Error('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')
    }
    if (!context.getOpenGridDetachableCornerSeatHolderReference) {
      throw new Error(
        'MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat-holder',
      )
    }
    ;[detachableCornerSeatReference, detachableCornerSeatHolderReference] =
      await Promise.all([
        context.getOpenGridDetachableCornerSeatReference(),
        context.getOpenGridDetachableCornerSeatHolderReference(),
      ])
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
  }
  return buildOpenGridStackableBoxWithParts(validation.value, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-stackable-box',
  build: buildOpenGridStackableBoxModel,
  buildWithParts: buildOpenGridStackableBoxWithPartsModel,
}
