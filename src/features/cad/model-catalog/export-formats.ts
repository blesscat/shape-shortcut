import type { ModelId } from '../../../cad-contract/units'
import type { ModelDefinition } from './types'

/**
 * Single source of truth for models without an STL download. Wall Cover
 * ships dual-color 3MF only: STL cannot preserve its two-color body/text
 * parts. Every other registered model exports STL.
 */
export const STL_UNSUPPORTED_MODEL_IDS: Readonly<
  Partial<Record<ModelId, true>>
> = {
  'opengrid-wall-cover': true,
}

export type ThreeMfAvailability = 'never' | 'always' | 'conditional'

/**
 * `conditional` means the model supports dual-color 3MF only for some
 * parameter values (for example stackable models with the dual-color rim
 * enabled), so callers must evaluate real parameters for gating and use
 * this only for static copy.
 */
export function threeMfAvailabilityFor(
  definition: ModelDefinition,
): ThreeMfAvailability {
  if (!definition.threeMfFileName) return 'never'
  const withDefaults = definition.threeMfFileName(definition.defaultParameters)
  return withDefaults != null ? 'always' : 'conditional'
}

/** Stable translation key; never render this value directly. */
export function exportFormatsLineKeyFor(definition: ModelDefinition): string {
  if (STL_UNSUPPORTED_MODEL_IDS[definition.id]) {
    return 'models.exportFormatLine.threeMfOnly'
  }
  switch (threeMfAvailabilityFor(definition)) {
    case 'always':
      return 'models.exportFormatLine.stlWithThreeMf'
    case 'conditional':
      return 'models.exportFormatLine.stlWithConditionalThreeMf'
    case 'never':
      return 'models.exportFormatLine.stlOnly'
  }
}
