/**
 * The `game-box` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import type { Shape3D } from 'replicad'
import {
  isGameBoxParameters,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import { buildGameBox } from './builder'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
} from '../../model/types'

async function buildGameBoxModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isGameBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
  }
  const build = await buildGameBox(parameters, context.coverSvg)
  return build.shape
}

async function buildGameBoxWithPartsModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (!isGameBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
  }
  const build = await buildGameBox(parameters, context.coverSvg)
  return {
    shape: build.shape,
    parts: build.parts,
  }
}

export const definition: ComponentModelDefinition = {
  id: 'game-box',
  build: buildGameBoxModel,
  buildWithParts: buildGameBoxWithPartsModel,
}
