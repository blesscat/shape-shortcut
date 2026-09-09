import { OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION } from './opengrid-locating-assembly'

const PILLAR_NOMINAL_BODY_DIAMETER = 4.9

export type PillarMode = 'positioning' | 'detachable-corner-seat'
export type PillarParameterKey = 'mode' | 'length' | 'offset'

export type PillarPositioningParameters = {
  mode: 'positioning'
  length: number
  offset: number
}

export type PillarDetachableCornerSeatParameters = {
  mode: 'detachable-corner-seat'
  length: number
  offset: number
}

export type PillarParameters =
  PillarPositioningParameters | PillarDetachableCornerSeatParameters

export type PillarBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type PillarValidationIssue = {
  field: string
  messageId: string
}

export type PillarValidation =
  | { valid: true; value: PillarParameters }
  | { valid: false; issues: PillarValidationIssue[] }

export const PILLAR_CONFIGURATION = {
  positioningDefaultLength: 10,
  positioningMinLength: 3,
  positioningMaxLength: 500,
  positioningLengthSliderMax: 200,
  seatDefaultLength: 3.8,
  seatMinLength: 3,
  seatMaxLength: 100,
  seatLengthStep: 0.1,
  seatLengthSliderMax: 30,
  offsetMin: -1,
  offsetMax: 1,
  offsetStep: 0.1,
  bodyDiameter: PILLAR_NOMINAL_BODY_DIAMETER,
  positioningBodyDiameter: PILLAR_NOMINAL_BODY_DIAMETER,
  positioningLowerChamfer: 0.2,
  positioningUpperChamfer: 0.2,
  defaultParameters: {
    mode: 'detachable-corner-seat',
    length: 3.8,
    offset: 0,
  } satisfies PillarParameters,
} as const

const POSITIONING_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = [
  'mode',
  'length',
  'offset',
]
const DETACHABLE_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = [
  'mode',
  'length',
  'offset',
]

const OFFSET_STEP_TOLERANCE = 1e-9

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  )
}

function mismatchedParameterField(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): string {
  const unexpectedField = Object.keys(value).find(
    (field) => !expectedKeys.includes(field),
  )
  if (unexpectedField) return unexpectedField
  const missingField = expectedKeys.find(
    (field) => !Object.prototype.hasOwnProperty.call(value, field),
  )
  return missingField ?? 'parameters'
}

function isValidOffset(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (
    value < PILLAR_CONFIGURATION.offsetMin ||
    value > PILLAR_CONFIGURATION.offsetMax
  ) {
    return false
  }
  const nearestStep = Math.round(value / PILLAR_CONFIGURATION.offsetStep)
  return (
    Math.abs(value - nearestStep * PILLAR_CONFIGURATION.offsetStep) <=
    OFFSET_STEP_TOLERANCE
  )
}

function isValidSeatLength(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (
    value < PILLAR_CONFIGURATION.seatMinLength ||
    value > PILLAR_CONFIGURATION.seatMaxLength
  ) {
    return false
  }
  const nearestStep = Math.round(value / PILLAR_CONFIGURATION.seatLengthStep)
  return (
    Math.abs(value - nearestStep * PILLAR_CONFIGURATION.seatLengthStep) <=
    OFFSET_STEP_TOLERANCE
  )
}

export function validatePillarParameters(value: unknown): PillarValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const issues: PillarValidationIssue[] = []
  const mode = value.mode
  const isPositioningMode = mode === 'positioning'
  const isDetachableMode = mode === 'detachable-corner-seat'
  let expectedKeys = DETACHABLE_PILLAR_PARAMETER_KEYS
  if (isPositioningMode) expectedKeys = POSITIONING_PILLAR_PARAMETER_KEYS
  if (!hasExactKeys(value, expectedKeys)) {
    issues.push({
      field: mismatchedParameterField(value, expectedKeys),
      messageId: 'validation.invalid',
    })
  }

  if (!isPositioningMode && !isDetachableMode) {
    issues.push({
      field: 'mode',
      messageId: 'validation.invalid',
    })
  }

  if (isDetachableMode) {
    if (issues.length > 0) return { valid: false, issues }

    const seatLength = value.length
    if (!isValidSeatLength(seatLength)) {
      return {
        valid: false,
        issues: [{ field: 'length', messageId: 'validation.invalid' }],
      }
    }

    const seatOffset = value.offset
    if (!isValidOffset(seatOffset)) {
      return {
        valid: false,
        issues: [{ field: 'offset', messageId: 'validation.invalid' }],
      }
    }

    return {
      valid: true,
      value: {
        mode: 'detachable-corner-seat',
        length: seatLength,
        offset: seatOffset,
      },
    }
  }

  if (!isPositioningMode) return { valid: false, issues }

  const length = value.length
  if (typeof length !== 'number' || !Number.isFinite(length)) {
    issues.push({
      field: 'length',
      messageId: 'validation.invalid',
    })
  } else if (!Number.isSafeInteger(length)) {
    issues.push({
      field: 'length',
      messageId: 'validation.invalid',
    })
  } else if (
    length < PILLAR_CONFIGURATION.positioningMinLength ||
    length > PILLAR_CONFIGURATION.positioningMaxLength
  ) {
    issues.push({
      field: 'length',
      messageId: 'validation.invalid',
    })
  }

  const offset = value.offset
  if (typeof offset !== 'number' || !Number.isFinite(offset)) {
    issues.push({
      field: 'offset',
      messageId: 'validation.invalid',
    })
  } else if (
    offset < PILLAR_CONFIGURATION.offsetMin ||
    offset > PILLAR_CONFIGURATION.offsetMax
  ) {
    issues.push({
      field: 'offset',
      messageId: 'validation.invalid',
    })
  } else if (!isValidOffset(offset)) {
    issues.push({
      field: 'offset',
      messageId: 'validation.invalid',
    })
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      mode: 'positioning',
      length: length as number,
      offset: offset as number,
    },
  }
}

export function isPillarParameters(value: unknown): value is PillarParameters {
  return validatePillarParameters(value).valid
}

function legacyOffsetFor(value: Record<string, unknown>): number | undefined {
  const hasLegacyX = Object.prototype.hasOwnProperty.call(value, 'offsetX')
  const hasLegacyY = Object.prototype.hasOwnProperty.call(value, 'offsetY')
  if (!hasLegacyX || !hasLegacyY) return undefined

  const offsetX = value.offsetX
  const offsetY = value.offsetY
  if (!isValidOffset(offsetX) || !isValidOffset(offsetY)) return 0
  return offsetX === offsetY ? offsetX : 0
}

function isValidPositioningLength(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= PILLAR_CONFIGURATION.positioningMinLength &&
    value <= PILLAR_CONFIGURATION.positioningMaxLength
  )
}

export function normalizePillarParameters(value: unknown): PillarParameters {
  const validation = validatePillarParameters(value)
  if (validation.valid) return validation.value

  if (isRecord(value)) {
    const mode = value.mode
    const legacyOffset = legacyOffsetFor(value)

    if (mode === 'standard' || mode === 'thin-shell') {
      return { ...PILLAR_CONFIGURATION.defaultParameters }
    }

    const legacyLength = value.length
    if (isValidPositioningLength(legacyLength)) {
      if (
        mode === 'positioning' &&
        (Object.keys(value).length === 2 || legacyOffset !== undefined)
      ) {
        return {
          mode: 'positioning',
          length: legacyLength,
          offset: legacyOffset ?? 0,
        }
      }

      if (value.baseConnection === false) {
        return {
          mode: 'positioning',
          length: legacyLength,
          offset: 0,
        }
      }
    }
  }

  return { ...PILLAR_CONFIGURATION.defaultParameters }
}

export function pillarLengthForMode(mode: PillarMode): number {
  if (mode === 'detachable-corner-seat') {
    return PILLAR_CONFIGURATION.seatDefaultLength + seatHeadHeight()
  }
  throw new Error('PILLAR_POSITIONING_LENGTH_REQUIRES_PARAMETERS')
}

function seatHeadHeight(): number {
  const male = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male
  return male.totalHeight - male.bodyHeight
}

export function pillarLengthForParameters(
  parameters: PillarParameters,
): number {
  if (parameters.mode === 'positioning') return parameters.length
  return parameters.length + seatHeadHeight()
}

export function pillarBodyDiameterForParameters(
  parameters: PillarParameters,
): number {
  if (parameters.mode === 'detachable-corner-seat') {
    return PILLAR_CONFIGURATION.bodyDiameter + parameters.offset
  }
  return PILLAR_CONFIGURATION.positioningBodyDiameter + parameters.offset
}

export function boundsForPillar(parameters: PillarParameters): PillarBounds {
  if (parameters.mode === 'detachable-corner-seat') {
    const male = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male
    // The leaf head is wider than the body only along X; along Y the head
    // keeps the 1.96 mm key width, so the locating body always defines the
    // Y envelope (even when a negative offset shrinks it below Ø5).
    const yRadius = pillarBodyDiameterForParameters(parameters) / 2
    return {
      min: [male.bounds.min[0], -yRadius, 0],
      max: [male.bounds.max[0], yRadius, pillarLengthForParameters(parameters)],
    }
  }
  const diameter = pillarBodyDiameterForParameters(parameters)
  const radius = diameter / 2
  return {
    min: [-radius, -radius, 0],
    max: [radius, radius, pillarLengthForParameters(parameters)],
  }
}

function formatPillarOffset(value: number): string {
  return Object.is(value, -0) || value === 0 ? '0' : String(value)
}

function formatSeatLength(value: number): string {
  return String(Math.round(value * 10) / 10)
}

function isSeatDefaultLength(value: number): boolean {
  return (
    Math.abs(value - PILLAR_CONFIGURATION.seatDefaultLength) <=
    OFFSET_STEP_TOLERANCE
  )
}

function pillarExportStem(parameters: PillarParameters): string {
  if (parameters.mode === 'detachable-corner-seat') {
    const totalHeight = formatSeatLength(pillarLengthForParameters(parameters))
    const stem = `pillar-${totalHeight}-detachable-corner-seat`
    const withLength = isSeatDefaultLength(parameters.length)
      ? stem
      : `${stem}-z${formatSeatLength(parameters.length)}`
    if (parameters.offset === 0) return withLength
    return `${withLength}-xy${formatPillarOffset(parameters.offset)}`
  }
  const length = pillarLengthForParameters(parameters)
  const stem = `pillar-${length}-positioning`
  if (parameters.offset === 0) return stem
  return `${stem}-xy${formatPillarOffset(parameters.offset)}`
}

export function pillarFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.step`
}

export function pillarStlFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.stl`
}
