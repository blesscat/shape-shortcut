import type { ModelParameterValues } from '../../../cad-contract/units'
import { cloneModelParameters } from '../system-entry-context'
import type { ModelDefinition, ModelPreset } from './types'

export type ResolvedPresetParameters =
  { ok: true; parameters: ModelParameterValues } | { ok: false }

/**
 * Merges a preset's overrides onto the definition's `defaultParameters` and
 * gates the result through the component's own validator. The definition's
 * defaults are never mutated; other components are never consulted.
 */
export function resolvePresetParameters(
  definition: ModelDefinition,
  preset: ModelPreset,
): ResolvedPresetParameters {
  const merged: ModelParameterValues = {
    ...definition.defaultParameters,
    ...preset.overrides,
  }
  try {
    const validation = definition.validateParameters(merged)
    if (!validation.valid) return { ok: false }
    return {
      ok: true,
      parameters: cloneModelParameters(validation.value.parameters),
    }
  } catch {
    return { ok: false }
  }
}

export function findModelPreset(
  definition: ModelDefinition,
  presetId: string,
): ModelPreset | undefined {
  return definition.presets?.find((preset) => preset.id === presetId)
}
