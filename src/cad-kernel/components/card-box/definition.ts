/**
 * The `card-box` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isCardBoxParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import { buildCardBox } from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildCardBoxModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isCardBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:card-box')
  }
  const build = await buildCardBox(parameters, context.cardBoxCoverSvg)
  return build.shape
}

async function buildCardBoxWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (!isCardBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:card-box')
  }
  const build = await buildCardBox(parameters, context.cardBoxCoverSvg)
  return {
    shape: build.shape,
    parts: build.parts,
  }
}

export const definition: ComponentModelDefinition = {
  id: 'card-box',
  build: buildCardBoxModel,
  buildWithParts: buildCardBoxWithPartsModel,
}
