import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from './opengrid-locating-assembly'

export type OpenGridOpenShelfParameterKey =
  'x' | 'y' | 'height' | 'cellX' | 'cellZ' | 'angle' | 'honeycombMode'

export type OpenGridOpenShelfParameters = {
  x: number
  y: number
  height: number
  cellX: number
  cellZ: number
  angle: number
  honeycombMode: boolean
}

export type OpenGridOpenShelfPoint2D = [number, number]

export type OpenGridOpenShelfCellClearHeights = {
  wedge: {
    front: number
    rear: number
  }
  regular: {
    front: number
    rear: number
  }
}

export type OpenGridOpenShelfCellSpace = {
  width: number
  depth: number
  wedge: OpenGridOpenShelfCellClearHeights['wedge']
  regular: OpenGridOpenShelfCellClearHeights['regular']
}

export type OpenGridOpenShelfValidationIssue = {
  field: OpenGridOpenShelfParameterKey | 'parameters'
  messageId: string
}

export type OpenGridOpenShelfValidation =
  | { valid: true; value: OpenGridOpenShelfParameters }
  | { valid: false; issues: OpenGridOpenShelfValidationIssue[] }

export const OPENGRID_OPEN_SHELF_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  gridStep: 0.5,
  workspaceMaxDimension: 500,
  defaultX: 4,
  defaultY: 3,
  defaultHeight: 50,
  defaultCellX: 1,
  defaultCellZ: 2,
  defaultAngle: 15,
  defaultHoneycombMode: false,
  minX: 0.5,
  maxX: 10,
  minY: 0.5,
  maxY: 10,
  minHeight: 10,
  maxHeight: 500,
  heightSliderMax: 200,
  minCellX: 1,
  maxCellX: 10,
  minCellZ: 1,
  maxCellZ: 10,
  minAngle: 0,
  maxAngle: 75,
  bottomThickness: 2,
  innerPlateThickness: 1.2,
  outerWallThickness: 1.6,
  outerCornerRadius: 3.75,
  topOuterEdgeRadius: 0.6,
  backboardThickness: 1.2,
  pegDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter,
  pegHeight: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight,
  pegInset: 7,
  pegOverlap: 0.02,
  minimumClearCellHeight: 0.5,
} as const

// Conservative shelf-specific admission ceiling; the per-cell cutter path
// has a different memory profile from the stackable-box panel builder.
export const OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS = 3000

export const OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS = {
  x: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultX,
  y: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultY,
  height: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultHeight,
  cellX: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultCellX,
  cellZ: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultCellZ,
  angle: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultAngle,
  honeycombMode: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultHoneycombMode,
} as const satisfies OpenGridOpenShelfParameters

const OPENGRID_OPEN_SHELF_LEGACY_PARAMETER_KEYS: readonly OpenGridOpenShelfParameterKey[] =
  ['x', 'y', 'height', 'cellX', 'cellZ', 'angle']
const OPENGRID_OPEN_SHELF_PARAMETER_KEYS: readonly OpenGridOpenShelfParameterKey[] =
  [...OPENGRID_OPEN_SHELF_LEGACY_PARAMETER_KEYS, 'honeycombMode']

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

function isHalfStep(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value * 2)
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

export function openGridOpenShelfFootprintFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'x' | 'y'>,
): [number, number] {
  const { gridPitch } = OPENGRID_OPEN_SHELF_CONFIGURATION
  return [
    parameters.x * gridPitch - 0.15,
    openGridOpenShelfDepthFor(parameters),
  ]
}

export function openGridOpenShelfDepthFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'y'>,
): number {
  return parameters.y * OPENGRID_OPEN_SHELF_CONFIGURATION.gridPitch - 0.15
}

export function openGridOpenShelfCellClearWidthFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'x' | 'cellX'>,
): number {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const width = parameters.x * configuration.gridPitch - 0.15
  const dividerCount = Math.max(0, parameters.cellX - 1)
  return (
    (width -
      2 * configuration.outerWallThickness -
      dividerCount * configuration.innerPlateThickness) /
    parameters.cellX
  )
}

export function openGridOpenShelfAngleRadiansFor(angle: number): number {
  return (angle * Math.PI) / 180
}

export function openGridOpenShelfFrontToRearElevationFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'y' | 'angle'>,
): number {
  const depth = openGridOpenShelfDepthFor(parameters)
  return depth * Math.tan(openGridOpenShelfAngleRadiansFor(parameters.angle))
}

export function openGridOpenShelfTopOuterRearZFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'height' | 'y' | 'angle'>,
): number {
  return (
    parameters.height - openGridOpenShelfFrontToRearElevationFor(parameters)
  )
}

function verticalThicknessFor(thickness: number, angle: number): number {
  return thickness * Math.cos(openGridOpenShelfAngleRadiansFor(angle))
}

export function openGridOpenShelfTopInnerFrontZFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'height' | 'angle'>,
): number {
  return (
    parameters.height -
    verticalThicknessFor(
      OPENGRID_OPEN_SHELF_CONFIGURATION.outerWallThickness,
      parameters.angle,
    )
  )
}

export function openGridOpenShelfTopInnerRearZFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'height' | 'y' | 'angle'>,
): number {
  return (
    openGridOpenShelfTopOuterRearZFor(parameters) -
    verticalThicknessFor(
      OPENGRID_OPEN_SHELF_CONFIGURATION.outerWallThickness,
      parameters.angle,
    )
  )
}

export function openGridOpenShelfClearCellHeightsFor(
  parameters: OpenGridOpenShelfParameters,
): OpenGridOpenShelfCellClearHeights {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const shelfVerticalThickness = verticalThicknessFor(
    configuration.innerPlateThickness,
    parameters.angle,
  )
  const hasBottomWedge = parameters.angle > 0
  const shelfCount = hasBottomWedge
    ? parameters.cellZ
    : Math.max(0, parameters.cellZ - 1)
  const rearAvailable =
    openGridOpenShelfTopInnerRearZFor(parameters) -
    configuration.bottomThickness -
    shelfCount * shelfVerticalThickness
  const regularCellHeight = rearAvailable / parameters.cellZ
  const elevation = openGridOpenShelfFrontToRearElevationFor(parameters)
  return {
    wedge: {
      front: hasBottomWedge ? elevation : 0,
      rear: 0,
    },
    regular: {
      front: regularCellHeight,
      rear: regularCellHeight,
    },
  }
}

export function openGridOpenShelfCellSpaceFor(
  parameters: OpenGridOpenShelfParameters,
): OpenGridOpenShelfCellSpace {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const clearHeights = openGridOpenShelfClearCellHeightsFor(parameters)
  return {
    width: openGridOpenShelfCellClearWidthFor(parameters),
    depth:
      openGridOpenShelfDepthFor(parameters) - configuration.backboardThickness,
    wedge: clearHeights.wedge,
    regular: clearHeights.regular,
  }
}

export function openGridOpenShelfShelfLowerSurfaceZFor(
  parameters: OpenGridOpenShelfParameters,
  shelfIndex: number,
): [number, number] {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const clearHeights = openGridOpenShelfClearCellHeightsFor(parameters)
  const shelfVerticalThickness = verticalThicknessFor(
    configuration.innerPlateThickness,
    parameters.angle,
  )
  const elevation = openGridOpenShelfFrontToRearElevationFor(parameters)
  const priorShelves = Math.max(0, shelfIndex - 1)
  const firstShelfLowerRearZ =
    configuration.bottomThickness +
    (parameters.angle > 0 ? 0 : clearHeights.regular.rear)
  const lowerRearZ =
    firstShelfLowerRearZ +
    priorShelves * (clearHeights.regular.rear + shelfVerticalThickness)
  return [lowerRearZ + elevation, lowerRearZ]
}

export function openGridOpenShelfPegCentersFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'x' | 'y'>,
): OpenGridOpenShelfPoint2D[] {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const nominalWidth = parameters.x * configuration.gridPitch
  const nominalDepth = parameters.y * configuration.gridPitch
  const xOffset = nominalWidth / 2 - configuration.pegInset
  const yOffset = nominalDepth / 2 - configuration.pegInset
  return [
    [-xOffset, -yOffset],
    [-xOffset, yOffset],
    [xOffset, -yOffset],
    [xOffset, yOffset],
  ]
}

export function openGridOpenShelfShelfCountFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'angle' | 'cellZ'>,
): number {
  return parameters.angle > 0
    ? parameters.cellZ
    : Math.max(0, parameters.cellZ - 1)
}

export function openGridOpenShelfDividerCentersFor(
  parameters: Pick<OpenGridOpenShelfParameters, 'x' | 'cellX'>,
): number[] {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const width = parameters.x * configuration.gridPitch - 0.15
  const innerWidth = width - 2 * configuration.outerWallThickness
  const clearCellWidth = openGridOpenShelfCellClearWidthFor(parameters)
  return Array.from(
    { length: Math.max(0, parameters.cellX - 1) },
    (_, index) => {
      const dividerIndex = index + 1
      return (
        -innerWidth / 2 +
        dividerIndex * clearCellWidth +
        (dividerIndex - 0.5) * configuration.innerPlateThickness
      )
    },
  )
}

function validateGridAxis(
  value: unknown,
  field: 'x' | 'y',
  minimum: number,
  maximum: number,
  issues: OpenGridOpenShelfValidationIssue[],
): void {
  if (!isHalfStep(value)) {
    issues.push({ field, messageId: 'validation.invalid' })
    return
  }
  if (value < minimum || value > maximum) {
    issues.push({ field, messageId: 'validation.invalid' })
  }
}

function validateIntegerField(
  value: unknown,
  field: 'height' | 'cellX' | 'cellZ' | 'angle',
  minimum: number,
  maximum: number,
  unit: string,
  issues: OpenGridOpenShelfValidationIssue[],
): void {
  if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
    issues.push({ field, messageId: 'validation.invalid' })
    return
  }
  if ((value as number) < minimum || (value as number) > maximum) {
    issues.push({
      field,
      messageId: 'validation.invalid',
    })
  }
}

export function validateOpenGridOpenShelfParameters(
  value: unknown,
): OpenGridOpenShelfValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const issues: OpenGridOpenShelfValidationIssue[] = []
  const hasCurrentParameters = hasExactKeys(
    value,
    OPENGRID_OPEN_SHELF_PARAMETER_KEYS,
  )
  const hasLegacyParameters = hasExactKeys(
    value,
    OPENGRID_OPEN_SHELF_LEGACY_PARAMETER_KEYS,
  )
  if (!hasCurrentParameters && !hasLegacyParameters) {
    issues.push({
      field: 'parameters',
      messageId: 'validation.invalid',
    })
  }

  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  validateGridAxis(value.x, 'x', configuration.minX, configuration.maxX, issues)
  validateGridAxis(value.y, 'y', configuration.minY, configuration.maxY, issues)
  validateIntegerField(
    value.height,
    'height',
    configuration.minHeight,
    configuration.maxHeight,
    ' mm',
    issues,
  )
  if (hasCurrentParameters && typeof value.honeycombMode !== 'boolean') {
    issues.push({
      field: 'honeycombMode',
      messageId: 'validation.invalid',
    })
  }
  validateIntegerField(
    value.cellX,
    'cellX',
    configuration.minCellX,
    configuration.maxCellX,
    ' 格',
    issues,
  )
  validateIntegerField(
    value.cellZ,
    'cellZ',
    configuration.minCellZ,
    configuration.maxCellZ,
    ' 格',
    issues,
  )
  validateIntegerField(
    value.angle,
    'angle',
    configuration.minAngle,
    configuration.maxAngle,
    '°',
    issues,
  )

  if (issues.length > 0) return { valid: false, issues }

  const parameters = {
    x: value.x as number,
    y: value.y as number,
    height: value.height as number,
    cellX: value.cellX as number,
    cellZ: value.cellZ as number,
    angle: value.angle as number,
    honeycombMode: hasCurrentParameters
      ? (value.honeycombMode as boolean)
      : OPENGRID_OPEN_SHELF_CONFIGURATION.defaultHoneycombMode,
  }
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  if (width > configuration.workspaceMaxDimension) {
    issues.push({
      field: 'x',
      messageId: 'validation.invalid',
    })
  }
  if (depth > configuration.workspaceMaxDimension) {
    issues.push({
      field: 'y',
      messageId: 'validation.invalid',
    })
  }

  const clearHeights = openGridOpenShelfClearCellHeightsFor(parameters)
  const clearCellHeights = [
    clearHeights.regular.front,
    clearHeights.regular.rear,
  ]
  if (
    clearCellHeights.some(
      (height) => height < configuration.minimumClearCellHeight,
    )
  ) {
    issues.push({
      field: 'angle',
      messageId: 'validation.invalid',
    })
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function isOpenGridOpenShelfParameters(
  value: unknown,
): value is OpenGridOpenShelfParameters {
  return validateOpenGridOpenShelfParameters(value).valid
}

export function boundsForOpenGridOpenShelf(
  parameters: OpenGridOpenShelfParameters,
) {
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  return {
    min: [
      -width / 2,
      -depth / 2,
      -OPENGRID_OPEN_SHELF_CONFIGURATION.pegHeight,
    ] as [number, number, number],
    max: [width / 2, depth / 2, parameters.height] as [number, number, number],
  }
}

export function openGridOpenShelfFileName(
  parameters: OpenGridOpenShelfParameters,
): string {
  const honeycombSuffix = parameters.honeycombMode ? '-honeycomb' : ''
  return `opengrid-open-shelf-${parameters.x}x${parameters.y}-h${parameters.height}-cx${parameters.cellX}-cz${parameters.cellZ}-a${parameters.angle}${honeycombSuffix}.step`
}

export function openGridOpenShelfStlFileName(
  parameters: OpenGridOpenShelfParameters,
): string {
  return openGridOpenShelfFileName(parameters).replace(/\.step$/, '.stl')
}
