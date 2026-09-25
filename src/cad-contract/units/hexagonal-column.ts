import type { FieldDiagnostic } from '../diagnostics'
import { PROTOTYPE_CONFIGURATION } from './prototype-configuration'

export type HexagonalColumnOrientation = 'lying' | 'standing'

export const HEXAGONAL_COLUMN_CONFIGURATION = {
  defaultHeight: 8,
  minHeight: 1,
  maxHeight: 500,
  heightSliderMax: 200,
  defaultCount: 1,
  minCount: 1,
  defaultGap: 1,
  minGap: 1,
  maxGap: 99,
  gapSliderMax: 10,
  maxCount: 20,
  defaultOrientation: 'lying' as HexagonalColumnOrientation,
  endTransitionLength: 0.2,
  crossSectionRotationDegrees: 30,
  referenceCrossSectionExtentY: 4.243524,
  crossSectionExtentX: 4.243524,
  crossSectionExtentY: 4.7,
} as const

export type HexagonalColumnParameterKey =
  'height' | 'count' | 'gap' | 'orientation'

export type HexagonalColumnParameters = {
  height: number
  count: number
  gap: number
  orientation: HexagonalColumnOrientation
}

type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

type ValidationIssue = FieldDiagnostic

export type HexagonalColumnValidation =
  | { valid: true; value: HexagonalColumnParameters }
  | { valid: false; issues: ValidationIssue[] }

const HEXAGONAL_COLUMN_PARAMETERS: HexagonalColumnParameterKey[] = [
  'height',
  'count',
  'gap',
  'orientation',
]
const HEXAGONAL_COLUMN_REQUIRED_PARAMETERS: HexagonalColumnParameterKey[] = [
  'height',
  'count',
  'gap',
]

function invalidRange(
  field: ValidationIssue['field'],
  min: number,
  max: number,
  unit: 'mm' | 'count' = 'mm',
): ValidationIssue {
  return {
    field,
    messageId: 'validation.invalid',
    params: { min, max, unit },
  }
}

function hasOnlySupportedKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

export function validateHexagonalColumnParameters(
  value: unknown,
): HexagonalColumnValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const candidate = value as Partial<
    Record<HexagonalColumnParameterKey, unknown>
  > &
    Record<string, unknown>
  const issues: ValidationIssue[] = []

  if (
    !hasOnlySupportedKeys(candidate, HEXAGONAL_COLUMN_PARAMETERS) ||
    !HEXAGONAL_COLUMN_REQUIRED_PARAMETERS.every((key) =>
      Object.prototype.hasOwnProperty.call(candidate, key),
    )
  ) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  const height = candidate.height
  if (typeof height !== 'number' || !Number.isFinite(height)) {
    issues.push({ field: 'height', messageId: 'validation.invalid' })
  } else if (!Number.isSafeInteger(height)) {
    issues.push({ field: 'height', messageId: 'validation.invalid' })
  } else if (
    height < HEXAGONAL_COLUMN_CONFIGURATION.minHeight ||
    height > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight
  ) {
    issues.push(
      invalidRange(
        'height',
        HEXAGONAL_COLUMN_CONFIGURATION.minHeight,
        HEXAGONAL_COLUMN_CONFIGURATION.maxHeight,
      ),
    )
  }

  const count = candidate.count
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    issues.push({ field: 'count', messageId: 'validation.invalid' })
  } else if (!Number.isSafeInteger(count)) {
    issues.push({ field: 'count', messageId: 'validation.invalid' })
  } else if (
    count < HEXAGONAL_COLUMN_CONFIGURATION.minCount ||
    count > HEXAGONAL_COLUMN_CONFIGURATION.maxCount
  ) {
    issues.push(
      invalidRange(
        'count',
        HEXAGONAL_COLUMN_CONFIGURATION.minCount,
        HEXAGONAL_COLUMN_CONFIGURATION.maxCount,
        'count',
      ),
    )
  }

  const gap = candidate.gap
  if (typeof gap !== 'number' || !Number.isFinite(gap)) {
    issues.push({ field: 'gap', messageId: 'validation.invalid' })
  } else if (!Number.isSafeInteger(gap)) {
    issues.push({ field: 'gap', messageId: 'validation.invalid' })
  } else if (
    gap < HEXAGONAL_COLUMN_CONFIGURATION.minGap ||
    gap > HEXAGONAL_COLUMN_CONFIGURATION.maxGap
  ) {
    issues.push(
      invalidRange(
        'gap',
        HEXAGONAL_COLUMN_CONFIGURATION.minGap,
        HEXAGONAL_COLUMN_CONFIGURATION.maxGap,
      ),
    )
  }

  const orientation =
    candidate.orientation ?? HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation
  if (orientation !== 'lying' && orientation !== 'standing') {
    issues.push({
      field: 'orientation',
      messageId: 'validation.invalid',
    })
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: HexagonalColumnParameters = {
    height: height as number,
    count: count as number,
    gap: gap as number,
    orientation: orientation as HexagonalColumnOrientation,
  }
  const bounds = boundsForHexagonalColumn(parameters)
  const rowExtent = bounds.max[1] - bounds.min[1]
  let lengthExtent = bounds.max[2] - bounds.min[2]
  if (parameters.orientation === 'lying') {
    lengthExtent = bounds.max[0] - bounds.min[0]
  }
  const exceedsWorkspace =
    rowExtent > PROTOTYPE_CONFIGURATION.maxDimension ||
    lengthExtent > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight

  if (exceedsWorkspace) {
    if (rowExtent > PROTOTYPE_CONFIGURATION.maxDimension) {
      issues.push({
        field: 'gap',
        messageId: 'validation.invalid',
      })
    }
    if (lengthExtent > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight) {
      issues.push({
        field: 'height',
        messageId: 'validation.invalid',
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function boundsForHexagonalColumn(
  parameters: HexagonalColumnParameters,
): ModelBounds {
  const rowExtent =
    HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY * parameters.count +
    parameters.gap * (parameters.count - 1)
  if (parameters.orientation === 'lying') {
    return {
      min: [-parameters.height / 2, -rowExtent / 2, 0],
      max: [
        parameters.height / 2,
        rowExtent / 2,
        HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX,
      ],
    }
  }

  return {
    min: [
      -HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
      -rowExtent / 2,
      0,
    ],
    max: [
      HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
      rowExtent / 2,
      parameters.height,
    ],
  }
}

export function hexagonalColumnFileName(
  parameters: HexagonalColumnParameters,
): string {
  return `hexagonal-column-${parameters.height}x${parameters.count}-g${parameters.gap}-${parameters.orientation}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function hexagonalColumnStlFileName(
  parameters: HexagonalColumnParameters,
): string {
  return `hexagonal-column-${parameters.height}x${parameters.count}-g${parameters.gap}-${parameters.orientation}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function isHexagonalColumnParameters(
  value: unknown,
): value is HexagonalColumnParameters {
  return validateHexagonalColumnParameters(value).valid
}
