import type { FieldDiagnostic } from '../diagnostics'
import { PROTOTYPE_CONFIGURATION } from './prototype-configuration'

export type GridParameterKey = 'rows' | 'columns'

export type ModularGridBaseParameters = Record<GridParameterKey, number>

type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

type ValidationIssue = FieldDiagnostic

export type ModularGridBaseValidation =
  | { valid: true; value: ModularGridBaseParameters }
  | { valid: false; issues: ValidationIssue[] }

const GRID_PARAMETERS: GridParameterKey[] = ['rows', 'columns']

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

export function validateModularGridBaseParameters(
  value: unknown,
): ModularGridBaseValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const candidate = value as Partial<Record<GridParameterKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []
  const grid = PROTOTYPE_CONFIGURATION.modularGridBase

  if (!hasExactKeys(candidate, GRID_PARAMETERS)) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  for (const field of GRID_PARAMETERS) {
    const count = candidate[field]
    if (typeof count !== 'number' || !Number.isFinite(count)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (!Number.isInteger(count)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (count < PROTOTYPE_CONFIGURATION.minDimension) {
      issues.push(
        invalidRange(
          field,
          PROTOTYPE_CONFIGURATION.minDimension,
          grid.maxGridCount,
          'count',
        ),
      )
      continue
    }
    if (count > grid.maxGridCount) {
      issues.push(
        invalidRange(
          field,
          PROTOTYPE_CONFIGURATION.minDimension,
          grid.maxGridCount,
          'count',
        ),
      )
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: ModularGridBaseParameters = {
    rows: candidate.rows as number,
    columns: candidate.columns as number,
  }
  const width = parameters.columns * grid.cellWidth
  const depth = parameters.rows * grid.cellDepth

  if (width > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push(invalidRange('columns', 1, grid.maxGridCount, 'count'))
  }
  if (depth > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push(invalidRange('rows', 1, grid.maxGridCount, 'count'))
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function boundsForModularGridBase(
  parameters: ModularGridBaseParameters,
): ModelBounds {
  const grid = PROTOTYPE_CONFIGURATION.modularGridBase
  const width = parameters.columns * grid.cellWidth
  const depth = parameters.rows * grid.cellDepth
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [width / 2, depth / 2, grid.height],
  }
}

export function modularGridBaseFileName(
  parameters: ModularGridBaseParameters,
): string {
  return `modular-grid-base-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function modularGridBaseStlFileName(
  parameters: ModularGridBaseParameters,
): string {
  return `modular-grid-base-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function isModularGridBaseParameters(
  value: unknown,
): value is ModularGridBaseParameters {
  return validateModularGridBaseParameters(value).valid
}
