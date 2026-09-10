import { normalizeError, type CadError } from '../../../cad-contract/errors'
import type {
  DiagnosticDescriptor,
  DiagnosticParams,
} from '../../../cad-contract/diagnostics'
import type { WorkerClientError } from '../../../features/cad/worker-client'
import {
  HEXAGONAL_COLUMN_CONFIGURATION,
  isOpenGridSnapFootprint,
  isOpenGridSnapMagnetHoleShape,
  legacyInnerDiameterFor,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
  OPENGRID_LOCATING_SEAT_MODES,
  parseOpenGridSnapDecimalInput,
  parseDimensionInput,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_WALL_COVER_CONFIGURATION,
  normalizeOpenGridWallCoverText,
  normalizeOpenGridLocatingSeatMode,
  type OpenGridOpenShelfParameters,
  type OpenGridOpenConnectShelfParameters,
  PILLAR_CONFIGURATION,
  validateModelParameters,
  validatePillarParameters,
  type HexagonalColumnParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridDividerParameters,
  type OpenGridSnapParameters,
  type OpenGridOrganizerBoxParameters,
  type OpenGridOpenConnectOrganizerParameters,
  type OpenGridWallCoverParameters,
  type ScalarModelParameterKey,
  type ValidationIssue,
} from '../../../cad-contract/units'
import type { RawParameters } from './types'

export const DIMENSION_KEYS: ScalarModelParameterKey[] = [
  'width',
  'depth',
  'height',
]
export const GRID_PARAMETER_KEYS: ScalarModelParameterKey[] = [
  'rows',
  'columns',
]
export const OPENGRID_STACKABLE_BOX_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'cornerSeatMode',
  'fullBottomHoleGrid',
  'basePlateMode',
  'thinShellMode',
  'honeycombMode',
  ...OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
]
export const OPENGRID_STACKABLE_CYLINDER_PARAMETER_KEYS: ModelParameterKey[] = [
  'innerDiameter',
  'height',
  'thinBottomMode',
  'bottomPlateMode',
  'bottomSeatMode',
  'honeycombMode',
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
  'targetBoxGridsX',
  'targetBoxGridsY',
  'endClearance',
  'pegLengthMode',
  'pegDiameterIncrement',
]
export const HEXAGONAL_COLUMN_PARAMETER_KEYS: ScalarModelParameterKey[] = [
  'height',
  'count',
  'gap',
  'orientation',
]
export const PILLAR_PARAMETER_KEYS: ModelParameterKey[] = [
  'mode',
  'length',
  'offset',
]
export const OPENGRID_OPEN_SHELF_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'cellX',
  'cellZ',
  'angle',
  'honeycombMode',
]
export const OPENGRID_OPENCONNECT_SHELF_PARAMETER_KEYS: ModelParameterKey[] = [
  'columns',
  'rows',
  'connectorRows',
  'angle',
]
export const OPENGRID_ORGANIZER_BOX_PARAMETER_KEYS: ModelParameterKey[] = [
  'holeCountX',
  'holeCountY',
  'holeSpacingMode',
  'holeSpacingX',
  'holeSpacingY',
  'holeShape',
  'holeDiameter',
  'holeDepth',
  'bottomThickness',
  'cornerSeatMode',
  'boxMode',
  'stackingClearanceHeight',
]
export const OPENGRID_OPENCONNECT_ORGANIZER_PARAMETER_KEYS: ModelParameterKey[] =
  [
    'holeCountX',
    'holeCountY',
    'holeSpacingMode',
    'holeSpacingX',
    'holeSpacingY',
    'holeShape',
    'holeDiameter',
    'holeDepth',
    'bottomThickness',
    'edgeThickness',
    'tiltAngle',
  ]

function parameterKeysForModel(modelId: ModelId): readonly ModelParameterKey[] {
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

function usesHalfStepInput(modelId: ModelId, key: ModelParameterKey): boolean {
  if (modelId === 'opengrid-stackable-box') {
    return key === 'x' || key === 'y'
  }
  if (modelId === 'opengrid-open-shelf') {
    return key === 'x' || key === 'y'
  }
  if (modelId === 'opengrid-divider') {
    return key === 'left' || key === 'right' || key === 'up' || key === 'down'
  }
  if (modelId === 'opengrid-openconnect-shelf') {
    return key === 'angle'
  }
  return false
}

function legacyParameterDefault(
  modelId: ModelId,
  key: ModelParameterKey,
): string | undefined {
  if (modelId === 'opengrid-stackable-box' && key === 'cornerSeatMode') {
    return 'detachable-corner-seat'
  }
  if (modelId === 'opengrid-stackable-box' && key === 'thinShellMode') {
    return 'false'
  }
  if (
    (modelId === 'opengrid-stackable-box' ||
      modelId === 'opengrid-stackable-cylinder' ||
      modelId === 'opengrid-open-shelf') &&
    key === 'honeycombMode'
  ) {
    return 'false'
  }
  if (modelId !== 'opengrid-stackable-cylinder') return undefined
  if (key === 'thinBottomMode') return 'false'
  if (key === 'bottomPlateMode') return 'false'
  if (key === 'bottomSeatMode') return 'detachable-corner-seat'
  const defaultValue = (
    OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS as Record<string, unknown>
  )[key]
  if (typeof defaultValue === 'number') return String(defaultValue)
  return undefined
}

function legacyNumericDefault(
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

function parseBooleanRawParameter(
  rawValue: string | undefined,
  field: ModelParameterKey,
  defaultValue = false,
):
  | { valid: true; value: boolean }
  | { valid: false; messageId: string; field: ModelParameterKey } {
  const value = rawValue ?? String(defaultValue)
  if (value === 'true') return { valid: true, value: true }
  if (value === 'false') return { valid: true, value: false }
  return {
    valid: false,
    messageId: 'validation.invalid',
    field,
  }
}

function parseOpenGridSnapDimension(
  rawValue: string | undefined,
  field: ModelParameterKey,
):
  | { valid: true; value: number }
  | { valid: false; messageId: string; field: ModelParameterKey } {
  const value = rawValue === undefined ? '0' : rawValue
  const parsed = parseOpenGridSnapDecimalInput(value)
  if (parsed === null) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field,
    }
  }
  return { valid: true, value: parsed }
}

function parseSeatModeRawParameter(
  rawValue: string | undefined,
  field: ModelParameterKey,
):
  | { valid: true; value: (typeof OPENGRID_LOCATING_SEAT_MODES)[number] }
  | { valid: false; messageId: string; field: ModelParameterKey } {
  const value = rawValue ?? 'detachable-corner-seat'
  const normalizedValue = normalizeOpenGridLocatingSeatMode(value)
  if (normalizedValue !== undefined) {
    return {
      valid: true,
      value: normalizedValue,
    }
  }
  return {
    valid: false,
    messageId: 'validation.invalid',
    field,
  }
}

function pillarModelParameterField(
  field: string | undefined,
): ModelParameterKey | undefined {
  if (field === 'mode' || field === 'length' || field === 'offset') return field
  return undefined
}

function modelParameterFieldFromDiagnostic(
  field: string | undefined,
): ModelParameterKey | undefined {
  if (!field || field === 'parameters') return undefined
  return field as ModelParameterKey
}

function parsePillarDecimalInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function parseOpenGridDividerRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const defaults = OPENGRID_DIVIDER_CONFIGURATION.defaultParameters
  const invalid = (field: ModelParameterKey) => ({
    valid: false as const,
    messageId: 'validation.invalid',
    field,
  })

  const parsed: Record<string, unknown> = {}
  for (const key of ['left', 'right', 'up', 'down'] as const) {
    const value = parseHalfStepInput(raw[key] ?? String(defaults[key]))
    if (value === null) return invalid(key)
    parsed[key] = value
  }
  const height = parseDimensionInput(raw.height ?? String(defaults.height))
  if (height === null) return invalid('height')
  parsed.height = height
  const wallThickness = parseDimensionInput(
    raw.wallThickness ?? String(defaults.wallThickness),
  )
  if (wallThickness === null) return invalid('wallThickness')
  parsed.wallThickness = wallThickness

  const alignmentMode = raw.alignmentMode ?? String(defaults.alignmentMode)
  if (alignmentMode !== 'free' && alignmentMode !== 'box-fit') {
    return invalid('alignmentMode')
  }
  parsed.alignmentMode = alignmentMode
  for (const key of ['targetBoxGridsX', 'targetBoxGridsY'] as const) {
    const value = parseHalfStepInput(raw[key] ?? String(defaults[key]))
    if (value === null) return invalid(key)
    parsed[key] = value
  }
  const endClearance = parseFiniteDecimalInput(
    raw.endClearance ?? String(defaults.endClearance),
  )
  if (endClearance === null) return invalid('endClearance')
  parsed.endClearance = endClearance
  const pegLengthMode = raw.pegLengthMode ?? String(defaults.pegLengthMode)
  if (
    pegLengthMode !== 'snap' &&
    pegLengthMode !== 'thin-shell' &&
    pegLengthMode !== 'stackable'
  ) {
    return invalid('pegLengthMode')
  }
  parsed.pegLengthMode = pegLengthMode
  const pegDiameterIncrement = parseFiniteDecimalInput(
    raw.pegDiameterIncrement ?? String(defaults.pegDiameterIncrement),
  )
  if (pegDiameterIncrement === null) return invalid('pegDiameterIncrement')
  parsed.pegDiameterIncrement = pegDiameterIncrement

  const validation = validateModelParameters(
    'opengrid-divider',
    parsed as OpenGridDividerParameters,
  )
  if (!validation.valid) {
    const issue = validation.issues[0]
    const field = issue?.field
    return {
      valid: false,
      messageId: issue?.messageId ?? 'validation.invalid',
      field: modelParameterFieldFromDiagnostic(field),
      ...(issue?.params ? { params: issue.params } : {}),
    }
  }
  return { valid: true, value: validation.value.parameters }
}

function parsePillarRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const mode = raw.mode
  if (mode !== 'positioning' && mode !== 'detachable-corner-seat') {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'mode',
    }
  }

  const rawOffset = (field: 'offset'): number | null => {
    const value = raw[field] ?? '0'
    const trimmed = value.trim()
    if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  const offset = rawOffset('offset')
  if (offset === null) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'offset',
    }
  }

  if (mode === 'detachable-corner-seat') {
    const extraField = Object.keys(raw).find(
      (field) => field !== 'mode' && field !== 'length' && field !== 'offset',
    )
    if (extraField) {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: pillarModelParameterField(extraField),
      }
    }
    const rawSeatLength =
      raw.length ?? String(PILLAR_CONFIGURATION.seatDefaultLength)
    const seatLength = parsePillarDecimalInput(rawSeatLength)
    if (seatLength === null) {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: 'length',
      }
    }
    const seatValidation = validatePillarParameters({
      mode,
      length: seatLength,
      offset,
    })
    if (!seatValidation.valid) {
      const issue = seatValidation.issues[0]
      return {
        valid: false,
        messageId: issue?.messageId ?? 'validation.invalid',
        field: pillarModelParameterField(issue?.field),
      }
    }
    return { valid: true, value: seatValidation.value }
  }

  const rawLength =
    raw.length ?? String(PILLAR_CONFIGURATION.positioningDefaultLength)
  const length = parseDimensionInput(rawLength)
  if (length === null) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'length',
    }
  }

  const validation = validatePillarParameters({
    mode,
    length,
    offset,
  })
  if (!validation.valid) {
    const issue = validation.issues[0]
    return {
      valid: false,
      messageId: issue?.messageId ?? 'validation.invalid',
      field: pillarModelParameterField(issue?.field),
    }
  }
  return { valid: true, value: validation.value }
}

function parseOpenGridOrganizerBoxRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const defaults = OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS

  const countFor = (field: 'holeCountX' | 'holeCountY'): number | null =>
    parseDimensionInput(raw[field] ?? String(defaults[field]))
  const decimalFor = (
    field:
      | 'holeSpacingX'
      | 'holeSpacingY'
      | 'holeDiameter'
      | 'holeDepth'
      | 'bottomThickness'
      | 'stackingClearanceHeight',
    fallback: number,
  ): number | null => parseHalfStepInput(raw[field] ?? String(fallback))
  const invalid = (field: ModelParameterKey) => ({
    valid: false as const,
    messageId: 'validation.invalid',
    field,
  })

  const requiredFields = [
    'holeCountX',
    'holeCountY',
    'holeSpacingMode',
    'holeSpacingX',
    'holeSpacingY',
    'holeShape',
    'holeDiameter',
    'holeDepth',
    'bottomThickness',
    'cornerSeatMode',
    'boxMode',
    'stackingClearanceHeight',
  ] as const
  const missingField = requiredFields.find((field) => raw[field] === undefined)
  if (missingField) return invalid(missingField)

  const holeCountX = countFor('holeCountX')
  if (holeCountX === null) return invalid('holeCountX')
  const holeCountY = countFor('holeCountY')
  if (holeCountY === null) return invalid('holeCountY')

  const holeSpacingMode = raw.holeSpacingMode ?? defaults.holeSpacingMode
  if (holeSpacingMode !== 'linked' && holeSpacingMode !== 'independent') {
    return invalid('holeSpacingMode')
  }
  const holeSpacingX = decimalFor('holeSpacingX', defaults.holeSpacingX)
  if (holeSpacingX === null) return invalid('holeSpacingX')
  const holeSpacingY = decimalFor(
    'holeSpacingY',
    holeSpacingMode === 'linked' ? holeSpacingX : defaults.holeSpacingY,
  )
  if (holeSpacingY === null) return invalid('holeSpacingY')

  const holeShape = raw.holeShape ?? defaults.holeShape
  if (
    holeShape !== 'circle' &&
    holeShape !== 'triangle' &&
    holeShape !== 'square' &&
    holeShape !== 'pentagon' &&
    holeShape !== 'hexagon'
  ) {
    return invalid('holeShape')
  }
  const holeDiameter = decimalFor('holeDiameter', defaults.holeDiameter)
  if (holeDiameter === null) return invalid('holeDiameter')
  const holeDepth = decimalFor('holeDepth', defaults.holeDepth)
  if (holeDepth === null) return invalid('holeDepth')
  const bottomThickness = decimalFor(
    'bottomThickness',
    defaults.bottomThickness,
  )
  if (bottomThickness === null) return invalid('bottomThickness')

  const cornerSeatMode = raw.cornerSeatMode ?? defaults.cornerSeatMode
  if (
    cornerSeatMode !== 'none' &&
    cornerSeatMode !== 'detachable-corner-seat' &&
    cornerSeatMode !== 'integrated'
  ) {
    return invalid('cornerSeatMode')
  }

  const boxMode = raw.boxMode ?? defaults.boxMode
  if (boxMode !== 'normal' && boxMode !== 'stackable') {
    return invalid('boxMode')
  }

  const stackingClearanceHeight = decimalFor(
    'stackingClearanceHeight',
    defaults.stackingClearanceHeight,
  )
  if (stackingClearanceHeight === null) {
    return invalid('stackingClearanceHeight')
  }

  const validation = validateModelParameters('opengrid-organizer-box', {
    holeCountX,
    holeCountY,
    holeSpacingMode,
    holeSpacingX,
    holeSpacingY,
    holeShape,
    holeDiameter,
    holeDepth,
    bottomThickness,
    cornerSeatMode,
    boxMode,
    stackingClearanceHeight,
  })
  if (!validation.valid) {
    const issue = validation.issues[0]
    return {
      valid: false,
      messageId: issue?.messageId ?? 'validation.invalid',
      field: modelParameterFieldFromDiagnostic(issue?.field),
      ...(issue?.params ? { params: issue.params } : {}),
    }
  }
  return { valid: true, value: validation.value.parameters }
}

function parseOpenGridOpenConnectOrganizerRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const invalid = (field: ModelParameterKey) => ({
    valid: false as const,
    messageId: 'validation.invalid',
    field,
  })
  const missingField = OPENGRID_OPENCONNECT_ORGANIZER_PARAMETER_KEYS.find(
    (field) => raw[field] === undefined,
  )
  if (missingField) return invalid(missingField)

  const holeCountX = parseDimensionInput(raw.holeCountX ?? '')
  if (holeCountX === null) return invalid('holeCountX')
  const holeCountY = parseDimensionInput(raw.holeCountY ?? '')
  if (holeCountY === null) return invalid('holeCountY')

  const holeSpacingMode = raw.holeSpacingMode
  if (holeSpacingMode !== 'linked' && holeSpacingMode !== 'independent') {
    return invalid('holeSpacingMode')
  }
  const holeSpacingX = parseFiniteDecimalInput(raw.holeSpacingX ?? '')
  if (holeSpacingX === null) return invalid('holeSpacingX')
  const holeSpacingY = parseFiniteDecimalInput(raw.holeSpacingY ?? '')
  if (holeSpacingY === null) return invalid('holeSpacingY')

  const holeShape = raw.holeShape
  if (
    holeShape !== 'circle' &&
    holeShape !== 'triangle' &&
    holeShape !== 'square' &&
    holeShape !== 'pentagon' &&
    holeShape !== 'hexagon'
  ) {
    return invalid('holeShape')
  }

  const holeDiameter = parseFiniteDecimalInput(raw.holeDiameter ?? '')
  if (holeDiameter === null) return invalid('holeDiameter')
  const holeDepth = parseFiniteDecimalInput(raw.holeDepth ?? '')
  if (holeDepth === null) return invalid('holeDepth')
  const bottomThickness = parseFiniteDecimalInput(raw.bottomThickness ?? '')
  if (bottomThickness === null) return invalid('bottomThickness')
  const edgeThickness = parseFiniteDecimalInput(raw.edgeThickness ?? '')
  if (edgeThickness === null) return invalid('edgeThickness')
  const tiltAngle = parseFiniteDecimalInput(raw.tiltAngle ?? '')
  if (tiltAngle === null) return invalid('tiltAngle')

  const parameters: OpenGridOpenConnectOrganizerParameters = {
    holeCountX,
    holeCountY,
    holeSpacingMode,
    holeSpacingX,
    holeSpacingY,
    holeShape,
    holeDiameter,
    holeDepth,
    bottomThickness,
    edgeThickness,
    tiltAngle,
  }
  const validation = validateModelParameters(
    'opengrid-openconnect-organizer',
    parameters,
  )
  if (!validation.valid) {
    const issue = validation.issues[0]
    return {
      valid: false,
      messageId: issue?.messageId ?? 'validation.invalid',
      field: modelParameterFieldFromDiagnostic(issue?.field),
      ...(issue?.params ? { params: issue.params } : {}),
    }
  }
  return { valid: true, value: validation.value.parameters }
}

export function rawFromParameters(
  parameters: ModelParameterValues,
): RawParameters {
  if (Object.keys(parameters).length === 0) return {}

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
      thinBottomMode: String(
        'thinBottomMode' in parameters ? parameters.thinBottomMode : false,
      ),
      bottomPlateMode: String(
        'bottomPlateMode' in parameters ? parameters.bottomPlateMode : false,
      ),
      bottomSeatMode: String(bottomSeatMode),
      honeycombMode: String(
        'honeycombMode' in parameters ? parameters.honeycombMode : false,
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
      holeCountX: String(organizerParameters.holeCountX),
      holeCountY: String(organizerParameters.holeCountY),
      holeSpacingMode: organizerParameters.holeSpacingMode,
      holeSpacingX: String(organizerParameters.holeSpacingX),
      holeSpacingY: String(organizerParameters.holeSpacingY),
      holeShape: organizerParameters.holeShape,
      holeDiameter: String(organizerParameters.holeDiameter),
      holeDepth: String(organizerParameters.holeDepth),
      bottomThickness: String(organizerParameters.bottomThickness),
      edgeThickness: String(organizerParameters.edgeThickness),
      tiltAngle: String(organizerParameters.tiltAngle),
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
      holeDepth: String(organizerParameters.holeDepth),
      bottomThickness: String(organizerParameters.bottomThickness),
      cornerSeatMode: organizerParameters.cornerSeatMode,
      boxMode: organizerParameters.boxMode,
      stackingClearanceHeight: String(
        organizerParameters.stackingClearanceHeight,
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
    'fullBottomHoleGrid' in parameters &&
    'basePlateMode' in parameters
  ) {
    const stackableParameters = parameters as Partial<{
      x: number
      y: number
      height: number
      cornerSeatMode: (typeof OPENGRID_LOCATING_SEAT_MODES)[number]
      fullBottomHoleGrid: boolean
      basePlateMode: boolean
      thinShellMode: boolean
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
      basePlateMode: String(stackableParameters.basePlateMode),
      thinShellMode: String(stackableParameters.thinShellMode ?? false),
      honeycombMode: String(stackableParameters.honeycombMode ?? false),
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
      number | string
    >
    return Object.fromEntries(
      OPENGRID_DIVIDER_PARAMETER_KEYS.map((key) => [
        key,
        String(dividerParameters[key]),
      ]),
    ) as RawParameters
  }

  throw new Error('MODEL_PARAMETERS_EMPTY_OR_UNSUPPORTED')
}

export function parseRawParameters(
  raw: RawParameters,
  modelId: ModelId = 'box',
):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  if (
    modelId === 'opengrid-snap-remover' ||
    modelId === 'opengrid-wall-cover'
  ) {
    if (modelId === 'opengrid-wall-cover') {
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { valid: false, messageId: 'validation.invalid' }
      }
      const text = typeof raw.text === 'string' ? raw.text : undefined
      const openConnect = parseBooleanRawParameter(
        raw.openConnect,
        'openConnect',
        OPENGRID_WALL_COVER_CONFIGURATION.defaultOpenConnect,
      )
      if (!openConnect.valid) return openConnect
      const normalizedRaw = {
        ...raw,
        openConnect: openConnect.value,
        ...(text === undefined
          ? {}
          : { text: normalizeOpenGridWallCoverText(text) }),
      }
      const validation = validateModelParameters(modelId, normalizedRaw)
      if (!validation.valid) {
        const issue = validation.issues[0]
        return {
          valid: false,
          messageId: issue?.messageId ?? 'validation.invalid',
          field: modelParameterFieldFromDiagnostic(issue?.field),
          ...(issue?.params ? { params: issue.params } : {}),
        }
      }
      return { valid: true, value: validation.value.parameters }
    }
    const validation = validateModelParameters(modelId, {})
    if (validation.valid) {
      return { valid: true, value: validation.value.parameters }
    }
    return {
      valid: false,
      messageId: validation.issues[0]?.messageId ?? 'validation.invalid',
    }
  }

  const keys = parameterKeysForModel(modelId)
  const legacyAliases =
    modelId === 'opengrid-stackable-cylinder' ? (['diameter'] as const) : []
  const unexpectedKey = Object.keys(raw).find(
    (key) =>
      !keys.includes(key as ModelParameterKey) &&
      !legacyAliases.includes(key as never),
  )
  if (unexpectedKey) {
    return { valid: false, messageId: 'validation.invalid' }
  }

  if (
    modelId === 'opengrid-stackable-cylinder' &&
    raw.innerDiameter === undefined
  ) {
    const legacyInnerDiameter = legacyInnerDiameterFor(
      raw as unknown as Record<string, unknown>,
    )
    if (legacyInnerDiameter !== undefined) {
      raw = {
        ...raw,
        innerDiameter: String(legacyInnerDiameter),
      } as RawParameters
    }
  }

  if (modelId === 'opengrid-pillar') {
    return parsePillarRawParameters(raw)
  }

  if (modelId === 'opengrid-snap') {
    const variant = raw.variant
    if (variant !== 'Full' && variant !== 'Lite') {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: 'variant',
      }
    }

    const profile = raw.profile ?? 'Standard'
    if (profile !== 'Standard' && profile !== 'Directional') {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: 'profile',
      }
    }

    const offset = parseOpenGridSnapDecimalInput(raw.offset ?? '')
    if (offset === null) {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: 'offset',
      }
    }

    const footprint = raw.footprint ?? 'full'
    if (!isOpenGridSnapFootprint(footprint)) {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: 'footprint',
      }
    }

    const fourCornerLocatingHoles = parseBooleanRawParameter(
      raw.fourCornerLocatingHoles,
      'fourCornerLocatingHoles',
    )
    if (!fourCornerLocatingHoles.valid) return fourCornerLocatingHoles

    const centerRemoverHole = parseBooleanRawParameter(
      raw.centerRemoverHole,
      'centerRemoverHole',
    )
    if (!centerRemoverHole.valid) return centerRemoverHole

    const openConnect = parseBooleanRawParameter(raw.openConnect, 'openConnect')
    if (!openConnect.valid) return openConnect

    const legacyTopText = raw.topText ?? 'none'
    const topText = legacyTopText === 'SNAP' ? 'none' : legacyTopText
    if (topText !== 'none') {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: 'topText',
      }
    }

    const magnetHoleShape = raw.magnetHoleShape ?? 'none'
    if (!isOpenGridSnapMagnetHoleShape(magnetHoleShape)) {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: 'magnetHoleShape',
      }
    }

    const magnetHoleLength = parseOpenGridSnapDimension(
      raw.magnetHoleLength,
      'magnetHoleLength',
    )
    if (!magnetHoleLength.valid) return magnetHoleLength
    const magnetHoleWidth = parseOpenGridSnapDimension(
      raw.magnetHoleWidth,
      'magnetHoleWidth',
    )
    if (!magnetHoleWidth.valid) return magnetHoleWidth
    const magnetHoleDiameter = parseOpenGridSnapDimension(
      raw.magnetHoleDiameter,
      'magnetHoleDiameter',
    )
    if (!magnetHoleDiameter.valid) return magnetHoleDiameter
    const magnetHoleThickness = parseOpenGridSnapDimension(
      raw.magnetHoleThickness,
      'magnetHoleThickness',
    )
    if (!magnetHoleThickness.valid) return magnetHoleThickness

    const validation = validateModelParameters(modelId, {
      variant,
      profile,
      offset,
      footprint,
      fourCornerLocatingHoles: fourCornerLocatingHoles.value,
      centerRemoverHole: centerRemoverHole.value,
      openConnect: openConnect.value,
      topText,
      magnetHoleShape,
      magnetHoleLength: magnetHoleLength.value,
      magnetHoleWidth: magnetHoleWidth.value,
      magnetHoleDiameter: magnetHoleDiameter.value,
      magnetHoleThickness: magnetHoleThickness.value,
    } satisfies OpenGridSnapParameters)
    if (!validation.valid) {
      const issue = validation.issues[0]
      const field = issue?.field
      return {
        valid: false,
        messageId: issue?.messageId ?? 'validation.invalid',
        field: modelParameterFieldFromDiagnostic(field),
        ...(issue?.params ? { params: issue.params } : {}),
      }
    }
    return { valid: true, value: validation.value.parameters }
  }

  if (modelId === 'opengrid-organizer-box') {
    return parseOpenGridOrganizerBoxRawParameters(raw)
  }

  if (modelId === 'opengrid-openconnect-organizer') {
    return parseOpenGridOpenConnectOrganizerRawParameters(raw)
  }

  if (modelId === 'opengrid-divider') {
    return parseOpenGridDividerRawParameters(raw)
  }

  const parsed: Partial<
    Record<ModelParameterKey, number | string | boolean | null>
  > = {}
  for (const key of keys) {
    if (key === 'mode') {
      const mode = raw.mode
      if (mode !== 'standard' && mode !== 'thin-shell') {
        return {
          valid: false,
          messageId: 'validation.invalid',
          field: 'mode',
        }
      }
      parsed.mode = mode
      continue
    }
    if (key === 'cornerSeatMode' || key === 'bottomSeatMode') {
      const seatMode = parseSeatModeRawParameter(raw[key], key)
      if (!seatMode.valid) return seatMode
      parsed[key] = seatMode.value
      continue
    }
    if (
      key === 'fullBottomHoleGrid' ||
      key === 'thinBottomMode' ||
      key === 'bottomPlateMode' ||
      key === 'basePlateMode' ||
      key === 'thinShellMode' ||
      key === 'honeycombMode'
    ) {
      const rawValue = raw[key] ?? legacyParameterDefault(modelId, key)
      if (rawValue !== 'true' && rawValue !== 'false') {
        return {
          valid: false,
          messageId: 'validation.invalid',
          field: key,
        }
      }
      parsed[key] = rawValue === 'true'
      continue
    }
    if (key === 'orientation') {
      parsed[key] =
        raw[key] ?? HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation
      continue
    }
    const rawValue =
      raw[key] ??
      legacyParameterDefault(modelId, key) ??
      legacyNumericDefault(modelId, key) ??
      ''
    parsed[key] = usesHalfStepInput(modelId, key)
      ? parseHalfStepInput(rawValue)
      : parseDimensionInput(rawValue)
  }

  const validation = validateModelParameters(modelId, parsed)
  if (!validation.valid) {
    const issue = validation.issues[0]
    const field = issue?.field
    return {
      valid: false,
      messageId: issue?.messageId ?? 'validation.invalid',
      field: modelParameterFieldFromDiagnostic(field),
      ...(issue?.params ? { params: issue.params } : {}),
    }
  }
  return { valid: true, value: validation.value.parameters }
}

function parseHalfStepInput(raw: string): number | null {
  const value = raw.trim()
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) return null

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || !Number.isSafeInteger(parsed * 2)) {
    return null
  }
  return parsed
}

function parseFiniteDecimalInput(raw: string): number | null {
  const value = raw.trim()
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function supportsCadBrowser():
  { supported: true } | { supported: false; diagnostic: DiagnosticDescriptor } {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      diagnostic: { messageId: 'diagnostic.browserEnvironmentRequired' },
    }
  }
  if (typeof WebAssembly === 'undefined') {
    return {
      supported: false,
      diagnostic: { messageId: 'diagnostic.webAssemblyUnsupported' },
    }
  }
  if (typeof Worker === 'undefined') {
    return {
      supported: false,
      diagnostic: { messageId: 'diagnostic.workerUnsupported' },
    }
  }
  const canvas = document.createElement('canvas')
  const webgl =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  if (!webgl) {
    return {
      supported: false,
      diagnostic: { messageId: 'diagnostic.webglUnsupported' },
    }
  }
  return { supported: true }
}

export function errorForInput(
  issue: Pick<ValidationIssue, 'messageId' | 'field' | 'params'>,
): CadError {
  return normalizeError(undefined, {
    stage: 'validation',
    code: 'INVALID_INPUT',
    message: {
      messageId: issue.messageId,
      params: { ...issue.params, field: issue.field },
    },
    recoverable: true,
  })
}

export function errorForCapability(message: DiagnosticDescriptor): CadError {
  return normalizeError(undefined, {
    stage: 'worker',
    code: 'BROWSER_UNSUPPORTED',
    message,
    recoverable: false,
  })
}

export function errorForWorker(error: WorkerClientError): CadError {
  return normalizeError(error.error, {
    stage: error.kind === 'protocol-error' ? 'protocol' : 'worker',
    code:
      error.kind === 'protocol-error'
        ? 'PROTOCOL_INVALID'
        : 'WORKER_TERMINATED',
    recoverable: true,
  })
}
