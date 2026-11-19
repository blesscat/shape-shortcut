/**
 * The `opengrid-openconnect-shelf` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridOpenConnectShelfParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import { buildOpenGridOpenConnectShelf } from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
} from '../../model/types'

async function buildOpenGridOpenConnectShelfModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridOpenConnectShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
  }
  if (!context.getOpenGridOpenConnectShelfLockedSlot) {
    throw new Error(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-shelf-locked-slot',
    )
  }
  return buildOpenGridOpenConnectShelf(parameters, {
    getLockedSlot: context.getOpenGridOpenConnectShelfLockedSlot,
    getOpenGridPrototype: context.getOpenGridPrototype,
    getOpenGridCanonicalTile: context.getOpenGridCanonicalTile,
    getOpenGridHalfCellPrototype: context.getOpenGridHalfCellPrototype,
    useCompoundChamferCutters: context.useCompoundChamferCutters,
    useCompoundScrewParts: context.useCompoundScrewParts,
    fuseHalfCellExtensionsIntoAssembly:
      context.fuseHalfCellExtensionsIntoAssembly,
    balancedFuseBatchSize: context.balancedFuseBatchSize,
    isGenerationCurrent: context.isGenerationCurrent,
    yieldToEventLoop: context.yieldToEventLoop,
    reportProgress: context.reportProgress,
    reportPhase: context.reportPhase,
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid-openconnect-shelf',
  build: buildOpenGridOpenConnectShelfModel,
}
