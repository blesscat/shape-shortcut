import {
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  openGridOpenConnectOrganizerLayoutFor,
  validateOpenGridOpenConnectOrganizerParameters,
  type ModelParameterKey,
  type OpenGridOpenConnectOrganizerLayout,
  type OpenGridOpenConnectOrganizerParameters,
  type OpenGridOpenConnectOrganizerShape,
  type OpenGridOpenConnectOrganizerSpacingMode,
} from '../../../../cad-contract/units'
import {
  opengridOpenConnectOrganizerDefinition,
  type ParameterField as ParameterFieldDefinition,
} from '../../../../features/cad/model-catalog'
import type { RawParameters } from '../../workspace/types'

export const ORGANIZER_NUMERIC_KEYS = [
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
  'edgeThickness',
  'tiltAngle',
] as const

export type OrganizerNumericKey = (typeof ORGANIZER_NUMERIC_KEYS)[number]

export const ORGANIZER_SPACING_OPTIONS: ReadonlyArray<{
  value: OpenGridOpenConnectOrganizerSpacingMode
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

export const ORGANIZER_SHAPE_OPTIONS: ReadonlyArray<{
  value: OpenGridOpenConnectOrganizerShape
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

export function organizerFieldFor(
  key: OrganizerNumericKey,
): ParameterFieldDefinition {
  const field = opengridOpenConnectOrganizerDefinition.parameterSchema.find(
    (candidate) => candidate.key === key,
  )
  if (!field) {
    throw new Error(`OPENCONNECT_ORGANIZER_FIELD_MISSING:${key}`)
  }
  return field
}

export function organizerValueFor(
  rawParameters: RawParameters,
  field: ParameterFieldDefinition,
): string {
  return rawParameters[field.key] ?? String(field.defaultValue)
}

export function spacingModeForRawParameters(
  rawParameters: RawParameters,
): OpenGridOpenConnectOrganizerSpacingMode {
  return rawParameters.holeSpacingMode === 'independent'
    ? 'independent'
    : 'linked'
}

export function shapeForRawParameters(
  rawParameters: RawParameters,
): OpenGridOpenConnectOrganizerShape {
  const value = rawParameters.holeShape
  const supported = ORGANIZER_SHAPE_OPTIONS.some(
    (option) => option.value === value,
  )
  return supported
    ? (value as OpenGridOpenConnectOrganizerShape)
    : OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeShape
}

export function spacingKeysForRawParameters(
  rawParameters: RawParameters,
): ReadonlyArray<'holeSpacingX' | 'holeSpacingY'> {
  return spacingModeForRawParameters(rawParameters) === 'linked'
    ? ['holeSpacingX']
    : ['holeSpacingX', 'holeSpacingY']
}

function sizeFieldKeysForRawParameters(
  rawParameters: RawParameters,
): ReadonlyArray<OrganizerNumericKey> {
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
): ReadonlyArray<OrganizerNumericKey> {
  return [
    ...sizeFieldKeysForRawParameters(rawParameters),
    'holeDepth',
    'bottomThickness',
    'edgeThickness',
  ]
}

export function layoutForRawParameters(
  rawParameters: RawParameters,
): OpenGridOpenConnectOrganizerLayout | null {
  const numberFor = (key: ModelParameterKey, fallback: number): number =>
    Number(rawParameters[key] ?? String(fallback))
  const spacingMode = spacingModeForRawParameters(rawParameters)
  const holeSpacingX = numberFor(
    'holeSpacingX',
    OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeSpacingX,
  )
  const candidate = {
    holeCountX: numberFor(
      'holeCountX',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeCountX,
    ),
    holeCountY: numberFor(
      'holeCountY',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeCountY,
    ),
    holeSpacingMode: spacingMode,
    holeSpacingX,
    holeSpacingY: numberFor(
      'holeSpacingY',
      spacingMode === 'linked'
        ? holeSpacingX
        : OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeSpacingY,
    ),
    holeShape: shapeForRawParameters(rawParameters),
    holeDiameter: numberFor(
      'holeDiameter',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeDiameter,
    ),
    holeWidth: numberFor(
      'holeWidth',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeWidth,
    ),
    holeHeight: numberFor(
      'holeHeight',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeHeight,
    ),
    holeCornerRadius: numberFor(
      'holeCornerRadius',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeCornerRadius,
    ),
    holeDepth: numberFor(
      'holeDepth',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeDepth,
    ),
    bottomThickness: numberFor(
      'bottomThickness',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.bottomThickness,
    ),
    edgeThickness: numberFor(
      'edgeThickness',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.edgeThickness,
    ),
    tiltAngle: numberFor(
      'tiltAngle',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.tiltAngle,
    ),
    topRimEnabled: rawParameters.topRimEnabled === 'true',
    topRimHeight: numberFor(
      'topRimHeight',
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultTopRimHeight,
    ),
    labelSlotEnabled: rawParameters.labelSlotEnabled === 'true',
    labelGridUnits: numberFor(
      'labelGridUnits',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.labelGridUnits,
    ),
  } satisfies OpenGridOpenConnectOrganizerParameters
  const validation = validateOpenGridOpenConnectOrganizerParameters(candidate)
  return validation.valid
    ? openGridOpenConnectOrganizerLayoutFor(validation.value)
    : null
}
