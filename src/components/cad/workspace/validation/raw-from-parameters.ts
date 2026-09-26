import {
  TISSUE_BOX_KEYS,
  TISSUE_BOX_ALIGNMENT_DEFAULTS,
} from '../../../../cad-contract/units/opengrid-openconnect-tissue-box'
import { normalizedOpenConnectAlignment } from '../../../../cad-contract/units/openconnect-alignment'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_WALL_COVER_CONFIGURATION,
  OPENGRID_LOCATING_SEAT_MODES,
  normalizeOpenGridLocatingSeatMode,
  type HexagonalColumnParameters,
  type ModelParameterValues,
  type OpenGridOpenConnectOrganizerParameters,
  type OpenGridLabelCardParameters,
  type OpenGridOpenConnectShelfParameters,
  type OpenGridOpenShelfParameters,
  type OpenGridOrganizerBoxParameters,
  type OpenGridSnapParameters,
  type OpenGridWallCoverParameters,
} from '../../../../cad-contract/units'
import { OPENGRID_DIVIDER_PARAMETER_KEYS } from './model-parameter-keys'
import type { RawParameters } from '../types'

export function rawFromParameters(
  parameters: ModelParameterValues,
): RawParameters {
  if (Object.keys(parameters).length === 0) return {}

  if ('slotLength' in parameters && 'outerRadius' in parameters) {
    const normalized = {
      ...parameters,
      ...normalizedOpenConnectAlignment(
        parameters,
        TISSUE_BOX_ALIGNMENT_DEFAULTS,
      ),
    }
    return Object.fromEntries(
      TISSUE_BOX_KEYS.map((key) => [key, String(normalized[key])]),
    ) as RawParameters
  }

  if ('style' in parameters) {
    const labelCardParameters = parameters as OpenGridLabelCardParameters
    const raw: RawParameters = {
      gridUnits: String(labelCardParameters.gridUnits),
      style: labelCardParameters.style,
      icon: labelCardParameters.icon,
      textHeight: String(labelCardParameters.textHeight ?? 7),
      iconPosition: labelCardParameters.iconPosition ?? 'left',
      textLine2: labelCardParameters.textLine2 ?? '',
      textAlignment: labelCardParameters.textAlignment ?? 'center',
      textLine2Alignment: labelCardParameters.textLine2Alignment ?? 'center',
    }
    if (labelCardParameters.text !== undefined) {
      raw.text = labelCardParameters.text
    }
    return raw
  }

  if ('gridUnits' in parameters)
    return { gridUnits: String(parameters.gridUnits) }

  if ('text' in parameters) {
    const wallCoverParameters = parameters as OpenGridWallCoverParameters
    return {
      text: wallCoverParameters.text,
      openConnect: String(
        wallCoverParameters.openConnect ??
          OPENGRID_WALL_COVER_CONFIGURATION.defaultOpenConnect,
      ),
    }
  }

  if ('innerDiameter' in parameters && 'height' in parameters) {
    const bottomSeatMode =
      normalizeOpenGridLocatingSeatMode(
        'bottomSeatMode' in parameters ? parameters.bottomSeatMode : undefined,
      ) ?? OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS.bottomSeatMode
    const raw: RawParameters = {
      innerDiameter: String(parameters.innerDiameter),
      height: String(parameters.height),
      bottomPlateMode: String(
        'bottomPlateMode' in parameters ? parameters.bottomPlateMode : false,
      ),
      bottomSeatMode: String(bottomSeatMode),
      honeycombMode: String(
        'honeycombMode' in parameters ? parameters.honeycombMode : false,
      ),
      topRimEnabled: String(
        'topRimEnabled' in parameters ? parameters.topRimEnabled : false,
      ),
      topRimHeight: String(
        'topRimHeight' in parameters
          ? parameters.topRimHeight
          : OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS.topRimHeight,
      ),
    }
    for (const key of OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS) {
      raw[key] = String(
        key in parameters
          ? parameters[key]
          : OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS[key],
      )
    }
    return raw
  }

  if ('holeCountX' in parameters && 'tiltAngle' in parameters) {
    const organizerParameters =
      parameters as OpenGridOpenConnectOrganizerParameters
    return {
      ...normalizedOpenConnectAlignment(organizerParameters),
      holeCountX: String(organizerParameters.holeCountX),
      holeCountY: String(organizerParameters.holeCountY),
      holeSpacingMode: organizerParameters.holeSpacingMode,
      holeSpacingX: String(organizerParameters.holeSpacingX),
      holeSpacingY: String(organizerParameters.holeSpacingY),
      holeShape: organizerParameters.holeShape,
      holeDiameter: String(organizerParameters.holeDiameter),
      holeWidth: String(organizerParameters.holeWidth),
      holeHeight: String(organizerParameters.holeHeight),
      holeCornerRadius: String(organizerParameters.holeCornerRadius),
      holeDepth: String(organizerParameters.holeDepth),
      bottomThickness: String(organizerParameters.bottomThickness),
      edgeThickness: String(organizerParameters.edgeThickness),
      tiltAngle: String(organizerParameters.tiltAngle),
      topRimEnabled: String(
        'topRimEnabled' in organizerParameters
          ? organizerParameters.topRimEnabled
          : OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.topRimEnabled,
      ),
      topRimHeight: String(
        'topRimHeight' in organizerParameters
          ? organizerParameters.topRimHeight
          : OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.topRimHeight,
      ),
      labelSlotEnabled: String(
        'labelSlotEnabled' in organizerParameters
          ? organizerParameters.labelSlotEnabled
          : OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.labelSlotEnabled,
      ),
      labelGridUnits: String(
        'labelGridUnits' in organizerParameters
          ? organizerParameters.labelGridUnits
          : OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.labelGridUnits,
      ),
    }
  }

  if ('holeCountX' in parameters) {
    const organizerParameters = parameters as OpenGridOrganizerBoxParameters
    return {
      holeCountX: String(organizerParameters.holeCountX),
      holeCountY: String(organizerParameters.holeCountY),
      holeSpacingMode: organizerParameters.holeSpacingMode,
      holeSpacingX: String(organizerParameters.holeSpacingX),
      holeSpacingY: String(organizerParameters.holeSpacingY),
      holeShape: organizerParameters.holeShape,
      holeDiameter: String(organizerParameters.holeDiameter),
      holeWidth: String(organizerParameters.holeWidth),
      holeHeight: String(organizerParameters.holeHeight),
      holeCornerRadius: String(organizerParameters.holeCornerRadius),
      holeDepth: String(organizerParameters.holeDepth),
      bottomThickness: String(organizerParameters.bottomThickness),
      wallThickness: String(organizerParameters.wallThickness),
      cornerSeatMode: organizerParameters.cornerSeatMode,
      boxMode: organizerParameters.boxMode,
      stackingClearanceHeight: String(
        organizerParameters.stackingClearanceHeight,
      ),
      topRimEnabled: String(
        'topRimEnabled' in organizerParameters
          ? organizerParameters.topRimEnabled
          : OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.topRimEnabled,
      ),
      topRimHeight: String(
        'topRimHeight' in organizerParameters
          ? organizerParameters.topRimHeight
          : OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.topRimHeight,
      ),
    }
  }

  if ('width' in parameters) {
    return {
      width: String(parameters.width),
      depth: String(parameters.depth),
      height: String(parameters.height),
    }
  }

  if ('mode' in parameters) {
    if (
      (parameters.mode === 'detachable-corner-seat' ||
        parameters.mode === 'positioning') &&
      'length' in parameters
    ) {
      return {
        mode: parameters.mode,
        length: String(parameters.length),
        offset: String(parameters.offset),
      }
    }
    throw new Error('PILLAR_PARAMETERS_INVALID')
  }

  if ('cellX' in parameters && 'cellZ' in parameters && 'angle' in parameters) {
    const openShelfParameters = parameters as OpenGridOpenShelfParameters
    return {
      x: String(openShelfParameters.x),
      y: String(openShelfParameters.y),
      height: String(openShelfParameters.height),
      cellX: String(openShelfParameters.cellX),
      cellZ: String(openShelfParameters.cellZ),
      angle: String(openShelfParameters.angle),
      honeycombMode: String(openShelfParameters.honeycombMode ?? false),
    }
  }

  if (
    'columns' in parameters &&
    'rows' in parameters &&
    'angle' in parameters
  ) {
    const shelfParameters = parameters as OpenGridOpenConnectShelfParameters
    return {
      ...normalizedOpenConnectAlignment(shelfParameters),
      columns: String(shelfParameters.columns),
      rows: String(shelfParameters.rows),
      connectorRows: String(shelfParameters.connectorRows),
      angle: String(shelfParameters.angle),
    }
  }

  if (
    'x' in parameters &&
    'y' in parameters &&
    'height' in parameters &&
    'cornerSeatMode' in parameters &&
    'fullBottomHoleGrid' in parameters
  ) {
    const stackableParameters = parameters as Partial<{
      x: number
      y: number
      height: number
      cornerSeatMode: (typeof OPENGRID_LOCATING_SEAT_MODES)[number]
      fullBottomHoleGrid: boolean
      topRimMode: 'stacking-rail' | 'flat-top'
      bottomMode: 'stacking' | 'thin-shell' | 'none'
      honeycombMode: boolean
    }> &
      Partial<
        Record<
          (typeof OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS)[number],
          number
        >
      >
    const cornerSeatMode =
      normalizeOpenGridLocatingSeatMode(stackableParameters.cornerSeatMode) ??
      OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.cornerSeatMode
    const rawParameters: RawParameters = {
      x: String(stackableParameters.x),
      y: String(stackableParameters.y),
      height: String(stackableParameters.height),
      cornerSeatMode: String(cornerSeatMode),
      fullBottomHoleGrid: String(stackableParameters.fullBottomHoleGrid),
      topRimMode:
        stackableParameters.topRimMode ??
        OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.topRimMode,
      bottomMode:
        stackableParameters.bottomMode ??
        OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.bottomMode,
      honeycombMode: String(stackableParameters.honeycombMode ?? false),
      topRimEnabled: String(
        'topRimEnabled' in stackableParameters
          ? stackableParameters.topRimEnabled
          : OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.topRimEnabled,
      ),
      topRimHeight: String(
        'topRimHeight' in stackableParameters
          ? stackableParameters.topRimHeight
          : OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.topRimHeight,
      ),
    }
    for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
      const value =
        stackableParameters[key] ??
        OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[key]
      rawParameters[key] = String(value)
    }
    return rawParameters
  }

  if ('x' in parameters && 'y' in parameters && 'height' in parameters) {
    return {
      x: String(parameters.x),
      y: String(parameters.y),
      height: String(parameters.height),
    }
  }

  if ('orientation' in parameters) {
    const hexagonalParameters = parameters as HexagonalColumnParameters
    return {
      height: String(hexagonalParameters.height),
      count: String(hexagonalParameters.count),
      gap: String(hexagonalParameters.gap),
      orientation: hexagonalParameters.orientation,
    }
  }

  if ('offset' in parameters) {
    const snapParameters = parameters as OpenGridSnapParameters
    return {
      variant: snapParameters.variant,
      profile: snapParameters.profile,
      offset: String(snapParameters.offset),
      footprint: snapParameters.footprint,
      fourCornerLocatingHoles: String(snapParameters.fourCornerLocatingHoles),
      centerRemoverHole: String(snapParameters.centerRemoverHole),
      openConnect: String(snapParameters.openConnect),
      topText: snapParameters.topText ?? 'none',
      magnetHoleShape: snapParameters.magnetHoleShape ?? 'none',
      magnetHoleLength: String(snapParameters.magnetHoleLength ?? 0),
      magnetHoleWidth: String(snapParameters.magnetHoleWidth ?? 0),
      magnetHoleDiameter: String(snapParameters.magnetHoleDiameter ?? 0),
      magnetHoleThickness: String(snapParameters.magnetHoleThickness ?? 0),
    }
  }

  if ('rows' in parameters) {
    const gridParameters = parameters as { rows: number; columns: number }
    return {
      rows: String(gridParameters.rows),
      columns: String(gridParameters.columns),
    }
  }

  if ('left' in parameters) {
    const dividerParameters = parameters as unknown as Record<
      (typeof OPENGRID_DIVIDER_PARAMETER_KEYS)[number],
      number | string | boolean
    >
    return Object.fromEntries(
      OPENGRID_DIVIDER_PARAMETER_KEYS.map((key) => [
        key,
        String(
          dividerParameters[key] ?? (key === 'honeycombMode' ? false : ''),
        ),
      ]),
    ) as RawParameters
  }

  throw new Error('MODEL_PARAMETERS_EMPTY_OR_UNSUPPORTED')
}
