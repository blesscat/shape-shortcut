import type { FieldDiagnostic } from '../diagnostics'
import { PROTOTYPE_CONFIGURATION } from './prototype-configuration'

export type DimensionKey = 'width' | 'depth' | 'height'

export type BoxParameters = Record<DimensionKey, number>

type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type BoxBounds = ModelBounds

type ValidationIssue = FieldDiagnostic

export type BoxValidation =
  | { valid: true; value: BoxParameters }
  | { valid: false; issues: ValidationIssue[] }

const DIMENSIONS: DimensionKey[] = ['width', 'depth', 'height']

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

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  )
}

export function validateBoxParameters(value: unknown): BoxValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const candidate = value as Partial<Record<DimensionKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []

  if (!hasExactKeys(candidate, DIMENSIONS)) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  for (const field of DIMENSIONS) {
    const dimension = candidate[field]
    if (typeof dimension !== 'number' || !Number.isFinite(dimension)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (!Number.isInteger(dimension)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (
      dimension < PROTOTYPE_CONFIGURATION.minDimension ||
      dimension > PROTOTYPE_CONFIGURATION.maxDimension
    ) {
      issues.push(
        invalidRange(
          field,
          PROTOTYPE_CONFIGURATION.minDimension,
          PROTOTYPE_CONFIGURATION.maxDimension,
        ),
      )
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      width: candidate.width as number,
      depth: candidate.depth as number,
      height: candidate.height as number,
    },
  }
}

export function boundsForBox(parameters: BoxParameters): BoxBounds {
  return {
    min: [-parameters.width / 2, -parameters.depth / 2, 0],
    max: [parameters.width / 2, parameters.depth / 2, parameters.height],
  }
}

export function boxFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function boxStlFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function isBoxParameters(value: unknown): value is BoxParameters {
  return validateBoxParameters(value).valid
}
