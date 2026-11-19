import { describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import type {
  ModelId,
  ModelParameterValues,
} from '../../src/cad-contract/units'
import * as modelRegistry from '../../src/cad-kernel/model'
import type {
  KernelBuildContext,
  KernelBuildPhase,
  KernelModelBuildResult,
  KernelModelDefinition,
} from '../../src/cad-kernel/model'
import * as workerErrorMapping from '../../src/workers/error-mapping'

/**
 * The run-time exports of the two shared registry modules. The four registry
 * types are erased at run time, so they cannot appear here; they are pinned
 * at compile time by the annotations below.
 */
const REGISTRY_VALUE_EXPORTS = [
  'buildModelBRep',
  'buildModelBRepWithParts',
  'getKernelModelDefinition',
  'kernelModelDefinitions',
]

const ERROR_MAPPING_VALUE_EXPORTS = ['cadErrorCodeFor', 'cadErrorStageFor']

/**
 * The exported registry values under their published types. Removing one of
 * the four type exports breaks this annotation, and `pnpm check` fails with
 * it.
 */
const registrySurface: {
  definitions: ReadonlyArray<KernelModelDefinition>
  lookup: (modelId: ModelId) => KernelModelDefinition | undefined
  build: (
    modelId: ModelId,
    parameters: ModelParameterValues,
    context: KernelBuildContext,
  ) => Promise<Shape3D>
  buildWithParts: (
    modelId: ModelId,
    parameters: ModelParameterValues,
    context: KernelBuildContext,
  ) => Promise<KernelModelBuildResult>
  phase: KernelBuildPhase
} = {
  definitions: modelRegistry.kernelModelDefinitions,
  lookup: modelRegistry.getKernelModelDefinition,
  build: modelRegistry.buildModelBRep,
  buildWithParts: modelRegistry.buildModelBRepWithParts,
  phase: 'clone-translate',
}

describe('shared registry public surface', () => {
  it('exports exactly the named registry symbols', () => {
    expect(Object.keys(modelRegistry).sort()).toEqual(REGISTRY_VALUE_EXPORTS)
    expect(Object.keys(workerErrorMapping).sort()).toEqual(
      ERROR_MAPPING_VALUE_EXPORTS,
    )
  })

  it('keeps the exported registry values usable under their published types', () => {
    expect(Array.isArray(registrySurface.definitions)).toBe(true)
    expect(typeof registrySurface.lookup).toBe('function')
    expect(typeof registrySurface.build).toBe('function')
    expect(typeof registrySurface.buildWithParts).toBe('function')
    expect(registrySurface.phase).toBe('clone-translate')
  })
})
