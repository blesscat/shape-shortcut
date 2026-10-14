import {
  OPENGRID_ORGANIZER_BOX_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  openGridOrganizerBoxLayoutFor,
  type ModelParameterKey,
  type OpenGridLocatingSeatMode,
  type OpenGridOrganizerBoxBoxMode,
  type OpenGridOrganizerBoxLayout,
  type OpenGridOrganizerBoxParameters,
  type OpenGridOrganizerBoxShape,
  type OpenGridOrganizerBoxSpacingMode,
  validateOpenGridOrganizerBoxParameters,
} from '../../../../cad-contract/units'
import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'
import type { RawParameters } from '../../workspace/types'

export const numericKeys = [
  'holeCountX',
  'holeCountY',
  'holeSpacingX',
  'holeSpacingY',
  'holeDiameter',
  'holeWidth',
  'holeHeight',
  'holeCornerRadius',
  'holeDepth',
  'bottomThickness',
  'wallThickness',
  'stackingClearanceHeight',
] as const

export const spacingOptions: ReadonlyArray<{
  value: OpenGridOrganizerBoxSpacingMode
  labelKey: string
  descriptionKey: string
}> = [
  {
    value: 'linked',
    labelKey: 'panel.organizerBox.spacingLinked',
    descriptionKey: 'panel.organizerBox.spacingLinkedDescription',
  },
  {
    value: 'independent',
    labelKey: 'panel.organizerBox.spacingIndependent',
    descriptionKey: 'panel.organizerBox.spacingIndependentDescription',
  },
]

export const shapeOptions: ReadonlyArray<{
  value: OpenGridOrganizerBoxShape
  labelKey: string
}> = [
  { value: 'circle', labelKey: 'panel.organizerBox.shape.circle' },
  { value: 'triangle', labelKey: 'panel.organizerBox.shape.triangle' },
  { value: 'square', labelKey: 'panel.organizerBox.shape.square' },
  { value: 'pentagon', labelKey: 'panel.organizerBox.shape.pentagon' },
  { value: 'hexagon', labelKey: 'panel.organizerBox.shape.hexagon' },
  { value: 'rectangle', labelKey: 'panel.organizerBox.shape.rectangle' },
  { value: 'ellipse', labelKey: 'panel.organizerBox.shape.ellipse' },
]

export const seatOptions: ReadonlyArray<{
  value: OpenGridLocatingSeatMode
  labelKey: string
  descriptionKey: string
}> = [
  {
    value: 'none',
    labelKey: 'panel.seat.none',
    descriptionKey: 'panel.seat.noneDescription',
  },
  {
    value: 'detachable-corner-seat',
    labelKey: 'panel.seat.detachableCornerSeat',
    descriptionKey: 'panel.seat.detachableCornerSeatDescription',
  },
  {
    value: 'integrated',
    labelKey: 'panel.seat.integrated',
    descriptionKey: 'panel.seat.integratedDescription',
  },
]

export const bodyOptions: ReadonlyArray<{
  value: OpenGridOrganizerBoxBoxMode
  labelKey: string
  descriptionKey: string
}> = [
  {
    value: 'normal',
    labelKey: 'panel.organizerBox.body.normal',
    descriptionKey: 'panel.organizerBox.body.normalDescription',
  },
  {
    value: 'stackable',
    labelKey: 'panel.organizerBox.body.stackable',
    descriptionKey: 'panel.organizerBox.body.stackableDescription',
  },
]

export function spacingModeForRawParameters(
  rawParameters: RawParameters,
): OpenGridOrganizerBoxSpacingMode {
  return rawParameters.holeSpacingMode === 'independent'
    ? 'independent'
    : 'linked'
}

export function shapeForRawParameters(
  rawParameters: RawParameters,
): OpenGridOrganizerBoxShape {
  const value = rawParameters.holeShape
  return shapeOptions.some((option) => option.value === value)
    ? (value as OpenGridOrganizerBoxShape)
    : OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeShape
}

export function seatModeForRawParameters(
  rawParameters: RawParameters,
): OpenGridLocatingSeatMode {
  const value = rawParameters.cornerSeatMode
  const supported = seatOptions.some((option) => option.value === value)
  if (supported) return value as OpenGridLocatingSeatMode
  return OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.cornerSeatMode
}

export function bodyModeForRawParameters(
  rawParameters: RawParameters,
): OpenGridOrganizerBoxBoxMode {
  return rawParameters.boxMode === 'stackable' ? 'stackable' : 'normal'
}

export function spacingKeysForRawParameters(
  rawParameters: RawParameters,
): ReadonlyArray<'holeSpacingX' | 'holeSpacingY'> {
  return spacingModeForRawParameters(rawParameters) === 'linked'
    ? ['holeSpacingX']
    : ['holeSpacingX', 'holeSpacingY']
}

export function sizeFieldKeysForRawParameters(
  rawParameters: RawParameters,
): ReadonlyArray<(typeof numericKeys)[number]> {
  const shape = shapeForRawParameters(rawParameters)
  if (shape === 'rectangle') {
    return ['holeWidth', 'holeHeight', 'holeCornerRadius']
  }
  if (shape === 'ellipse') {
    return ['holeWidth', 'holeHeight']
  }
  return ['holeDiameter']
}

export function sizeSectionFieldKeysForRawParameters(
  rawParameters: RawParameters,
): ReadonlyArray<(typeof numericKeys)[number]> {
  return [
    ...sizeFieldKeysForRawParameters(rawParameters),
    'holeDepth',
    'bottomThickness',
  ]
}

export function layoutFor(rawParameters: RawParameters) {
  const numberFor = (key: ModelParameterKey, fallback: number): number =>
    Number(rawParameters[key] ?? String(fallback))
  const candidate = {
    holeCountX: numberFor(
      'holeCountX',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeCountX,
    ),
    holeCountY: numberFor(
      'holeCountY',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeCountY,
    ),
    holeSpacingMode: spacingModeForRawParameters(rawParameters),
    holeSpacingX: numberFor(
      'holeSpacingX',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeSpacingX,
    ),
    holeSpacingY: numberFor(
      'holeSpacingY',
      spacingModeForRawParameters(rawParameters) === 'linked'
        ? Number(
            rawParameters.holeSpacingX ??
              OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeSpacingX,
          )
        : OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeSpacingY,
    ),
    holeShape: shapeForRawParameters(rawParameters),
    holeDiameter: numberFor(
      'holeDiameter',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeDiameter,
    ),
    holeWidth: numberFor(
      'holeWidth',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeWidth,
    ),
    holeHeight: numberFor(
      'holeHeight',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeHeight,
    ),
    holeCornerRadius: numberFor(
      'holeCornerRadius',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeCornerRadius,
    ),
    holeDepth: numberFor(
      'holeDepth',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeDepth,
    ),
    bottomThickness: numberFor(
      'bottomThickness',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.bottomThickness,
    ),
    wallThickness: numberFor(
      'wallThickness',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.wallThickness,
    ),
    cornerSeatMode: seatModeForRawParameters(rawParameters),
    boxMode: bodyModeForRawParameters(rawParameters),
    stackingClearanceHeight: numberFor(
      'stackingClearanceHeight',
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.stackingClearanceHeight,
    ),
    topRimEnabled: rawParameters.topRimEnabled === 'true',
    topRimHeight: numberFor(
      'topRimHeight',
      OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultTopRimHeight,
    ),
  } satisfies OpenGridOrganizerBoxParameters
  const validation = validateOpenGridOrganizerBoxParameters(candidate)
  return validation.valid
    ? openGridOrganizerBoxLayoutFor(validation.value)
    : null
}

export function topRimHeightFieldFor(
  layout: OpenGridOrganizerBoxLayout | null,
): ParameterFieldDefinition {
  const externalTop = layout
    ? (layout.stacking?.externalTopZ ?? layout.bodyHeight)
    : OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeDepth +
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.bottomThickness +
      OPENGRID_ORGANIZER_BOX_CONFIGURATION.interfaceFloorDatumNormal
  const max = Math.max(
    OPENGRID_ORGANIZER_BOX_CONFIGURATION.minTopRimHeight,
    Math.floor(externalTop / 2),
  )
  return {
    key: 'topRimHeight',
    label: 'parameter.topRimHeight',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultTopRimHeight,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minTopRimHeight,
    max,
    step: 1,
    sliderMin: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minTopRimHeight,
    sliderMax: max,
  }
}
