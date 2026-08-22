import {
  HALF_CELL_CONFIGURATION,
  fullGridCenterOffsetX,
  fullGridCenterOffsetY,
  isHalfCellX,
  isHalfCellY,
  openGridAxisSize,
  type HalfCellDirection,
  type HalfCellX,
  type HalfCellY,
} from './half-cell'
import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'

export type OpenGridVariant = 'Full' | 'Lite' | 'Heavy' | 'Hybrid'
export type OpenGridChamferMode = 'none' | 'corners' | 'everywhere'
export type OpenGridScrewKind = 'official-default' | 'custom'
export type OpenGridScrewPreset = 'm3' | 'm4' | 'm5' | 'm6' | 'm7'
export type OpenGridScrewMode =
  'none' | 'corners' | 'everywhere' | 'by-row-column' | 'custom'
export type OpenGridConnectorHoles = 'none' | 'enabled'
export type OpenGridConnectorSide = 'top' | 'right' | 'bottom' | 'left'

export type OpenGridParameterKey =
  | 'variant'
  | 'rows'
  | 'columns'
  | 'halfCellX'
  | 'halfCellY'
  | 'targetWidth'
  | 'targetDepth'
  | 'fitToTarget'
  | 'chamfers'
  | 'chamferCorners'
  | 'connectorHoles'
  | 'connectorSides'
  | 'screwKind'
  | 'screwMode'
  | 'screwCenter'
  | 'screwEvery'
  | 'screwEveryRows'
  | 'screwEveryColumns'
  | 'screwDiameter'
  | 'screwHeadDiameter'
  | 'screwHeadInset'
  | 'screwHeadIsCountersunk'
  | 'screwHeadCountersunkDegree'
  | 'customScrewPositions'

export type OpenGridScrewPosition = {
  /** Zero-based internal seam row, counted from the top of the board. */
  row: number
  /** Zero-based internal seam column, counted from the left of the board. */
  column: number
}

export type OpenGridCornerFlags = {
  topLeft: boolean
  topRight: boolean
  bottomLeft: boolean
  bottomRight: boolean
}

export type OpenGridSideFlags = {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export type OpenGridParameters = {
  variant: OpenGridVariant
  rows: number
  columns: number
  halfCellX: HalfCellX
  halfCellY: HalfCellY
  targetWidth: number
  targetDepth: number
  fitToTarget: boolean
  chamfers: OpenGridChamferMode
  chamferCorners: OpenGridCornerFlags
  connectorHoles: OpenGridConnectorHoles
  connectorSides: OpenGridSideFlags
  screwKind: OpenGridScrewKind
  screwMode: OpenGridScrewMode
  screwCenter: boolean
  screwEvery: number
  screwEveryRows: number
  screwEveryColumns: number
  screwDiameter: number
  screwHeadDiameter: number
  screwHeadInset: number
  screwHeadIsCountersunk: boolean
  screwHeadCountersunkDegree: number
  customScrewPositions: OpenGridScrewPosition[]
}

export type OpenGridScrewDimensions = {
  diameter: number
  headDiameter: number
  headInset: number
  headIsCountersunk: boolean
  headCountersunkDegree: number
}

export type OpenGridBoardConfiguration = {
  width: number
  depth: number
  height: number
}

export type OpenGridPoint2D = [number, number]
export type OpenGridDirection3D = [number, number, number]

export type OpenGridPreviewConfiguration = {
  tolerance: number
  angularTolerance: number
  faceMeshingThreshold: number
}

export type OpenGridConnectorLocation = {
  side: OpenGridConnectorSide
  center: OpenGridPoint2D
  direction: OpenGridDirection3D
}

const DEFAULT_SCREW_DIMENSIONS: OpenGridScrewDimensions = {
  diameter: 4.1,
  headDiameter: 7.2,
  headInset: 1,
  headIsCountersunk: true,
  headCountersunkDegree: 90,
}

const COMMON_WOOD_SCREW_PRESETS: Record<
  OpenGridScrewPreset,
  OpenGridScrewDimensions
> = {
  m3: {
    diameter: 3.2,
    headDiameter: 5.6,
    headInset: 1.65,
    headIsCountersunk: true,
    headCountersunkDegree: 90,
  },
  m4: {
    diameter: 4.2,
    headDiameter: 7.5,
    headInset: 2.2,
    headIsCountersunk: true,
    headCountersunkDegree: 90,
  },
  m5: {
    diameter: 5.2,
    headDiameter: 9.2,
    headInset: 2.5,
    headIsCountersunk: true,
    headCountersunkDegree: 90,
  },
  m6: {
    diameter: 6.2,
    headDiameter: 11,
    headInset: 3,
    headIsCountersunk: true,
    headCountersunkDegree: 90,
  },
  m7: {
    diameter: 7.2,
    headDiameter: 12.5,
    headInset: 3.5,
    headIsCountersunk: true,
    headCountersunkDegree: 90,
  },
}

const DEFAULT_CHAMFER_CORNERS: OpenGridCornerFlags = {
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
}

const DEFAULT_CONNECTOR_SIDES: OpenGridSideFlags = {
  top: true,
  right: true,
  bottom: true,
  left: true,
}

const OPENGRID_WORKSPACE_MAX_DIMENSION = 500
const OPENGRID_BOARD_MAX_GRID_COUNT = 10
const TARGET_FRAME_MAX_SIDE_REMAINDER = HALF_CELL_CONFIGURATION.halfPitch

export const OPENGRID_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  hybridTransitionSpan: OPENGRID_GRID_CONFIGURATION.fullPitch,
  workspaceMaxDimension: OPENGRID_WORKSPACE_MAX_DIMENSION,
  maxGridCount: OPENGRID_BOARD_MAX_GRID_COUNT,
  tileInnerSize: 25,
  outsideExtrusion: 0.8,
  insideGridTopChamfer: 0.4,
  insideGridMiddleChamfer: 1,
  topCaptureInitialInset: 2.4,
  cornerSquareThickness: 2.6,
  intersectionDistance: 4.2,
  heavyGap: 0.2,
  connector: {
    primaryRadius: 2.6,
    dimpleRadius: 2.7,
    separation: 2.5,
    cutoutHeight: 2.4,
    liteCutoutDistanceFromTop: 1,
  },
  balancedFuseBatchSize: 2,
  variants: {
    Full: { thickness: 6.8 },
    Lite: { thickness: 4 },
    Heavy: { thickness: 13.8 },
    Hybrid: { thickness: 13.8 },
  } satisfies Record<OpenGridVariant, { thickness: number }>,
  defaultScrew: DEFAULT_SCREW_DIMENSIONS,
  screwPresets: COMMON_WOOD_SCREW_PRESETS,
  defaultParameters: {
    variant: 'Lite' as OpenGridVariant,
    rows: 2,
    columns: 2,
    halfCellX: 'none' as HalfCellX,
    halfCellY: 'none' as HalfCellY,
    targetWidth: 0,
    targetDepth: 0,
    fitToTarget: false,
    chamfers: 'corners' as OpenGridChamferMode,
    chamferCorners: DEFAULT_CHAMFER_CORNERS,
    connectorHoles: 'enabled' as OpenGridConnectorHoles,
    connectorSides: DEFAULT_CONNECTOR_SIDES,
    screwKind: 'official-default' as OpenGridScrewKind,
    screwMode: 'corners' as OpenGridScrewMode,
    screwCenter: false,
    screwEvery: 0,
    screwEveryRows: 1,
    screwEveryColumns: 2,
    screwDiameter: DEFAULT_SCREW_DIMENSIONS.diameter,
    screwHeadDiameter: DEFAULT_SCREW_DIMENSIONS.headDiameter,
    screwHeadInset: DEFAULT_SCREW_DIMENSIONS.headInset,
    screwHeadIsCountersunk: DEFAULT_SCREW_DIMENSIONS.headIsCountersunk,
    screwHeadCountersunkDegree: DEFAULT_SCREW_DIMENSIONS.headCountersunkDegree,
    customScrewPositions: [] as OpenGridScrewPosition[],
  },
} as const

export const OPENGRID_PREVIEW_CONFIGURATION: OpenGridPreviewConfiguration = {
  tolerance: 0.01,
  angularTolerance: 0.1,
  faceMeshingThreshold: 512,
}

export const OPENGRID_CONNECTOR_SIDES: readonly OpenGridConnectorSide[] = [
  'top',
  'right',
  'bottom',
  'left',
]

const OPEN_GRID_PARAMETER_KEYS: readonly OpenGridParameterKey[] = [
  'variant',
  'rows',
  'columns',
  'halfCellX',
  'halfCellY',
  'targetWidth',
  'targetDepth',
  'fitToTarget',
  'chamfers',
  'chamferCorners',
  'connectorHoles',
  'connectorSides',
  'screwKind',
  'screwMode',
  'screwCenter',
  'screwEvery',
  'screwEveryRows',
  'screwEveryColumns',
  'screwDiameter',
  'screwHeadDiameter',
  'screwHeadInset',
  'screwHeadIsCountersunk',
  'screwHeadCountersunkDegree',
  'customScrewPositions',
]

export type OpenGridValidationIssue = {
  field: OpenGridParameterKey | 'parameters'
  messageId: string
}

export type OpenGridValidation =
  | { valid: true; value: OpenGridParameters }
  | { valid: false; issues: OpenGridValidationIssue[] }

export type OpenGridGenerationSupportValidation = OpenGridValidation

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

function isOpenGridVariant(value: unknown): value is OpenGridVariant {
  return (
    value === 'Full' ||
    value === 'Lite' ||
    value === 'Heavy' ||
    value === 'Hybrid'
  )
}

export function isOpenGridLayeredVariant(variant: OpenGridVariant): boolean {
  return variant === 'Heavy' || variant === 'Hybrid'
}

function isOpenGridChamferMode(value: unknown): value is OpenGridChamferMode {
  return value === 'none' || value === 'corners' || value === 'everywhere'
}

function isOpenGridScrewKind(value: unknown): value is OpenGridScrewKind {
  return value === 'official-default' || value === 'custom'
}

function isOpenGridScrewMode(value: unknown): value is OpenGridScrewMode {
  return (
    value === 'none' ||
    value === 'corners' ||
    value === 'everywhere' ||
    value === 'by-row-column' ||
    value === 'custom'
  )
}

function isOpenGridConnectorHoles(
  value: unknown,
): value is OpenGridConnectorHoles {
  return value === 'none' || value === 'enabled'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBooleanRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, boolean> {
  if (!isRecord(value) || !hasExactKeys(value, keys)) return false
  return keys.every((key) => typeof value[key] === 'boolean')
}

function positionKey(position: OpenGridScrewPosition): string {
  return `${position.row}:${position.column}`
}

function comparePositions(
  first: OpenGridScrewPosition,
  second: OpenGridScrewPosition,
): number {
  if (first.row !== second.row) return first.row - second.row
  return first.column - second.column
}

function validatePosition(
  value: unknown,
  rows: number,
  columns: number,
): value is OpenGridScrewPosition {
  if (!isRecord(value) || !hasExactKeys(value, ['row', 'column'])) {
    return false
  }
  return (
    Number.isSafeInteger(value.row) &&
    (value.row as number) >= 0 &&
    (value.row as number) < Math.max(rows - 1, 0) &&
    Number.isSafeInteger(value.column) &&
    (value.column as number) >= 0 &&
    (value.column as number) < Math.max(columns - 1, 0)
  )
}

function areEqualScrewDimensions(
  value: OpenGridParameters,
  expected: OpenGridScrewDimensions,
): boolean {
  return (
    value.screwDiameter === expected.diameter &&
    value.screwHeadDiameter === expected.headDiameter &&
    value.screwHeadInset === expected.headInset &&
    value.screwHeadIsCountersunk === expected.headIsCountersunk &&
    value.screwHeadCountersunkDegree === expected.headCountersunkDegree
  )
}

export function validateOpenGridParameters(value: unknown): OpenGridValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const issues: OpenGridValidationIssue[] = []
  if (!hasExactKeys(value, OPEN_GRID_PARAMETER_KEYS)) {
    issues.push({
      field: 'parameters',
      messageId: 'validation.invalid',
    })
  }

  if (!isOpenGridVariant(value.variant)) {
    issues.push({
      field: 'variant',
      messageId: 'validation.invalid',
    })
  }

  if (!isHalfCellX(value.halfCellX)) {
    issues.push({
      field: 'halfCellX',
      messageId: 'validation.invalid',
    })
  }
  if (!isHalfCellY(value.halfCellY)) {
    issues.push({
      field: 'halfCellY',
      messageId: 'validation.invalid',
    })
  }

  for (const field of ['targetWidth', 'targetDepth'] as const) {
    const target = value[field]
    if (!isFiniteNumber(target) || target < 0) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (target > OPENGRID_CONFIGURATION.workspaceMaxDimension) {
      issues.push({ field, messageId: 'validation.invalid' })
    }
  }
  if (typeof value.fitToTarget !== 'boolean') {
    issues.push({ field: 'fitToTarget', messageId: 'validation.invalid' })
  }

  for (const field of ['rows', 'columns'] as const) {
    const count = value[field]
    if (!Number.isSafeInteger(count)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (
      (count as number) < 1 ||
      (count as number) > OPENGRID_CONFIGURATION.maxGridCount
    ) {
      issues.push({
        field,
        messageId: 'validation.invalid',
      })
    }
  }

  if (!isOpenGridChamferMode(value.chamfers)) {
    issues.push({ field: 'chamfers', messageId: 'validation.invalid' })
  }
  if (
    !isBooleanRecord(value.chamferCorners, [
      'topLeft',
      'topRight',
      'bottomLeft',
      'bottomRight',
    ])
  ) {
    issues.push({
      field: 'chamferCorners',
      messageId: 'validation.invalid',
    })
  }

  if (!isOpenGridConnectorHoles(value.connectorHoles)) {
    issues.push({ field: 'connectorHoles', messageId: 'validation.invalid' })
  }
  if (
    !isBooleanRecord(value.connectorSides, ['top', 'right', 'bottom', 'left'])
  ) {
    issues.push({
      field: 'connectorSides',
      messageId: 'validation.invalid',
    })
  }

  if (!isOpenGridScrewKind(value.screwKind)) {
    issues.push({ field: 'screwKind', messageId: 'validation.invalid' })
  }
  if (!isOpenGridScrewMode(value.screwMode)) {
    issues.push({ field: 'screwMode', messageId: 'validation.invalid' })
  }

  if (typeof value.screwCenter !== 'boolean') {
    issues.push({
      field: 'screwCenter',
      messageId: 'validation.invalid',
    })
  }

  if (
    !Number.isSafeInteger(value.screwEvery) ||
    (value.screwEvery as number) < 0 ||
    (value.screwEvery as number) > OPENGRID_CONFIGURATION.maxGridCount
  ) {
    issues.push({
      field: 'screwEvery',
      messageId: 'validation.invalid',
    })
  }

  for (const field of ['screwEveryRows', 'screwEveryColumns'] as const) {
    const interval = value[field]
    if (
      !Number.isSafeInteger(interval) ||
      (interval as number) < 1 ||
      (interval as number) > OPENGRID_CONFIGURATION.maxGridCount
    ) {
      issues.push({
        field,
        messageId: 'validation.invalid',
      })
    }
  }

  for (const field of [
    'screwDiameter',
    'screwHeadDiameter',
    'screwHeadInset',
    'screwHeadCountersunkDegree',
  ] as const) {
    if (!isFiniteNumber(value[field])) {
      issues.push({ field, messageId: 'validation.invalid' })
    }
  }
  if (typeof value.screwHeadIsCountersunk !== 'boolean') {
    issues.push({
      field: 'screwHeadIsCountersunk',
      messageId: 'validation.invalid',
    })
  }

  const rowCount = Number.isSafeInteger(value.rows)
    ? (value.rows as number)
    : null
  const columnCount = Number.isSafeInteger(value.columns)
    ? (value.columns as number)
    : null
  const rowsAreValid = rowCount !== null && rowCount >= 1
  const columnsAreValid = columnCount !== null && columnCount >= 1
  const nominalWidth =
    columnsAreValid && isHalfCellX(value.halfCellX)
      ? openGridAxisSize(columnCount as number, value.halfCellX)
      : null
  const nominalDepth =
    rowsAreValid && isHalfCellY(value.halfCellY)
      ? openGridAxisSize(rowCount as number, value.halfCellY)
      : null
  if (
    value.fitToTarget === true &&
    nominalWidth !== null &&
    isFiniteNumber(value.targetWidth) &&
    (value.targetWidth as number) < nominalWidth
  ) {
    issues.push({ field: 'targetWidth', messageId: 'validation.invalid' })
  }
  if (
    value.fitToTarget === true &&
    nominalWidth !== null &&
    isFiniteNumber(value.targetWidth) &&
    (value.targetWidth as number) >
      nominalWidth + TARGET_FRAME_MAX_SIDE_REMAINDER * 2
  ) {
    issues.push({ field: 'targetWidth', messageId: 'validation.invalid' })
  }
  if (
    value.fitToTarget === true &&
    nominalDepth !== null &&
    isFiniteNumber(value.targetDepth) &&
    (value.targetDepth as number) < nominalDepth
  ) {
    issues.push({ field: 'targetDepth', messageId: 'validation.invalid' })
  }
  if (
    value.fitToTarget === true &&
    nominalDepth !== null &&
    isFiniteNumber(value.targetDepth) &&
    (value.targetDepth as number) >
      nominalDepth + TARGET_FRAME_MAX_SIDE_REMAINDER * 2
  ) {
    issues.push({ field: 'targetDepth', messageId: 'validation.invalid' })
  }
  const rowsHaveInternalIntersections = rowCount !== null && rowCount >= 2
  const columnsHaveInternalIntersections =
    columnCount !== null && columnCount >= 2
  if (
    value.screwCenter === true &&
    (!rowsHaveInternalIntersections || !columnsHaveInternalIntersections)
  ) {
    issues.push({
      field: 'screwCenter',
      messageId: 'validation.invalid',
    })
  }
  const screwDiameter = isFiniteNumber(value.screwDiameter)
    ? value.screwDiameter
    : null
  const screwHeadDiameter = isFiniteNumber(value.screwHeadDiameter)
    ? value.screwHeadDiameter
    : null
  const screwHeadInset = isFiniteNumber(value.screwHeadInset)
    ? value.screwHeadInset
    : null
  const screwHeadCountersunkDegree = isFiniteNumber(
    value.screwHeadCountersunkDegree,
  )
    ? value.screwHeadCountersunkDegree
    : null
  const dimensionsAreValid =
    screwDiameter !== null &&
    screwHeadDiameter !== null &&
    screwHeadInset !== null &&
    screwHeadCountersunkDegree !== null

  if (dimensionsAreValid) {
    if (screwDiameter <= 0 || screwDiameter > screwHeadDiameter) {
      issues.push({
        field: 'screwDiameter',
        messageId: 'validation.invalid',
      })
    }
    if (
      screwHeadDiameter <= 0 ||
      screwHeadDiameter > OPENGRID_CONFIGURATION.gridPitch
    ) {
      issues.push({
        field: 'screwHeadDiameter',
        messageId: 'validation.invalid',
      })
    }
    if (screwHeadInset < 0) {
      issues.push({
        field: 'screwHeadInset',
        messageId: 'validation.invalid',
      })
    }
    if (screwHeadCountersunkDegree <= 0 || screwHeadCountersunkDegree >= 180) {
      issues.push({
        field: 'screwHeadCountersunkDegree',
        messageId: 'validation.invalid',
      })
    }
    if (
      isOpenGridVariant(value.variant) &&
      screwHeadInset > OPENGRID_CONFIGURATION.variants[value.variant].thickness
    ) {
      issues.push({
        field: 'screwHeadInset',
        messageId: 'validation.invalid',
      })
    }
  }

  if (value.screwKind === 'official-default' && dimensionsAreValid) {
    const candidate = {
      screwDiameter,
      screwHeadDiameter,
      screwHeadInset,
      screwHeadIsCountersunk: value.screwHeadIsCountersunk,
      screwHeadCountersunkDegree,
    } as OpenGridParameters
    if (!areEqualScrewDimensions(candidate, DEFAULT_SCREW_DIMENSIONS)) {
      issues.push({
        field: 'screwKind',
        messageId: 'validation.invalid',
      })
    }
  }

  const customPositions = value.customScrewPositions
  const positions: OpenGridScrewPosition[] = []
  if (!Array.isArray(customPositions)) {
    issues.push({
      field: 'customScrewPositions',
      messageId: 'validation.invalid',
    })
  } else if (rowsAreValid && columnsAreValid) {
    const seen = new Set<string>()
    for (const position of customPositions) {
      if (
        !validatePosition(
          position,
          value.rows as number,
          value.columns as number,
        )
      ) {
        issues.push({
          field: 'customScrewPositions',
          messageId: 'validation.invalid',
        })
        continue
      }
      const normalizedPosition = {
        row: position.row,
        column: position.column,
      }
      const key = positionKey(normalizedPosition)
      if (seen.has(key)) {
        issues.push({
          field: 'customScrewPositions',
          messageId: 'validation.invalid',
        })
        continue
      }
      seen.add(key)
      positions.push(normalizedPosition)
    }
  }

  if (value.screwMode !== 'custom' && positions.length > 0) {
    issues.push({
      field: 'customScrewPositions',
      messageId: 'validation.invalid',
    })
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      variant: value.variant as OpenGridVariant,
      rows: value.rows as number,
      columns: value.columns as number,
      halfCellX: value.halfCellX as HalfCellX,
      halfCellY: value.halfCellY as HalfCellY,
      targetWidth: value.targetWidth as number,
      targetDepth: value.targetDepth as number,
      fitToTarget: value.fitToTarget as boolean,
      chamfers: value.chamfers as OpenGridChamferMode,
      chamferCorners: { ...(value.chamferCorners as OpenGridCornerFlags) },
      connectorHoles: value.connectorHoles as OpenGridConnectorHoles,
      connectorSides: { ...(value.connectorSides as OpenGridSideFlags) },
      screwKind: value.screwKind as OpenGridScrewKind,
      screwMode: value.screwMode as OpenGridScrewMode,
      screwCenter: value.screwCenter as boolean,
      screwEvery: value.screwEvery as number,
      screwEveryRows: value.screwEveryRows as number,
      screwEveryColumns: value.screwEveryColumns as number,
      screwDiameter: value.screwDiameter as number,
      screwHeadDiameter: value.screwHeadDiameter as number,
      screwHeadInset: value.screwHeadInset as number,
      screwHeadIsCountersunk: value.screwHeadIsCountersunk as boolean,
      screwHeadCountersunkDegree: value.screwHeadCountersunkDegree as number,
      customScrewPositions: positions.sort(comparePositions),
    },
  }
}

export function normalizeOpenGridParameters(
  value: unknown,
): OpenGridParameters {
  const validation = validateOpenGridParameters(value)
  if (!validation.valid) throw new Error('OPENGRID_PARAMETERS_INVALID')
  return validation.value
}

export function isOpenGridParameters(
  value: unknown,
): value is OpenGridParameters {
  return validateOpenGridParameters(value).valid
}

export function validateOpenGridGenerationSupport(
  value: unknown,
): OpenGridGenerationSupportValidation {
  return validateOpenGridParameters(value)
}

export function isOpenGridGenerationSupported(
  parameters: OpenGridParameters,
): boolean {
  return validateOpenGridGenerationSupport(parameters).valid
}

export function openGridBoardConfiguration(
  parameters: Pick<OpenGridParameters, 'variant' | 'rows' | 'columns'> &
    Partial<
      Pick<
        OpenGridParameters,
        | 'halfCellX'
        | 'halfCellY'
        | 'targetWidth'
        | 'targetDepth'
        | 'fitToTarget'
      >
    >,
): OpenGridBoardConfiguration {
  const nominal = openGridNominalBoardConfiguration(parameters)
  const useTarget = parameters.fitToTarget === true
  let width = nominal.width
  let depth = nominal.depth
  if (useTarget && isFiniteNumber(parameters.targetWidth)) {
    if (parameters.targetWidth > 0) width = parameters.targetWidth
  }
  if (useTarget && isFiniteNumber(parameters.targetDepth)) {
    if (parameters.targetDepth > 0) depth = parameters.targetDepth
  }
  return { width, depth, height: nominal.height }
}

export function openGridNominalBoardConfiguration(
  parameters: Pick<OpenGridParameters, 'variant' | 'rows' | 'columns'> &
    Partial<Pick<OpenGridParameters, 'halfCellX' | 'halfCellY'>>,
): OpenGridBoardConfiguration {
  const halfCellX = parameters.halfCellX ?? 'none'
  const halfCellY = parameters.halfCellY ?? 'none'
  return {
    width: openGridAxisSize(parameters.columns, halfCellX),
    depth: openGridAxisSize(parameters.rows, halfCellY),
    height: OPENGRID_CONFIGURATION.variants[parameters.variant].thickness,
  }
}

export function boundsForOpenGrid(
  parameters: Pick<OpenGridParameters, 'variant' | 'rows' | 'columns'> &
    Partial<Pick<OpenGridParameters, 'halfCellX' | 'halfCellY'>>,
) {
  const board = openGridBoardConfiguration(parameters)
  return {
    min: [-board.width / 2, -board.depth / 2, 0] as [number, number, number],
    max: [board.width / 2, board.depth / 2, board.height] as [
      number,
      number,
      number,
    ],
  }
}

export function cellCenterForOpenGrid(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'> &
    Partial<Pick<OpenGridParameters, 'halfCellX' | 'halfCellY'>>,
  row: number,
  column: number,
): OpenGridPoint2D {
  const halfCellX = parameters.halfCellX ?? 'none'
  const halfCellY = parameters.halfCellY ?? 'none'
  return [
    (column - (parameters.columns - 1) / 2) * OPENGRID_CONFIGURATION.gridPitch +
      fullGridCenterOffsetX(halfCellX),
    ((parameters.rows - 1) / 2 - row) * OPENGRID_CONFIGURATION.gridPitch +
      fullGridCenterOffsetY(halfCellY),
  ]
}

export function openGridScrewLatticeDimensions(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'>,
): { rows: number; columns: number } {
  return {
    rows: Math.max(parameters.rows - 1, 0),
    columns: Math.max(parameters.columns - 1, 0),
  }
}

export function screwCenterForOpenGrid(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'> &
    Partial<Pick<OpenGridParameters, 'halfCellX' | 'halfCellY'>>,
  position: OpenGridScrewPosition,
): OpenGridPoint2D {
  const halfCellX = parameters.halfCellX ?? 'none'
  const halfCellY = parameters.halfCellY ?? 'none'
  return [
    (position.column - (parameters.columns - 2) / 2) *
      OPENGRID_CONFIGURATION.gridPitch +
      fullGridCenterOffsetX(halfCellX),
    ((parameters.rows - 2) / 2 - position.row) *
      OPENGRID_CONFIGURATION.gridPitch +
      fullGridCenterOffsetY(halfCellY),
  ]
}

export function deterministicOpenGridCustomScrewPositions(
  rows: number,
  columns: number,
): OpenGridScrewPosition[] {
  if (
    !Number.isSafeInteger(rows) ||
    !Number.isSafeInteger(columns) ||
    rows < 1 ||
    columns < 1 ||
    rows > OPENGRID_CONFIGURATION.maxGridCount ||
    columns > OPENGRID_CONFIGURATION.maxGridCount
  ) {
    throw new Error('OPENGRID_INVALID_GRID')
  }
  const positions: OpenGridScrewPosition[] = []
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      if ((row * 3 + column * 5) % 4 === 0) {
        positions.push({ row, column })
      }
    }
  }
  return positions
}

function allInternalScrewPositions(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'>,
): OpenGridScrewPosition[] {
  const lattice = openGridScrewLatticeDimensions(parameters)
  const positions: OpenGridScrewPosition[] = []
  for (let row = 0; row < lattice.rows; row += 1) {
    for (let column = 0; column < lattice.columns; column += 1) {
      positions.push({ row, column })
    }
  }
  return positions
}

function centeredScrewPosition(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'>,
): OpenGridScrewPosition | null {
  const lattice = openGridScrewLatticeDimensions(parameters)
  if (lattice.rows < 1 || lattice.columns < 1) return null
  return {
    row: Math.floor((lattice.rows - 1) / 2),
    column: Math.floor((lattice.columns - 1) / 2),
  }
}

function addUniquePosition(
  positions: OpenGridScrewPosition[],
  seen: Set<string>,
  position: OpenGridScrewPosition,
): void {
  const key = positionKey(position)
  if (seen.has(key)) return
  seen.add(key)
  positions.push(position)
}

function positionsByRowAndColumn(
  parameters: Pick<
    OpenGridParameters,
    'rows' | 'columns' | 'screwEveryRows' | 'screwEveryColumns'
  >,
): OpenGridScrewPosition[] {
  const lattice = openGridScrewLatticeDimensions(parameters)
  if (lattice.rows === 0 || lattice.columns === 0) return []

  const rowInterval = Math.max(1, parameters.screwEveryRows)
  const columnInterval = Math.max(1, parameters.screwEveryColumns)

  // BOSL2's grid_copies(size=[(count-1)*pitch], spacing=interval*pitch)
  // centers the copy list first and then applies the source's half-pitch
  // parity translation. Convert those world positions back to our stable
  // top-to-bottom/left-to-right internal-intersection indices.
  function axisIndices(
    intersectionCount: number,
    interval: number,
    direction: 'row' | 'column',
  ): number[] {
    const span = intersectionCount - 1
    const copyCount = Math.floor(span / interval) + 1
    const centeredOffset = ((copyCount - 1) * interval) / 2
    const halfPitchTranslation =
      span % interval === 0 ? 0 : direction === 'column' ? -0.5 : 0.5
    const indices: number[] = []
    for (let copy = 0; copy < copyCount; copy += 1) {
      const coordinate =
        -centeredOffset + copy * interval + halfPitchTranslation
      const index =
        direction === 'column' ? coordinate + span / 2 : span / 2 - coordinate
      if (Number.isSafeInteger(index)) indices.push(index)
    }
    return indices.sort((first, second) => first - second)
  }

  const rows = axisIndices(lattice.rows, rowInterval, 'row')
  const columns = axisIndices(lattice.columns, columnInterval, 'column')
  return rows.flatMap((row) => columns.map((column) => ({ row, column })))
}

function positionsByUniformInterval(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns' | 'screwEvery'>,
): OpenGridScrewPosition[] {
  return positionsByRowAndColumn({
    rows: parameters.rows,
    columns: parameters.columns,
    screwEveryRows: parameters.screwEvery,
    screwEveryColumns: parameters.screwEvery,
  })
}

function baseScrewPositionsFor(
  parameters: OpenGridParameters,
): OpenGridScrewPosition[] {
  if (parameters.screwMode === 'none') return []
  if (parameters.screwMode === 'custom') {
    return parameters.customScrewPositions.map((position) => ({ ...position }))
  }
  if (parameters.screwMode === 'everywhere') {
    return allInternalScrewPositions(parameters)
  }
  if (parameters.screwMode === 'by-row-column') {
    return positionsByRowAndColumn(parameters)
  }

  const lattice = openGridScrewLatticeDimensions(parameters)
  const positions: OpenGridScrewPosition[] = []
  const seen = new Set<string>()
  const cornerRows = lattice.rows === 0 ? [] : [0, lattice.rows - 1]
  const cornerColumns = lattice.columns === 0 ? [] : [0, lattice.columns - 1]
  for (const row of cornerRows) {
    for (const column of cornerColumns) {
      addUniquePosition(positions, seen, { row, column })
    }
  }
  return positions.sort(comparePositions)
}

export function openGridScrewPositionsFor(
  parameters: OpenGridParameters,
): OpenGridScrewPosition[] {
  const positions: OpenGridScrewPosition[] = []
  const seen = new Set<string>()
  for (const position of baseScrewPositionsFor(parameters)) {
    addUniquePosition(positions, seen, position)
  }

  if (parameters.screwCenter) {
    const center = centeredScrewPosition(parameters)
    if (center) addUniquePosition(positions, seen, center)
  }

  if (parameters.screwEvery > 0) {
    for (const position of positionsByUniformInterval(parameters)) {
      addUniquePosition(positions, seen, position)
    }
  }

  return positions.sort(comparePositions)
}

export function openGridScrewCentersFor(
  parameters: OpenGridParameters,
): OpenGridPoint2D[] {
  const centers: OpenGridPoint2D[] = []
  const seen = new Set<string>()

  const addCenter = (center: OpenGridPoint2D): void => {
    const key = `${center[0]}:${center[1]}`
    if (seen.has(key)) return
    seen.add(key)
    centers.push(center)
  }

  if (parameters.screwMode === 'corners') {
    const fullGridWidth = parameters.columns * OPENGRID_CONFIGURATION.gridPitch
    const fullGridDepth = parameters.rows * OPENGRID_CONFIGURATION.gridPitch
    const centerOffsetX = fullGridCenterOffsetX(parameters.halfCellX ?? 'none')
    const centerOffsetY = fullGridCenterOffsetY(parameters.halfCellY ?? 'none')
    const xCandidates = cornerScrewAxisCoordinates(
      fullGridWidth,
      parameters.halfCellX ?? 'none',
      centerOffsetX,
    )
    const yCandidates = cornerScrewAxisCoordinates(
      fullGridDepth,
      parameters.halfCellY ?? 'none',
      centerOffsetY,
    )
    for (const x of xCandidates) {
      for (const y of yCandidates) addCenter([x, y])
    }
  } else {
    for (const position of openGridScrewPositionsFor(parameters)) {
      addCenter(screwCenterForOpenGrid(parameters, position))
    }
    addHalfCellBoundaryScrewCenters(parameters, centers, addCenter)
    return centers
  }

  if (parameters.screwCenter) {
    const center = centeredScrewPosition(parameters)
    if (center) addCenter(screwCenterForOpenGrid(parameters, center))
  }
  if (parameters.screwEvery > 0) {
    for (const position of positionsByUniformInterval(parameters)) {
      addCenter(screwCenterForOpenGrid(parameters, position))
    }
  }

  addHalfCellBoundaryScrewCenters(parameters, centers, addCenter)
  return centers
}

function cornerScrewAxisCoordinates(
  fullGridSize: number,
  halfDirection: HalfCellDirection,
  centerOffset: number,
): number[] {
  const halfBoundary = halfCellBoundaryCoordinate(
    fullGridSize,
    halfDirection,
    centerOffset,
  )
  if (halfBoundary !== null) {
    const farFullCellCorner = farFullCellCornerCoordinate(
      fullGridSize,
      halfDirection,
      centerOffset,
    )
    return [...new Set([halfBoundary, farFullCellCorner])].sort(
      (first, second) => first - second,
    )
  }

  return [
    -fullGridSize / 2 + OPENGRID_CONFIGURATION.gridPitch + centerOffset,
    fullGridSize / 2 - OPENGRID_CONFIGURATION.gridPitch + centerOffset,
  ]
}

function farFullCellCornerCoordinate(
  fullGridSize: number,
  halfDirection: HalfCellDirection,
  centerOffset: number,
): number {
  if (halfDirection === 'left' || halfDirection === 'bottom') {
    return fullGridSize / 2 - OPENGRID_CONFIGURATION.gridPitch + centerOffset
  }
  return -fullGridSize / 2 + OPENGRID_CONFIGURATION.gridPitch + centerOffset
}

function halfCellBoundaryCoordinate(
  fullGridSize: number,
  halfDirection: HalfCellDirection,
  centerOffset: number,
): number | null {
  if (halfDirection === 'left' || halfDirection === 'bottom') {
    return -fullGridSize / 2 + centerOffset
  }
  if (halfDirection === 'right' || halfDirection === 'top') {
    return fullGridSize / 2 + centerOffset
  }
  return null
}

function addHalfCellBoundaryScrewCenters(
  parameters: OpenGridParameters,
  centers: readonly OpenGridPoint2D[],
  addCenter: (center: OpenGridPoint2D) => void,
): void {
  if (
    parameters.screwMode === 'custom' ||
    centers.length === 0 ||
    ((parameters.halfCellX ?? 'none') === 'none' &&
      (parameters.halfCellY ?? 'none') === 'none')
  ) {
    return
  }

  const xCoordinates = [...new Set(centers.map(([x]) => x))]
  const yCoordinates = [...new Set(centers.map(([, y]) => y))]
  const halfBoundaryX = halfCellBoundaryCoordinate(
    parameters.columns * OPENGRID_CONFIGURATION.gridPitch,
    parameters.halfCellX ?? 'none',
    fullGridCenterOffsetX(parameters.halfCellX ?? 'none'),
  )
  if (halfBoundaryX !== null) {
    xCoordinates.push(halfBoundaryX)
  }
  const halfBoundaryY = halfCellBoundaryCoordinate(
    parameters.rows * OPENGRID_CONFIGURATION.gridPitch,
    parameters.halfCellY ?? 'none',
    fullGridCenterOffsetY(parameters.halfCellY ?? 'none'),
  )
  if (halfBoundaryY !== null) {
    yCoordinates.push(halfBoundaryY)
  }

  for (const x of xCoordinates) {
    for (const y of yCoordinates) addCenter([x, y])
  }
}

function seamCoordinates(count: number, centerOffset = 0): number[] {
  const positions: number[] = []
  for (let index = 0; index < Math.max(count - 1, 0); index += 1) {
    positions.push(
      (index - (count - 2) / 2) * OPENGRID_CONFIGURATION.gridPitch +
        centerOffset,
    )
  }
  return positions
}

function seamCoordinatesWithHalfBoundary(
  count: number,
  centerOffset: number,
  halfDirection: 'none' | 'left' | 'right' | 'top' | 'bottom',
  fullMin: number,
  fullMax: number,
): number[] {
  const positions = seamCoordinates(count, centerOffset)
  if (halfDirection === 'left' || halfDirection === 'bottom') {
    positions.push(fullMin)
  } else if (halfDirection === 'right' || halfDirection === 'top') {
    positions.push(fullMax)
  }
  return [...new Set(positions)].sort((first, second) => first - second)
}

export function openGridConnectorLocationsFor(
  parameters: Pick<
    OpenGridParameters,
    'rows' | 'columns' | 'connectorHoles' | 'connectorSides'
  > &
    Partial<Pick<OpenGridParameters, 'halfCellX' | 'halfCellY'>>,
): OpenGridConnectorLocation[] {
  if (parameters.connectorHoles === 'none') return []
  const halfCellX = parameters.halfCellX ?? 'none'
  const halfCellY = parameters.halfCellY ?? 'none'
  const fullGridWidth = parameters.columns * OPENGRID_CONFIGURATION.gridPitch
  const fullGridDepth = parameters.rows * OPENGRID_CONFIGURATION.gridPitch
  const fullGridMinX =
    -fullGridWidth / 2 + fullGridCenterOffsetX(parameters.halfCellX ?? 'none')
  const fullGridMaxX =
    fullGridWidth / 2 + fullGridCenterOffsetX(parameters.halfCellX ?? 'none')
  const fullGridMinY =
    -fullGridDepth / 2 + fullGridCenterOffsetY(parameters.halfCellY ?? 'none')
  const fullGridMaxY =
    fullGridDepth / 2 + fullGridCenterOffsetY(parameters.halfCellY ?? 'none')
  const locations: OpenGridConnectorLocation[] = []
  const boardWidth = openGridAxisSize(parameters.columns, halfCellX)
  const boardDepth = openGridAxisSize(parameters.rows, halfCellY)
  const addSide = (
    side: OpenGridConnectorSide,
    center: OpenGridPoint2D,
    direction: OpenGridDirection3D,
  ) => {
    locations.push({ side, center, direction })
  }

  const topY = halfCellY === 'top' ? boardDepth / 2 : fullGridMaxY
  const rightX = halfCellX === 'right' ? boardWidth / 2 : fullGridMaxX
  const bottomY = halfCellY === 'bottom' ? -boardDepth / 2 : fullGridMinY
  const leftX = halfCellX === 'left' ? -boardWidth / 2 : fullGridMinX

  if (parameters.connectorSides.top) {
    for (const x of seamCoordinatesWithHalfBoundary(
      parameters.columns,
      fullGridCenterOffsetX(parameters.halfCellX ?? 'none'),
      halfCellX,
      fullGridMinX,
      fullGridMaxX,
    )) {
      addSide('top', [x, topY], [0, -1, 0])
    }
  }
  if (parameters.connectorSides.right) {
    for (const y of seamCoordinatesWithHalfBoundary(
      parameters.rows,
      fullGridCenterOffsetY(parameters.halfCellY ?? 'none'),
      halfCellY,
      fullGridMinY,
      fullGridMaxY,
    )) {
      addSide('right', [rightX, y], [-1, 0, 0])
    }
  }
  if (parameters.connectorSides.bottom) {
    for (const x of seamCoordinatesWithHalfBoundary(
      parameters.columns,
      fullGridCenterOffsetX(parameters.halfCellX ?? 'none'),
      halfCellX,
      fullGridMinX,
      fullGridMaxX,
    )) {
      addSide('bottom', [x, bottomY], [0, 1, 0])
    }
  }
  if (parameters.connectorSides.left) {
    for (const y of seamCoordinatesWithHalfBoundary(
      parameters.rows,
      fullGridCenterOffsetY(parameters.halfCellY ?? 'none'),
      halfCellY,
      fullGridMinY,
      fullGridMaxY,
    )) {
      addSide('left', [leftX, y], [1, 0, 0])
    }
  }
  return locations
}

function fnv1a(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function openGridCustomPositionFingerprint(
  parameters: Pick<OpenGridParameters, 'screwMode' | 'customScrewPositions'>,
): string {
  if (parameters.screwMode !== 'custom') return 'none'
  return fnv1a(parameters.customScrewPositions.map(positionKey).join('|'))
}

function openGridScrewPatternFingerprint(
  parameters: OpenGridParameters,
): string {
  const customFingerprint = openGridCustomPositionFingerprint(parameters)
  if (!parameters.screwCenter && parameters.screwEvery === 0) {
    return customFingerprint
  }
  return fnv1a(
    `${customFingerprint}|center=${parameters.screwCenter}|every=${parameters.screwEvery}`,
  )
}

function buildOpenGridFileName(
  parameters: OpenGridParameters,
  extension: '.step' | '.stl',
): string {
  const hasScrewPatternModifiers =
    parameters.screwMode === 'custom' ||
    parameters.screwCenter ||
    parameters.screwEvery > 0
  const fingerprint = hasScrewPatternModifiers
    ? `-${openGridScrewPatternFingerprint(parameters)}`
    : ''
  const targetSuffix = parameters.fitToTarget
    ? `-fit-${Number(parameters.targetWidth.toFixed(2))}x${Number(parameters.targetDepth.toFixed(2))}`
    : ''
  return `opengrid-${parameters.variant.toLowerCase()}-${parameters.columns}x${parameters.rows}-x${parameters.halfCellX}-y${parameters.halfCellY}-${parameters.screwKind}-${parameters.screwMode}-${parameters.chamfers}-${parameters.connectorHoles}${targetSuffix}${fingerprint}${extension}`
}

export function openGridFileName(parameters: OpenGridParameters): string {
  return buildOpenGridFileName(parameters, '.step')
}

export function openGridStlFileName(parameters: OpenGridParameters): string {
  return buildOpenGridFileName(parameters, '.stl')
}
