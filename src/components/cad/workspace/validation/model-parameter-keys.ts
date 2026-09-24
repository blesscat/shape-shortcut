import { TISSUE_BOX_KEYS } from '../../../../cad-contract/units/opengrid-openconnect-tissue-box'
import { OPENCONNECT_ALIGNMENT_KEYS } from '../../../../cad-contract/units/openconnect-alignment'
import {
  HEXAGONAL_COLUMN_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
  type ModelId,
  type ModelParameterKey,
  type ScalarModelParameterKey,
} from '../../../../cad-contract/units'

const DIMENSION_KEYS: ScalarModelParameterKey[] = ['width', 'depth', 'height']
const GRID_PARAMETER_KEYS: ScalarModelParameterKey[] = ['rows', 'columns']
const OPENGRID_STACKABLE_BOX_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'cornerSeatMode',
  'fullBottomHoleGrid',
  'topRimMode',
  'bottomMode',
  'honeycombMode',
  'topRimEnabled',
  'topRimHeight',
  ...OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
]
const OPENGRID_STACKABLE_CYLINDER_PARAMETER_KEYS: ModelParameterKey[] = [
  'innerDiameter',
  'height',
  'bottomPlateMode',
  'bottomSeatMode',
  'honeycombMode',
  'topRimEnabled',
  'topRimHeight',
  ...OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
]
export const OPENGRID_DIVIDER_PARAMETER_KEYS: ModelParameterKey[] = [
  'left',
  'right',
  'up',
  'down',
  'height',
  'wallThickness',
  'alignmentMode',
  'boxFitWallGrids',
  'endClearance',
  'pegLengthMode',
  'pegDiameterIncrement',
  'honeycombMode',
  'topRimEnabled',
  'topRimHeight',
]
const HEXAGONAL_COLUMN_PARAMETER_KEYS: ScalarModelParameterKey[] = [
  'height',
  'count',
  'gap',
  'orientation',
]
const PILLAR_PARAMETER_KEYS: ModelParameterKey[] = ['mode', 'length', 'offset']
const OPENGRID_OPEN_SHELF_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'cellX',
  'cellZ',
  'angle',
  'honeycombMode',
]
const OPENGRID_OPENCONNECT_SHELF_PARAMETER_KEYS: ModelParameterKey[] = [
  ...OPENCONNECT_ALIGNMENT_KEYS,
  'columns',
  'rows',
  'connectorRows',
  'angle',
]
const OPENGRID_ORGANIZER_BOX_PARAMETER_KEYS: ModelParameterKey[] = [
  'holeCountX',
  'holeCountY',
  'holeSpacingMode',
  'holeSpacingX',
  'holeSpacingY',
  'holeShape',
  'holeDiameter',
  'holeWidth',
  'holeHeight',
  'holeCornerRadius',
  'holeDepth',
  'bottomThickness',
  'wallThickness',
  'cornerSeatMode',
  'boxMode',
  'stackingClearanceHeight',
  'topRimEnabled',
  'topRimHeight',
]
export const OPENGRID_OPENCONNECT_ORGANIZER_PARAMETER_KEYS: ModelParameterKey[] =
  [
    ...OPENCONNECT_ALIGNMENT_KEYS,
    'holeCountX',
    'holeCountY',
    'holeSpacingMode',
    'holeSpacingX',
    'holeSpacingY',
    'holeShape',
    'holeDiameter',
    'holeWidth',
    'holeHeight',
    'holeCornerRadius',
    'holeDepth',
    'bottomThickness',
    'edgeThickness',
    'tiltAngle',
    'topRimEnabled',
    'topRimHeight',
  ]

export function parameterKeysForModel(
  modelId: ModelId,
): readonly ModelParameterKey[] {
  if (modelId === 'box') return DIMENSION_KEYS
  if (modelId === 'modular-grid-base') return GRID_PARAMETER_KEYS
  if (modelId === 'hsw-cell') return GRID_PARAMETER_KEYS
  if (modelId === 'hexagonal-column') return HEXAGONAL_COLUMN_PARAMETER_KEYS
  if (modelId === 'opengrid-stackable-box') {
    return OPENGRID_STACKABLE_BOX_PARAMETER_KEYS
  }
  if (modelId === 'opengrid-organizer-box') {
    return OPENGRID_ORGANIZER_BOX_PARAMETER_KEYS
  }
  if (modelId === 'opengrid-openconnect-tissue-box') return TISSUE_BOX_KEYS
  if (modelId === 'opengrid-openconnect-organizer') {
    return OPENGRID_OPENCONNECT_ORGANIZER_PARAMETER_KEYS
  }
  if (modelId === 'opengrid-stackable-cylinder') {
    return OPENGRID_STACKABLE_CYLINDER_PARAMETER_KEYS
  }
  if (modelId === 'opengrid-snap') {
    return [
      'variant',
      'profile',
      'offset',
      'footprint',
      'fourCornerLocatingHoles',
      'centerRemoverHole',
      'openConnect',
      'topText',
      'magnetHoleShape',
      'magnetHoleLength',
      'magnetHoleWidth',
      'magnetHoleDiameter',
      'magnetHoleThickness',
    ]
  }
  if (
    modelId === 'opengrid-snap-remover' ||
    modelId === 'opengrid-wall-cover'
  ) {
    return modelId === 'opengrid-wall-cover' ? ['text', 'openConnect'] : []
  }
  if (modelId === 'opengrid-divider') return OPENGRID_DIVIDER_PARAMETER_KEYS
  if (modelId === 'opengrid-pillar') return PILLAR_PARAMETER_KEYS
  if (modelId === 'opengrid-open-shelf') {
    return OPENGRID_OPEN_SHELF_PARAMETER_KEYS
  }
  if (modelId === 'opengrid-openconnect-shelf') {
    return OPENGRID_OPENCONNECT_SHELF_PARAMETER_KEYS
  }
  throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
}

export function usesHalfStepInput(
  modelId: ModelId,
  key: ModelParameterKey,
): boolean {
  if (modelId === 'opengrid-stackable-box') {
    return key === 'x' || key === 'y'
  }
  if (modelId === 'opengrid-open-shelf') {
    return key === 'x' || key === 'y'
  }
  if (modelId === 'opengrid-divider') {
    return (
      key === 'left' ||
      key === 'right' ||
      key === 'up' ||
      key === 'down' ||
      key === 'boxFitWallGrids'
    )
  }
  if (modelId === 'opengrid-openconnect-shelf') {
    return key === 'angle'
  }
  return false
}

export function legacyParameterDefault(
  modelId: ModelId,
  key: ModelParameterKey,
): string | undefined {
  if (modelId === 'opengrid-stackable-box' && key === 'cornerSeatMode') {
    return 'detachable-corner-seat'
  }
  if (modelId === 'opengrid-stackable-box' && key === 'topRimMode') {
    return 'stacking-rail'
  }
  if (modelId === 'opengrid-stackable-box' && key === 'bottomMode') {
    return 'stacking'
  }
  if (
    (modelId === 'opengrid-stackable-box' ||
      modelId === 'opengrid-stackable-cylinder' ||
      modelId === 'opengrid-open-shelf' ||
      modelId === 'opengrid-divider') &&
    key === 'honeycombMode'
  ) {
    return 'false'
  }
  if (
    modelId === 'opengrid-stackable-box' ||
    modelId === 'opengrid-organizer-box' ||
    modelId === 'opengrid-divider' ||
    modelId === 'opengrid-openconnect-organizer'
  ) {
    if (key === 'topRimEnabled') return 'false'
    if (key === 'topRimHeight') return '2'
  }
  if (modelId !== 'opengrid-stackable-cylinder') return undefined
  if (key === 'bottomPlateMode' || key === 'topRimEnabled') return 'false'
  if (key === 'bottomSeatMode') return 'detachable-corner-seat'
  const defaultValue = (
    OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS as Record<string, unknown>
  )[key]
  if (typeof defaultValue === 'number') return String(defaultValue)
  return undefined
}

export function legacyNumericDefault(
  modelId: ModelId,
  key: ModelParameterKey,
): string | undefined {
  if (
    modelId !== 'opengrid-stackable-box' ||
    !OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS.includes(
      key as (typeof OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS)[number],
    )
  ) {
    return undefined
  }
  const defaultValue =
    OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[
      key as (typeof OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS)[number]
    ]
  return String(defaultValue)
}
