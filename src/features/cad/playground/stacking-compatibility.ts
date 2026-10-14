import {
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  openGridOrganizerBoxLayoutFor,
  type ModelId,
  type ModelParameterValues,
  type OpenGridOrganizerBoxParameters,
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
  /**
   * Z (mm, from the piece's own base plane) of the mating datum on its top
   * interface — the surface a compatible piece's base plane lands on before
   * the seating drop. `null` when the piece cannot receive pieces.
   */
  seatDatumMm: number | null
  /**
   * How far a seated piece's base plane descends below the supporting
   * datum — the interface engagement (duplicated height) consumed by the
   * mating features. `null` when the piece cannot seat on others.
   */
  seatingDropMm: number | null
}

const NO_STACKING: StackingInterface = {
  top: false,
  bottom: false,
  cylinderDiameter: null,
  seatDatumMm: null,
  seatingDropMm: null,
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
      // on it. The builder's self-mate fixture seats the upper base plane
      // at lower.height - stackGrooveDepth.
      const heightRaw = (parameters as Record<string, unknown>)['height']
      const height = typeof heightRaw === 'number' ? heightRaw : null
      const diameterRaw = (parameters as Record<string, unknown>)[
        'innerDiameter'
      ]
      const innerDiameter = typeof diameterRaw === 'number' ? diameterRaw : null
      const seatable = (parameters as Record<string, unknown>)['bottomPlateMode'] !== true
      return {
        top: true,
        bottom: seatable,
        cylinderDiameter: innerDiameter,
        seatDatumMm: height,
        seatingDropMm:
          seatable && height !== null
            ? OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.stackGrooveDepth
            : null,
      }
    }
    case 'opengrid-stackable-box': {
      const bottom = stringParam(parameters, 'bottomMode') === 'stacking'
      const receives =
        stringParam(parameters, 'topRimMode') === 'stacking-rail'
      const heightRaw = (parameters as Record<string, unknown>)['height']
      const height = typeof heightRaw === 'number' ? heightRaw : null
      if (height === null) return NO_STACKING
      const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
      const seatDatum =
        height +
        configuration.bottomAssemblyHeight +
        configuration.topRailInnerChamfer +
        configuration.topRailInnerVerticalHeight
      return {
        top: receives,
        bottom,
        cylinderDiameter: null,
        seatDatumMm: receives ? seatDatum : null,
        seatingDropMm: bottom ? configuration.stackingGuideClearance : null,
      }
    }
    case 'opengrid-organizer-box': {
      if (stringParam(parameters, 'boxMode') !== 'stackable') return NO_STACKING
      // The stackable organizer reuses the stackable-box interface built on
      // its body height. The switch already narrowed the model id; the
      // parameters were validated for this component before this call.
      const bodyHeight =
        openGridOrganizerBoxLayoutFor(
          parameters as OpenGridOrganizerBoxParameters,
        ).bodyHeight
      const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
      const seatDatum =
        bodyHeight +
        configuration.bottomAssemblyHeight +
        configuration.topRailInnerChamfer +
        configuration.topRailInnerVerticalHeight
      return {
        top: true,
        bottom: true,
        cylinderDiameter: null,
        seatDatumMm: seatDatum,
        seatingDropMm: configuration.stackingGuideClearance,
      }
    }
    default:
      return NO_STACKING
  }
}

function boolParam(parameters: ModelParameterValues, key: string): boolean {
  return (parameters as Record<string, unknown>)[key] === true
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
