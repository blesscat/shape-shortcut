import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import { OPENGRID_HONEYCOMB_CONFIGURATION } from './opengrid-honeycomb'
import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from './opengrid-locating-assembly'

export type OpenGridDividerShape = 'single' | 'straight' | 'L' | 'T' | 'cross'
export type OpenGridDividerAxis = 'horizontal' | 'vertical' | null

export type OpenGridDividerParameterKey =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'height'
  | 'wallThickness'
  | 'honeycombMode'

export type OpenGridDividerParameters = {
  left: number
  right: number
  up: number
  down: number
  height: number
  wallThickness: number
  honeycombMode: boolean
}

export type OpenGridDividerPoint2D = [number, number]

export type OpenGridDividerPlanDimensions = {
  width: number
  depth: number
  wallHeight: number
  totalHeight: number
  wallThickness: number
  baseWallWidth: number
}

export type OpenGridDividerPlanBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type OpenGridDividerArmEndpoints = {
  left: number
  right: number
  up: number
  down: number
}

export type OpenGridDividerValidationIssue = {
  field: OpenGridDividerParameterKey | 'parameters'
  messageId: string
}

export type OpenGridDividerValidation =
  | { valid: true; value: OpenGridDividerParameters }
  | { valid: false; issues: OpenGridDividerValidationIssue[] }

const DIVIDER_LEGACY_PARAMETER_KEYS: readonly Exclude<
  OpenGridDividerParameterKey,
  'honeycombMode'
>[] = ['left', 'right', 'up', 'down', 'height', 'wallThickness']

const DIVIDER_PARAMETER_KEYS: readonly OpenGridDividerParameterKey[] = [
  ...DIVIDER_LEGACY_PARAMETER_KEYS,
  'honeycombMode',
]

const DIVIDER_GRID_STEP = 0.5
const DIVIDER_MAX_DIMENSION = 500
const DIVIDER_MAX_ARM_COUNT = 10
const DIVIDER_GEOMETRY_SAFETY_MARGIN = 0.1
const DIVIDER_BOTTOM_SUPPORT_HEIGHT =
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius +
  DIVIDER_GEOMETRY_SAFETY_MARGIN

export const OPENGRID_DIVIDER_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  halfGridPitch: OPENGRID_GRID_CONFIGURATION.halfPitch,
  gridStep: DIVIDER_GRID_STEP,
  wallWidth: 5,
  minWallThickness: 1,
  maxWallThickness: 5,
  transitionChamferAngle: 45,
  transitionFilletRadius: 0.4,
  geometrySafetyMargin: DIVIDER_GEOMETRY_SAFETY_MARGIN,
  bottomSupportHeight: DIVIDER_BOTTOM_SUPPORT_HEIGHT,
  pegDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.nominalDiameter,
  pegLength: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight,
  pegBottomChamfer:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatBottomChamfer,
  pegCenterSpacing: OPENGRID_GRID_CONFIGURATION.fullPitch,
  sideFilletRadius: 2.5,
  topFilletRadius: 1,
  armEndRetraction: 2.275,
  maxDimension: DIVIDER_MAX_DIMENSION,
  maxArmCount: DIVIDER_MAX_ARM_COUNT,
  minHeight: 2,
  maxHeight: 500,
  heightSliderMax: 200,
  defaultHoneycombMode: false,
  defaultParameters: {
    left: 1.5,
    right: 1.5,
    up: 0,
    down: 0,
    height: 20,
    wallThickness: 2,
    honeycombMode: false,
  } satisfies OpenGridDividerParameters,
} as const

// Conservative divider-specific admission ceiling; the two thin crossing walls
// clip against each other's keepouts and produce a different boolean profile
// from the stackable-box panel builder.
export const OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS = 3000

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

function isSafeCount(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  const halfGridCount = value / OPENGRID_DIVIDER_CONFIGURATION.gridStep
  return (
    Number.isSafeInteger(halfGridCount) &&
    value >= 0 &&
    value <= OPENGRID_DIVIDER_CONFIGURATION.maxArmCount
  )
}

function isSafeHeight(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= OPENGRID_DIVIDER_CONFIGURATION.minHeight &&
    (value as number) <= OPENGRID_DIVIDER_CONFIGURATION.maxHeight
  )
}

function isSafeWallThickness(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= OPENGRID_DIVIDER_CONFIGURATION.minWallThickness &&
    (value as number) <= OPENGRID_DIVIDER_CONFIGURATION.maxWallThickness
  )
}

function countActiveDirections(
  parameters: Pick<OpenGridDividerParameters, 'left' | 'right' | 'up' | 'down'>,
): number {
  return [
    parameters.left,
    parameters.right,
    parameters.up,
    parameters.down,
  ].filter((count) => count > 0).length
}

export function classifyOpenGridDividerShape(
  parameters: Pick<OpenGridDividerParameters, 'left' | 'right' | 'up' | 'down'>,
): OpenGridDividerShape {
  const activeDirections = countActiveDirections(parameters)
  if (activeDirections < 1) throw new Error('OPENGRID_DIVIDER_SHAPE_INVALID')
  if (activeDirections === 1) return 'single'
  if (activeDirections === 4) return 'cross'
  if (activeDirections === 3) return 'T'
  if (
    (parameters.left > 0 && parameters.right > 0) ||
    (parameters.up > 0 && parameters.down > 0)
  ) {
    return 'straight'
  }
  return 'L'
}

export function openGridDividerAxisFor(
  parameters: Pick<OpenGridDividerParameters, 'left' | 'right' | 'up' | 'down'>,
): OpenGridDividerAxis {
  const shape = classifyOpenGridDividerShape(parameters)
  if (shape !== 'single' && shape !== 'straight') return null
  if (parameters.left > 0 || parameters.right > 0) return 'horizontal'
  return 'vertical'
}

export function openGridDividerArmEndpointsFor(
  parameters: Pick<OpenGridDividerParameters, 'left' | 'right' | 'up' | 'down'>,
): OpenGridDividerArmEndpoints {
  const { gridPitch, armEndRetraction } = OPENGRID_DIVIDER_CONFIGURATION
  const endpointFor = (count: number, direction: -1 | 1): number =>
    count > 0 ? direction * (count * gridPitch - armEndRetraction) : 0

  return {
    left: endpointFor(parameters.left, -1),
    right: endpointFor(parameters.right, 1),
    up: endpointFor(parameters.up, 1),
    down: endpointFor(parameters.down, -1),
  }
}

export function openGridDividerPlanBoundsFor(
  parameters: Pick<OpenGridDividerParameters, 'left' | 'right' | 'up' | 'down'>,
): OpenGridDividerPlanBounds {
  const { wallWidth } = OPENGRID_DIVIDER_CONFIGURATION
  const endpoints = openGridDividerArmEndpointsFor(parameters)
  return {
    minX: Math.min(endpoints.left, -wallWidth / 2),
    maxX: Math.max(endpoints.right, wallWidth / 2),
    minY: Math.min(endpoints.down, -wallWidth / 2),
    maxY: Math.max(endpoints.up, wallWidth / 2),
  }
}

export function openGridDividerPlanDimensionsFor(
  parameters: Pick<
    OpenGridDividerParameters,
    'left' | 'right' | 'up' | 'down' | 'height' | 'wallThickness'
  >,
): OpenGridDividerPlanDimensions {
  const bounds = openGridDividerPlanBoundsFor(parameters)
  return {
    width: bounds.maxX - bounds.minX,
    depth: bounds.maxY - bounds.minY,
    wallHeight: parameters.height,
    totalHeight: parameters.height + OPENGRID_DIVIDER_CONFIGURATION.pegLength,
    wallThickness: parameters.wallThickness,
    baseWallWidth: OPENGRID_DIVIDER_CONFIGURATION.wallWidth,
  }
}

export function openGridDividerTransitionHeightFor(
  parameters: Pick<OpenGridDividerParameters, 'wallThickness' | 'height'>,
): number {
  const { bottomSupportHeight, geometrySafetyMargin, wallWidth } =
    OPENGRID_DIVIDER_CONFIGURATION
  const halfWidthDifference = (wallWidth - parameters.wallThickness) / 2
  return Math.max(
    0,
    Math.min(
      halfWidthDifference,
      parameters.height - bottomSupportHeight - geometrySafetyMargin,
    ),
  )
}

export function openGridDividerHoneycombMinHeightFor(
  parameters: Pick<OpenGridDividerParameters, 'wallThickness'>,
): number {
  const {
    bottomSupportHeight,
    geometrySafetyMargin,
    wallWidth,
    topFilletRadius,
  } = OPENGRID_DIVIDER_CONFIGURATION
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const maxTransitionHeight = Math.max(
    0,
    (wallWidth - parameters.wallThickness) / 2,
  )
  const upperWallStartZ = bottomSupportHeight + maxTransitionHeight
  return (
    upperWallStartZ +
    honeycomb.lowerFrame +
    honeycomb.minimumPanelSpan +
    honeycomb.topFrame +
    topFilletRadius +
    geometrySafetyMargin
  )
}

export function validateOpenGridDividerParameters(
  value: unknown,
): OpenGridDividerValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const issues: OpenGridDividerValidationIssue[] = []
  const hasCurrentParameters = hasExactKeys(value, DIVIDER_PARAMETER_KEYS)
  const hasLegacyParameters = hasExactKeys(value, DIVIDER_LEGACY_PARAMETER_KEYS)
  if (!hasCurrentParameters && !hasLegacyParameters) {
    issues.push({
      field: 'parameters',
      messageId: 'validation.invalid',
    })
  }

  for (const field of ['left', 'right', 'up', 'down'] as const) {
    const count = value[field]
    if (!isSafeCount(count)) {
      issues.push({
        field,
        messageId: 'validation.invalid',
      })
    }
  }

  if (!isSafeHeight(value.height)) {
    issues.push({
      field: 'height',
      messageId: 'validation.invalid',
    })
  }

  if (!isSafeWallThickness(value.wallThickness)) {
    issues.push({
      field: 'wallThickness',
      messageId: 'validation.invalid',
    })
  }

  if (hasCurrentParameters && typeof value.honeycombMode !== 'boolean') {
    issues.push({
      field: 'honeycombMode',
      messageId: 'validation.invalid',
    })
  }

  const countsAreValid = (['left', 'right', 'up', 'down'] as const).every(
    (field) => isSafeCount(value[field]),
  )
  if (countsAreValid) {
    const candidate = {
      left: value.left as number,
      right: value.right as number,
      up: value.up as number,
      down: value.down as number,
    }
    if (countActiveDirections(candidate) < 1) {
      issues.push({
        field: 'parameters',
        messageId: 'validation.invalid',
      })
    } else {
      const plan = openGridDividerPlanBoundsFor(candidate)
      if (
        plan.maxX - plan.minX > OPENGRID_DIVIDER_CONFIGURATION.maxDimension ||
        plan.maxY - plan.minY > OPENGRID_DIVIDER_CONFIGURATION.maxDimension
      ) {
        issues.push({
          field: 'parameters',
          messageId: 'validation.invalid',
        })
      }
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      left: value.left as number,
      right: value.right as number,
      up: value.up as number,
      down: value.down as number,
      height: value.height as number,
      wallThickness: value.wallThickness as number,
      honeycombMode: hasCurrentParameters
        ? (value.honeycombMode as boolean)
        : OPENGRID_DIVIDER_CONFIGURATION.defaultHoneycombMode,
    },
  }
}

export function normalizeOpenGridDividerParameters(
  value: unknown,
): OpenGridDividerParameters {
  const validation = validateOpenGridDividerParameters(value)
  if (!validation.valid) throw new Error('OPENGRID_DIVIDER_PARAMETERS_INVALID')
  return validation.value
}

export function isOpenGridDividerParameters(
  value: unknown,
): value is OpenGridDividerParameters {
  return validateOpenGridDividerParameters(value).valid
}

export function openGridDividerPegCentersFor(
  parameters: Pick<OpenGridDividerParameters, 'left' | 'right' | 'up' | 'down'>,
): OpenGridDividerPoint2D[] {
  const { gridPitch, pegCenterSpacing } = OPENGRID_DIVIDER_CONFIGURATION
  const centers: OpenGridDividerPoint2D[] = [[0, 0]]

  function addArm(count: number, direction: OpenGridDividerPoint2D): void {
    const armLength = count * gridPitch
    for (
      let distance = pegCenterSpacing;
      distance < armLength;
      distance += pegCenterSpacing
    ) {
      centers.push([direction[0] * distance, direction[1] * distance])
    }
  }

  addArm(parameters.left, [-1, 0])
  addArm(parameters.right, [1, 0])
  addArm(parameters.up, [0, 1])
  addArm(parameters.down, [0, -1])
  return centers
}

export function boundsForOpenGridDivider(
  parameters: OpenGridDividerParameters,
) {
  const plan = openGridDividerPlanBoundsFor(parameters)
  const centerX = (plan.minX + plan.maxX) / 2
  const centerY = (plan.minY + plan.maxY) / 2
  return {
    min: [
      plan.minX - centerX,
      plan.minY - centerY,
      -OPENGRID_DIVIDER_CONFIGURATION.pegLength,
    ] as [number, number, number],
    max: [plan.maxX - centerX, plan.maxY - centerY, parameters.height] as [
      number,
      number,
      number,
    ],
  }
}

export function openGridDividerFileName(
  parameters: OpenGridDividerParameters,
): string {
  const honeycombSuffix = parameters.honeycombMode ? '-honeycomb' : ''
  return `opengrid-divider-l${parameters.left}-r${parameters.right}-u${parameters.up}-d${parameters.down}-t${parameters.wallThickness}-h${parameters.height}${honeycombSuffix}.step`
}

export function openGridDividerStlFileName(
  parameters: OpenGridDividerParameters,
): string {
  return openGridDividerFileName(parameters).replace(/\.step$/, '.stl')
}
