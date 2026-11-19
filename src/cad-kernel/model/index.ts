import type { Shape3D } from 'replicad'
import type { ModelId, ModelParameterValues } from '../../cad-contract/units'
import { validateModelParameters } from '../../cad-contract/units'
import {
  collectKernelModelDefinitions,
  type ComponentDefinitionModule,
} from './collect'
import type {
  ComponentModelDefinition,
  KernelBuildContext,
  KernelModelBuildResult,
  KernelModelDefinition,
} from './types'

export type {
  KernelBuildContext,
  KernelBuildPhase,
  KernelModelBuildResult,
  KernelModelDefinition,
} from './types'

/**
 * The per-component definition modules. Every module under
 * `src/cad-kernel/components` that owns a `definition.ts` is collected
 * automatically, so adding a component never requires editing this file.
 */
const definitionModules = import.meta.glob<ComponentDefinitionModule>(
  '../components/*/definition.ts',
  { eager: true },
)

const collectedDefinitions = collectKernelModelDefinitions(definitionModules)

export const kernelModelDefinitions: ReadonlyArray<KernelModelDefinition> =
  collectedDefinitions

export function getKernelModelDefinition(
  modelId: ModelId,
): KernelModelDefinition | undefined {
  return kernelModelDefinitions.find((definition) => definition.id === modelId)
}

function getComponentModelDefinition(
  modelId: ModelId,
): ComponentModelDefinition | undefined {
  return collectedDefinitions.find((definition) => definition.id === modelId)
}

export async function buildModelBRep(
  modelId: ModelId,
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  const validation = validateModelParameters(modelId, parameters)
  if (!validation.valid) throw new Error('MODEL_PARAMETERS_INVALID')

  const definition = getKernelModelDefinition(modelId)
  if (!definition) throw new Error(`MODEL_DEFINITION_MISSING:${modelId}`)
  return definition.build(parameters, context)
}

export async function buildModelBRepWithParts(
  modelId: ModelId,
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  const definition = getComponentModelDefinition(modelId)
  if (definition?.buildWithParts) {
    return definition.buildWithParts(parameters, context)
  }

  return {
    shape: await buildModelBRep(modelId, parameters, context),
  }
}
