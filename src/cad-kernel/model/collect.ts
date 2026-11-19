import type { ModelId } from '../../cad-contract/units'
import type { ComponentModelDefinition } from './types'

/** The shape every per-component definition module exports. */
export type ComponentDefinitionModule = {
  definition: ComponentModelDefinition
}

/**
 * Collects the per-component definition modules into the registry list.
 *
 * The modules are supplied by the caller so the collection can be exercised
 * with a synthetic module map. A malformed module or a duplicated id fails
 * loudly instead of being silently ignored.
 */
export function collectKernelModelDefinitions(
  modules: Readonly<Record<string, ComponentDefinitionModule>>,
): ComponentModelDefinition[] {
  const definitions: ComponentModelDefinition[] = []
  const seenIds = new Set<ModelId>()

  for (const [path, module] of Object.entries(modules)) {
    const definition = module?.definition
    if (!definition || typeof definition !== 'object') {
      throw new Error(`KERNEL_DEFINITION_MODULE_INVALID:${path}`)
    }
    if (typeof definition.id !== 'string' || definition.id.length === 0) {
      throw new Error(`KERNEL_DEFINITION_ID_INVALID:${path}`)
    }
    if (typeof definition.build !== 'function') {
      throw new Error(`KERNEL_DEFINITION_BUILD_INVALID:${path}`)
    }
    if (seenIds.has(definition.id)) {
      throw new Error(`KERNEL_DEFINITION_ID_DUPLICATED:${definition.id}`)
    }
    seenIds.add(definition.id)
    definitions.push(definition)
  }

  return definitions
}
