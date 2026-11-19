/**
 * The `opengrid-organizer-box` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridOrganizerBoxParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import {
  buildOpenGridOrganizerBox,
  buildOpenGridOrganizerBoxWithParts,
} from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridOrganizerBoxModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridOrganizerBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (parameters.cornerSeatMode === 'detachable-corner-seat') {
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
  return buildOpenGridOrganizerBox(parameters, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridOrganizerBoxWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (!isOpenGridOrganizerBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (parameters.cornerSeatMode === 'detachable-corner-seat') {
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
  return buildOpenGridOrganizerBoxWithParts(parameters, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-organizer-box',
  build: buildOpenGridOrganizerBoxModel,
  buildWithParts: buildOpenGridOrganizerBoxWithPartsModel,
}
