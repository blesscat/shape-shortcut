/**
 * The `opengrid` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isOpenGridParameters,
  validateOpenGridGenerationSupport,
} from '../../../cad-contract/units'
import { buildOpenGridBRep } from './builder'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildOpenGridModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
  }
  const support = validateOpenGridGenerationSupport(parameters)
  if (!support.valid) {
    throw new Error('OPENGRID_UNSUPPORTED_CONFIGURATION')
  }
  return buildOpenGridBRep(parameters, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    getOpenGridPrototype: context.getOpenGridPrototype,
    getOpenGridCanonicalTile: context.getOpenGridCanonicalTile,
    getOpenGridHalfCellPrototype: context.getOpenGridHalfCellPrototype,
    useCompoundChamferCutters: context.useCompoundChamferCutters,
    useCompoundScrewParts: context.useCompoundScrewParts,
    fuseHalfCellExtensionsIntoAssembly:
      context.fuseHalfCellExtensionsIntoAssembly,
    balancedFuseBatchSize: context.balancedFuseBatchSize,
    reportProgress: context.reportProgress,
    reportPhase: (phase, durationMs) => {
      if (phase === 'assembly-fuse' || phase === 'prototype-build') {
        context.reportPhase?.(phase, durationMs)
      }
    },
    booleanOperations: context.booleanOperations,
  })
}

export const definition: ComponentModelDefinition = {
  id: 'opengrid',
  build: buildOpenGridModel,
}
