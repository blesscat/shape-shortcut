/**
 * The `opengrid-openconnect-organizer` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridOpenConnectOrganizerParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import {
  buildOpenGridOpenConnectOrganizer,
  buildOpenGridOpenConnectOrganizerWithParts,
} from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridOpenConnectOrganizerModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridOpenConnectOrganizerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer')
  }
  if (!context.getOpenGridOpenConnectShelfLockedSlot) {
    throw new Error(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-organizer-locked-slot',
    )
  }
  return buildOpenGridOpenConnectOrganizer(parameters, {
    getLockedSlot: context.getOpenGridOpenConnectShelfLockedSlot,
    isGenerationCurrent: context.isGenerationCurrent,
    yieldToEventLoop: context.yieldToEventLoop,
    reportProgress: context.reportProgress,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridOpenConnectOrganizerWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (!isOpenGridOpenConnectOrganizerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer')
  }
  if (!context.getOpenGridOpenConnectShelfLockedSlot) {
    throw new Error(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-organizer-locked-slot',
    )
  }
  return buildOpenGridOpenConnectOrganizerWithParts(parameters, {
    getLockedSlot: context.getOpenGridOpenConnectShelfLockedSlot,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    reportProgress: context.reportProgress,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-openconnect-organizer',
  build: buildOpenGridOpenConnectOrganizerModel,
  buildWithParts: buildOpenGridOpenConnectOrganizerWithPartsModel,
}
