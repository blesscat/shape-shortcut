import type {
  ModelId,
  ModelParameterValues,
} from '../../../cad-contract/units'

/**
 * Physical stacking interface of one instance, derived from its component
 * parameters. `top` = the piece's upper interface can receive a compatible
 * piece; `bottom` = the piece's lower interface can seat on a compatible
 * piece. Cylinders mate protrusion-into-groove only with an equal inner
 * diameter; `null` marks a non-cylindrical interface family.
 */
export type StackingInterface = {
  top: boolean
  bottom: boolean
  cylinderDiameter: number | null
}

const NO_STACKING: StackingInterface = {
  top: false,
  bottom: false,
  cylinderDiameter: null,
}

function stringParam(
  parameters: ModelParameterValues,
  key: string,
): string | null {
  const value = (parameters as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

/**
 * Stacking interface of one instance. Models without a stacking interface
 * (the default) can neither receive nor seat pieces.
 */
export function stackingInterfaceFor(
  modelId: ModelId,
  parameters: ModelParameterValues,
): StackingInterface {
  switch (modelId) {
    case 'opengrid-stackable-cylinder': {
      // The top mating protrusion is inherent to the model; a bottom plate
      // replaces the bottom groove with a flat plate, so nothing can seat
      // on it.
      const diameter = (parameters as Record<string, unknown>)['innerDiameter']
      return {
        top: true,
        bottom:
          (parameters as Record<string, unknown>)['bottomPlateMode'] !== true,
        cylinderDiameter: typeof diameter === 'number' ? diameter : null,
      }
    }
    case 'opengrid-stackable-box':
      return {
        top: stringParam(parameters, 'topRimMode') === 'stacking-rail',
        bottom: stringParam(parameters, 'bottomMode') === 'stacking',
        cylinderDiameter: null,
      }
    case 'opengrid-organizer-box': {
      const stackable = stringParam(parameters, 'boxMode') === 'stackable'
      return {
        top: stackable,
        bottom: stackable,
        cylinderDiameter: null,
      }
    }
    default:
      return NO_STACKING
  }
}

/**
 * Whether an upper piece can physically stack on a lower piece: the upper
 * bottom interface and the lower top interface must both be stacking
 * interfaces, and cylindrical families additionally require an equal inner
 * diameter.
 */
export function stackingInterfacesCompatible(
  upper: StackingInterface,
  lower: StackingInterface,
): boolean {
  if (!upper.bottom || !lower.top) return false
  if (upper.cylinderDiameter !== null || lower.cylinderDiameter !== null) {
    return (
      upper.cylinderDiameter !== null &&
      upper.cylinderDiameter === lower.cylinderDiameter
    )
  }
  return true
}
