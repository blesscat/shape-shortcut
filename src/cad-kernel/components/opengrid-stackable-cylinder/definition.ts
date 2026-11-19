/**
 * The `opengrid-stackable-cylinder` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridStackableCylinderParameters,
  validateOpenGridStackableCylinderParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import {
  buildOpenGridStackableCylinder,
  buildOpenGridStackableCylinderWithParts,
} from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridStackableCylinderModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  const validation = validateOpenGridStackableCylinderParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (validation.value.bottomSeatMode === 'detachable-corner-seat') {
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
  return buildOpenGridStackableCylinder(validation.value, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridStackableCylinderWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  const validation = validateOpenGridStackableCylinderParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (validation.value.bottomSeatMode === 'detachable-corner-seat') {
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
  return buildOpenGridStackableCylinderWithParts(validation.value, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-stackable-cylinder',
  build: buildOpenGridStackableCylinderModel,
  buildWithParts: buildOpenGridStackableCylinderWithPartsModel,
}
