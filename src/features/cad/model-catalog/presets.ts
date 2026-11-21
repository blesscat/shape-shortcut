import type {
  ModelParameterValues,
  ValidationIssue,
} from '../../../cad-contract/units'
import { cloneModelParameters } from '../system-entry-context'
import type { ModelDefinition, ModelPreset } from './types'

export type ResolvedPresetParameters =
  { ok: true; parameters: ModelParameterValues } | { ok: false }

/** The parameter key that selects which part of a model is built. */
const PART_KEY = 'part'

/**
 * The message shown when a preset does not fit the parameters the user has
 * now. The key is scoped to the component, so every component can word the
 * message for its own parameters.
 */
export function presetNotApplicableMessageKey(
  definition: ModelDefinition,
): string {
  return `cad.presets.${definition.id}.notApplicable`
}

/**
 * The notice a component shows when a preset does not fit the parameters the
 * user has now.
 *
 * Only a component that merges presets onto the current parameters can end up
 * in that situation, so the notice exists for those components alone. A
 * component that merges onto its defaults has no user-facing notice: an
 * unusable preset there is a mistake in the preset list.
 */
export function presetNoticeKeyFor(definition: ModelDefinition): string | null {
  if (definition.presetBase !== 'current') return null
  return presetNotApplicableMessageKey(definition)
}

/**
 * The parameters a preset is merged onto: the definition's defaults, or the
 * parameters the user has now for a definition that asks for it.
 *
 * A definition with `presetBase: 'current'` keeps its other parameters only
 * when the caller hands over the current parameters; resolving the preset on
 * its own still starts from the defaults.
 */
function presetBaseParameters(
  definition: ModelDefinition,
  currentParameters?: ModelParameterValues,
): ModelParameterValues {
  if (definition.presetBase !== 'current') return definition.defaultParameters
  return currentParameters ?? definition.defaultParameters
}

/**
 * Validates the merged parameters and returns the accepted parameter set.
 *
 * A selected part that no longer exists is not a failure of the preset
 * itself, so a component that merges onto the current parameters retries the
 * parameters as the assembly. A component that merges onto its defaults
 * keeps the previous behaviour: a preset that does not validate is rejected.
 */
function validatePresetParameters(
  definition: ModelDefinition,
  parameters: ModelParameterValues,
): ModelParameterValues | null {
  const validation = definition.validateParameters(parameters)
  if (validation.valid) return validation.value.parameters
  if (definition.presetBase !== 'current') return null
  const partIsTheOnlyProblem =
    validation.issues.length > 0 &&
    validation.issues.every(
      (issue: ValidationIssue) => issue.field === PART_KEY,
    )
  if (!partIsTheOnlyProblem) return null
  if (!(PART_KEY in parameters)) return null
  const retry = definition.validateParameters({
    ...parameters,
    [PART_KEY]: 'assembly',
  })
  return retry.valid ? retry.value.parameters : null
}

/**
 * Merges a preset's overrides onto the definition's `defaultParameters` — or,
 * for a definition with `presetBase: 'current'`, onto the parameters the user
 * has now — and gates the result through the component's own validator. The
 * definition's defaults are never mutated; other components are never
 * consulted.
 */
export function resolvePresetParameters(
  definition: ModelDefinition,
  preset: ModelPreset,
  currentParameters?: ModelParameterValues,
): ResolvedPresetParameters {
  const merged: ModelParameterValues = {
    ...presetBaseParameters(definition, currentParameters),
    ...preset.overrides,
  }
  try {
    const parameters = validatePresetParameters(definition, merged)
    if (!parameters) return { ok: false }
    return {
      ok: true,
      parameters: cloneModelParameters(parameters),
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
