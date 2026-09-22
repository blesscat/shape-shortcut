import {
  OPENCONNECT_ALIGNMENT_KEYS,
  OPENCONNECT_ALIGNMENT_DEFAULTS,
  openConnectAlignmentIssues,
  normalizedOpenConnectAlignment,
  openConnectGridOffsets,
  type OpenConnectAlignmentKey,
  type OpenConnectAlignmentParameters,
} from './openconnect-alignment'
import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'

export type OpenGridOpenConnectShelfParameterKey =
  OpenConnectAlignmentKey | 'columns' | 'rows' | 'connectorRows' | 'angle'

export type OpenGridOpenConnectShelfParameters =
  OpenConnectAlignmentParameters & {
    columns: number
    rows: number
    connectorRows: number
    angle: number
  }

export type OpenGridOpenConnectShelfPoint3D = [number, number, number]

export type OpenGridOpenConnectShelfValidationIssue = {
  field: OpenGridOpenConnectShelfParameterKey | 'parameters'
  messageId: string
  params?: Readonly<Record<string, string | number | boolean>>
}

export type OpenGridOpenConnectShelfValidation =
  | { valid: true; value: OpenGridOpenConnectShelfParameters }
  | { valid: false; issues: OpenGridOpenConnectShelfValidationIssue[] }

export const OPENGRID_OPENCONNECT_SHELF_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  fullThickness: 6.8,
  rearThickness: 3.2,
  supportThickness: 2,
  minimumFrontHeight: 7,
  minGridCount: 1,
  maxGridCount: 10,
  minAngle: 1,
  angleStep: 0.5,
  defaultColumns: 3,
  defaultRows: 3,
  defaultConnectorRows: 1,
  defaultAngle: 14,
} as const

export const OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS = {
  ...OPENCONNECT_ALIGNMENT_DEFAULTS,
  columns: OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.defaultColumns,
  rows: OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.defaultRows,
  connectorRows: OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.defaultConnectorRows,
  angle: OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.defaultAngle,
} as const satisfies OpenGridOpenConnectShelfParameters

const PARAMETER_KEYS: readonly OpenGridOpenConnectShelfParameterKey[] = [
  'columns',
  'rows',
  'connectorRows',
  'angle',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>): boolean {
  return (
    Object.keys(value).every((key) =>
      [...PARAMETER_KEYS, ...OPENCONNECT_ALIGNMENT_KEYS].includes(
        key as OpenGridOpenConnectShelfParameterKey,
      ),
    ) &&
    PARAMETER_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    )
  )
}

function isSafeIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  )
}

function isFiniteNumberAtStepInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  step: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum &&
    Number.isSafeInteger((value - minimum) / step)
  )
}

export function openGridOpenConnectShelfMaximumAngleForRows(
  rows: number,
  connectorRows: number = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.defaultConnectorRows,
): number {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const depth = rows * configuration.gridPitch
  const rearHeight = openGridOpenConnectShelfRearHeightFor({ connectorRows })
  const maximumRise = rearHeight - configuration.minimumFrontHeight
  return Math.floor((Math.atan(maximumRise / depth) * 180) / Math.PI)
}

export function openGridOpenConnectShelfAngleRadiansFor(angle: number): number {
  return (angle * Math.PI) / 180
}

export function openGridOpenConnectShelfWidthFor(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'columns'>,
): number {
  return parameters.columns * OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.gridPitch
}

export function openGridOpenConnectShelfDepthFor(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'rows'>,
): number {
  return parameters.rows * OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.gridPitch
}

export function openGridOpenConnectShelfRearHeightFor(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'connectorRows'>,
): number {
  return (
    parameters.connectorRows *
    OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.gridPitch
  )
}

export function openGridOpenConnectShelfFrontHeightFor(
  parameters: Pick<
    OpenGridOpenConnectShelfParameters,
    'rows' | 'connectorRows' | 'angle'
  >,
): number {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  const rearHeight = openGridOpenConnectShelfRearHeightFor(parameters)
  const rise =
    depth * Math.tan(openGridOpenConnectShelfAngleRadiansFor(parameters.angle))
  return rearHeight - rise
}

export function openGridOpenConnectShelfSlotOriginsFor(
  parameters: Pick<
    OpenGridOpenConnectShelfParameters,
    'columns' | 'connectorRows'
  > &
    OpenConnectAlignmentParameters,
): OpenGridOpenConnectShelfPoint3D[] {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const offset = openConnectGridOffsets(
    parameters.columns * configuration.gridPitch,
    parameters.connectorRows * configuration.gridPitch,
    parameters.columns,
    parameters.connectorRows,
    configuration.gridPitch,
    parameters,
  )
  return Array.from({ length: parameters.connectorRows }, (_, connectorRow) =>
    Array.from(
      { length: parameters.columns },
      (_, column) =>
        [
          offset.x + (column + 0.5) * configuration.gridPitch,
          configuration.rearThickness,
          offset.z + (connectorRow + 0.5) * configuration.gridPitch,
        ] as OpenGridOpenConnectShelfPoint3D,
    ),
  ).flat()
}

export function openGridOpenConnectShelfInstalledBoundsFor(
  parameters: Pick<
    OpenGridOpenConnectShelfParameters,
    'columns' | 'rows' | 'connectorRows'
  >,
) {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const width = openGridOpenConnectShelfWidthFor(parameters)
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  const rearHeight = openGridOpenConnectShelfRearHeightFor(parameters)
  return {
    min: [-width / 2, -depth, 0] as OpenGridOpenConnectShelfPoint3D,
    max: [
      width / 2,
      configuration.rearThickness,
      rearHeight,
    ] as OpenGridOpenConnectShelfPoint3D,
  }
}

export function boundsForOpenGridOpenConnectShelf(
  parameters: OpenGridOpenConnectShelfParameters,
) {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const width = openGridOpenConnectShelfWidthFor(parameters)
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  const rearHeight = openGridOpenConnectShelfRearHeightFor(parameters)
  const radians = openGridOpenConnectShelfAngleRadiansFor(parameters.angle)
  return {
    min: [
      -width / 2,
      -(depth * Math.cos(radians) + rearHeight * Math.sin(radians)),
      0,
    ] as OpenGridOpenConnectShelfPoint3D,
    max: [
      width / 2,
      configuration.rearThickness * Math.cos(radians),
      rearHeight * Math.cos(radians) +
        configuration.rearThickness * Math.sin(radians),
    ] as OpenGridOpenConnectShelfPoint3D,
  }
}

function invalidRangeIssue(
  field: OpenGridOpenConnectShelfParameterKey,
  minimum: number,
  maximum: number,
  unit: 'count' | 'degree',
): OpenGridOpenConnectShelfValidationIssue {
  return {
    field,
    messageId: 'validation.invalid',
    params: { min: minimum, max: maximum, unit },
  }
}

export function validateOpenGridOpenConnectShelfParameters(
  value: unknown,
): OpenGridOpenConnectShelfValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const issues: OpenGridOpenConnectShelfValidationIssue[] =
    openConnectAlignmentIssues(value)
  if (!hasExactKeys(value)) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  const columnsValid = isSafeIntegerInRange(
    value.columns,
    configuration.minGridCount,
    configuration.maxGridCount,
  )
  if (!columnsValid) {
    issues.push(
      invalidRangeIssue(
        'columns',
        configuration.minGridCount,
        configuration.maxGridCount,
        'count',
      ),
    )
  }

  const rows = value.rows
  const rowsValid = isSafeIntegerInRange(
    rows,
    configuration.minGridCount,
    configuration.maxGridCount,
  )
  if (!rowsValid) {
    issues.push(
      invalidRangeIssue(
        'rows',
        configuration.minGridCount,
        configuration.maxGridCount,
        'count',
      ),
    )
  }

  const connectorRows = value.connectorRows
  const connectorRowsValid = isSafeIntegerInRange(
    connectorRows,
    configuration.minGridCount,
    configuration.maxGridCount,
  )
  if (!connectorRowsValid) {
    issues.push(
      invalidRangeIssue(
        'connectorRows',
        configuration.minGridCount,
        configuration.maxGridCount,
        'count',
      ),
    )
  }

  const maximumAngle = openGridOpenConnectShelfMaximumAngleForRows(
    rowsValid ? rows : configuration.defaultRows,
    connectorRowsValid ? connectorRows : configuration.defaultConnectorRows,
  )
  if (
    !isFiniteNumberAtStepInRange(
      value.angle,
      configuration.minAngle,
      maximumAngle,
      configuration.angleStep,
    )
  ) {
    issues.push(
      invalidRangeIssue(
        'angle',
        configuration.minAngle,
        maximumAngle,
        'degree',
      ),
    )
  }

  if (issues.length > 0) return { valid: false, issues }
  return {
    valid: true,
    value: {
      ...normalizedOpenConnectAlignment(
        value as OpenConnectAlignmentParameters,
      ),
      columns: value.columns as number,
      rows: value.rows as number,
      connectorRows: value.connectorRows as number,
      angle: value.angle as number,
    },
  }
}

export function isOpenGridOpenConnectShelfParameters(
  value: unknown,
): value is OpenGridOpenConnectShelfParameters {
  return validateOpenGridOpenConnectShelfParameters(value).valid
}

export function openGridOpenConnectShelfFileName(
  parameters: OpenGridOpenConnectShelfParameters,
): string {
  return `opengrid-openconnect-shelf-c${parameters.columns}-r${parameters.rows}-z${parameters.connectorRows}-a${parameters.angle}.step`
}

export function openGridOpenConnectShelfStlFileName(
  parameters: OpenGridOpenConnectShelfParameters,
): string {
  return openGridOpenConnectShelfFileName(parameters).replace(/\.step$/, '.stl')
}
