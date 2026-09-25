import type { FieldDiagnostic } from '../diagnostics'
import { HSW_CELL_CONFIGURATION } from './hsw-cell-configuration'
import { PROTOTYPE_CONFIGURATION } from './prototype-configuration'

export { HSW_CELL_CONFIGURATION } from './hsw-cell-configuration'

type GridParameterKey = 'rows' | 'columns'

export type HswCellParameters = Record<GridParameterKey, number>

type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

type ValidationIssue = FieldDiagnostic

export type HswCellValidation =
  | { valid: true; value: HswCellParameters }
  | { valid: false; issues: ValidationIssue[] }

export type HswCellOffset = [number, number]

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

export function validateHswCellParameters(value: unknown): HswCellValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const candidate = value as Partial<Record<GridParameterKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []
  const grid = HSW_CELL_CONFIGURATION

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
    if (count < 1) {
      issues.push(invalidRange(field, 1, grid.maxGridCount, 'count'))
      continue
    }
    if (count > grid.maxGridCount) {
      issues.push(invalidRange(field, 1, grid.maxGridCount, 'count'))
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: HswCellParameters = {
    rows: candidate.rows as number,
    columns: candidate.columns as number,
  }
  const bounds = boundsForHswCell(parameters)
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[1] - bounds.min[1]

  if (width > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push(invalidRange('columns', 1, grid.maxGridCount, 'count'))
  }
  if (depth > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push(invalidRange('rows', 1, grid.maxGridCount, 'count'))
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function hswCellOffsetFor(
  parameters: HswCellParameters,
  row: number,
  column: number,
): HswCellOffset {
  const grid = HSW_CELL_CONFIGURATION
  const centeringOffsetY = parameters.columns === 1 ? 0 : grid.staggerY / 2
  return [
    (column - (parameters.columns - 1) / 2) * grid.columnPitch,
    (row - (parameters.rows - 1) / 2) * grid.rowPitch +
      (column % 2) * grid.staggerY -
      centeringOffsetY,
  ]
}

export function hswCellOffsetsForGrid(
  parameters: HswCellParameters,
): HswCellOffset[] {
  const offsets: HswCellOffset[] = []
  for (let row = 0; row < parameters.rows; row += 1) {
    for (let column = 0; column < parameters.columns; column += 1) {
      offsets.push(hswCellOffsetFor(parameters, row, column))
    }
  }
  return offsets
}

export function boundsForHswCell(parameters: HswCellParameters): ModelBounds {
  const grid = HSW_CELL_CONFIGURATION
  const width = grid.outerWidth + (parameters.columns - 1) * grid.columnPitch
  const depth =
    grid.outerDepth *
    (parameters.columns === 1 ? parameters.rows : parameters.rows + 0.5)
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [width / 2, depth / 2, grid.outerHeight],
  }
}

export function hswCellFileName(parameters: HswCellParameters): string {
  return `hsw-cell-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function hswCellStlFileName(parameters: HswCellParameters): string {
  return `hsw-cell-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function isHswCellParameters(
  value: unknown,
): value is HswCellParameters {
  return validateHswCellParameters(value).valid
}
