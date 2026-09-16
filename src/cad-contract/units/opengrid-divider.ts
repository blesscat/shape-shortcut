import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from './opengrid-locating-assembly'
import { OPENGRID_STACKABLE_BOX_CONFIGURATION } from './opengrid-stackable-box'
import { OPENGRID_ORGANIZER_BOX_CONFIGURATION } from './opengrid-organizer-box'

export type OpenGridDividerShape = 'single' | 'straight' | 'L' | 'T' | 'cross'
export type OpenGridDividerAxis = 'horizontal' | 'vertical' | null
export type OpenGridDividerAlignmentMode = 'free' | 'box-fit'
export type OpenGridDividerPegLengthMode = 'snap' | 'thin-shell' | 'stackable'
export type OpenGridDividerLatticeAnchor = 'center' | 'plus-minus-7'

export type OpenGridDividerParameterKey =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'height'
  | 'wallThickness'
  | 'alignmentMode'
  | 'targetBoxGridsX'
  | 'targetBoxGridsY'
  | 'endClearance'
  | 'pegLengthMode'
  | 'pegDiameterIncrement'

export type OpenGridDividerParameters = {
  left: number
  right: number
  up: number
  down: number
  height: number
  wallThickness: number
  alignmentMode: OpenGridDividerAlignmentMode
  targetBoxGridsX: number
  targetBoxGridsY: number
  endClearance: number
  pegLengthMode: OpenGridDividerPegLengthMode
  pegDiameterIncrement: number
}

export type OpenGridDividerAlignmentInfo = {
  anchorX: OpenGridDividerLatticeAnchor
  anchorY: OpenGridDividerLatticeAnchor
  centerPeg: boolean
  transverseIntegerAxes: ('x' | 'y')[]
  junctionOnLattice: boolean
}

export type OpenGridDividerPegPlan = {
  centers: OpenGridDividerPoint2D[]
  diameter: number
  length: number
  bottomChamfer: number
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

const DIVIDER_PARAMETER_KEYS: readonly OpenGridDividerParameterKey[] = [
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

const LEGACY_DIVIDER_PARAMETER_KEYS: readonly OpenGridDividerParameterKey[] = [
  'left',
  'right',
  'up',
  'down',
  'height',
  'wallThickness',
]

const DIVIDER_ALIGNMENT_MODES: readonly OpenGridDividerAlignmentMode[] = [
  'free',
  'box-fit',
]

const DIVIDER_PEG_LENGTH_MODES: readonly OpenGridDividerPegLengthMode[] = [
  'snap',
  'thin-shell',
  'stackable',
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
  pegDiameter: 4.9,
  pegDiameterIncrementMin: -1,
  pegDiameterIncrementMax: 1,
  pegDiameterIncrementStep: 0.1,
  pegLengths: {
    snap: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight,
    'thin-shell': OPENGRID_STACKABLE_BOX_CONFIGURATION.thinShellFloorThickness,
    stackable: OPENGRID_ORGANIZER_BOX_CONFIGURATION.interfaceFloorDatum,
  },
  pegBottomChamfer:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatBottomChamfer,
  pegCenterSpacing: OPENGRID_GRID_CONFIGURATION.fullPitch,
  sideFilletRadius: 2.5,
  topFilletRadius: 1,
  armEndRetraction: 2.275,
  boxWallStationInset: 1.275,
  alignmentModes: DIVIDER_ALIGNMENT_MODES,
  pegLengthModes: DIVIDER_PEG_LENGTH_MODES,
  minTargetBoxGrids: 0.5,
  maxTargetBoxGrids: 17.5,
  minEndClearance: 0.1,
  maxEndClearance: 2,
  endClearanceStep: 0.05,
  maxDimension: DIVIDER_MAX_DIMENSION,
  maxArmCount: DIVIDER_MAX_ARM_COUNT,
  minHeight: 2,
  maxHeight: 500,
  heightSliderMax: 200,
  defaultParameters: {
    left: 1.5,
    right: 1.5,
    up: 0,
    down: 0,
    height: 20,
    wallThickness: 2,
    alignmentMode: 'free',
    targetBoxGridsX: 4.5,
    targetBoxGridsY: 4.5,
    endClearance: 0.15,
    pegLengthMode: 'snap',
    pegDiameterIncrement: 0,
  } satisfies OpenGridDividerParameters,
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function isStepValue(value: number, step: number, tolerance = 1e-9): boolean {
  const steps = value / step
  return (
    Number.isFinite(steps) &&
    Math.abs(steps - Math.round(steps)) <= tolerance / step
  )
}

function isSafeTargetBoxGrids(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  const { minTargetBoxGrids, maxTargetBoxGrids, gridStep } =
    OPENGRID_DIVIDER_CONFIGURATION
  return (
    value >= minTargetBoxGrids &&
    value <= maxTargetBoxGrids &&
    isStepValue(value, gridStep)
  )
}

function isSafeEndClearance(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  const { minEndClearance, maxEndClearance, endClearanceStep } =
    OPENGRID_DIVIDER_CONFIGURATION
  return (
    value >= minEndClearance &&
    value <= maxEndClearance &&
    isStepValue(value, endClearanceStep)
  )
}

function isSafePegDiameterIncrement(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  const {
    pegDiameterIncrementMin,
    pegDiameterIncrementMax,
    pegDiameterIncrementStep,
  } = OPENGRID_DIVIDER_CONFIGURATION
  return (
    value >= pegDiameterIncrementMin &&
    value <= pegDiameterIncrementMax &&
    isStepValue(value, pegDiameterIncrementStep)
  )
}

export function openGridDividerRetractionFor(
  parameters: Pick<OpenGridDividerParameters, 'alignmentMode' | 'endClearance'>,
): number {
  const { armEndRetraction, boxWallStationInset } =
    OPENGRID_DIVIDER_CONFIGURATION
  if (parameters.alignmentMode === 'box-fit') {
    return boxWallStationInset + parameters.endClearance
  }
  return armEndRetraction
}

export function openGridDividerPegLengthFor(
  parameters: Pick<OpenGridDividerParameters, 'pegLengthMode'>,
): number {
  return OPENGRID_DIVIDER_CONFIGURATION.pegLengths[parameters.pegLengthMode]
}

export function openGridDividerBaseWidthFor(
  parameters: Pick<OpenGridDividerParameters, 'pegDiameterIncrement'>,
): number {
  // A peg fatter than the 5 mm base would overhang it and print unsupported,
  // so the base (and its 45-degree transition) widens with the increment.
  const { wallWidth, pegDiameter } = OPENGRID_DIVIDER_CONFIGURATION
  const effectivePegDiameter = pegDiameter + parameters.pegDiameterIncrement
  return Math.max(wallWidth, effectivePegDiameter)
}

export function openGridDividerLatticeStationsFor(
  targetGrids: number,
): number[] {
  const { gridPitch } = OPENGRID_DIVIDER_CONFIGURATION
  const anchor = Number.isInteger(targetGrids) ? gridPitch / 4 : 0
  const limit = (targetGrids * gridPitch) / 2
  const stations: number[] = []
  if (anchor === 0) stations.push(0)
  for (
    let magnitude = anchor;
    magnitude < limit - 1e-9;
    magnitude += gridPitch
  ) {
    if (magnitude === 0) continue
    stations.push(magnitude, -magnitude)
  }
  return stations.sort((a, b) => a - b)
}

export function openGridDividerArmStationsFor(
  parameters: OpenGridDividerParameters,
  armAxis: 'x' | 'y',
): { start: number; end: number } {
  const retraction = openGridDividerRetractionFor(parameters)
  const shape = classifyOpenGridDividerShape(parameters)
  const { gridPitch } = OPENGRID_DIVIDER_CONFIGURATION
  if (shape === 'single' && parameters.alignmentMode === 'box-fit') {
    const count = countForAxis(parameters, armAxis)
    if (count === 0) return { start: 0, end: 0 }
    const span = count * gridPitch - 2 * retraction
    return armAxis === 'x'
      ? parameters.right > 0
        ? { start: 0, end: span }
        : { start: -span, end: 0 }
      : parameters.up > 0
        ? { start: 0, end: span }
        : { start: -span, end: 0 }
  }
  const endpoints = openGridDividerArmEndpointsFor(parameters, retraction)
  const centerExtension = singleArmCenterExtensionFor(parameters)
  if (armAxis === 'x') {
    return {
      start: parameters.left > 0 ? endpoints.left : -centerExtension,
      end: parameters.right > 0 ? endpoints.right : centerExtension,
    }
  }
  return {
    start: parameters.down > 0 ? endpoints.down : -centerExtension,
    end: parameters.up > 0 ? endpoints.up : centerExtension,
  }
}

function countForAxis(
  parameters: Pick<OpenGridDividerParameters, 'left' | 'right' | 'up' | 'down'>,
  armAxis: 'x' | 'y',
): number {
  return armAxis === 'x'
    ? parameters.left + parameters.right
    : parameters.up + parameters.down
}

function singleArmCenterExtensionFor(
  parameters: OpenGridDividerParameters,
): number {
  if (classifyOpenGridDividerShape(parameters) !== 'single') return 0
  return openGridDividerBaseWidthFor(parameters) / 2
}

export function openGridDividerBoxFitPegCentersFor(
  parameters: OpenGridDividerParameters,
): OpenGridDividerPoint2D[] {
  const horizontalActive = parameters.left > 0 || parameters.right > 0
  const verticalActive = parameters.up > 0 || parameters.down > 0
  if (!horizontalActive && !verticalActive) return []
  const EPSILON = 1e-6
  const horizontal = openGridDividerArmStationsFor(parameters, 'x')
  const vertical = openGridDividerArmStationsFor(parameters, 'y')
  const planCenterX = (horizontal.start + horizontal.end) / 2
  const planCenterY = (vertical.start + vertical.end) / 2
  const centers = new Map<string, OpenGridDividerPoint2D>()
  if (horizontalActive) {
    for (const station of openGridDividerLatticeStationsFor(
      parameters.targetBoxGridsX,
    )) {
      const localX = station + planCenterX
      if (
        localX > horizontal.start + EPSILON &&
        localX < horizontal.end - EPSILON
      ) {
        centers.set(`${localX},0`, [localX, 0])
      }
    }
  }
  if (verticalActive) {
    for (const station of openGridDividerLatticeStationsFor(
      parameters.targetBoxGridsY,
    )) {
      const localY = station + planCenterY
      if (
        localY > vertical.start + EPSILON &&
        localY < vertical.end - EPSILON
      ) {
        centers.set(`0,${localY}`, [0, localY])
      }
    }
  }
  return [...centers.values()].sort(
    (first, second) => first[0] - second[0] || first[1] - second[1],
  )
}

export function openGridDividerPegPlanFor(
  parameters: OpenGridDividerParameters,
): OpenGridDividerPegPlan {
  const centers =
    parameters.alignmentMode === 'box-fit'
      ? openGridDividerBoxFitPegCentersFor(parameters)
      : openGridDividerPegCentersFor(parameters)
  return {
    centers,
    diameter:
      OPENGRID_DIVIDER_CONFIGURATION.pegDiameter +
      parameters.pegDiameterIncrement,
    length: openGridDividerPegLengthFor(parameters),
    bottomChamfer: OPENGRID_DIVIDER_CONFIGURATION.pegBottomChamfer,
  }
}

export function openGridDividerAlignmentInfoFor(
  parameters: OpenGridDividerParameters,
): OpenGridDividerAlignmentInfo {
  const anchorFor = (targetGrids: number): OpenGridDividerLatticeAnchor =>
    Number.isInteger(targetGrids) ? 'plus-minus-7' : 'center'
  const stationsX = new Set(
    openGridDividerLatticeStationsFor(parameters.targetBoxGridsX),
  )
  const stationsY = new Set(
    openGridDividerLatticeStationsFor(parameters.targetBoxGridsY),
  )
  // Raw panel input can hold all-zero arm counts before validation rejects
  // the snapshot; report a neutral alignment state instead of throwing.
  if (countActiveDirections(parameters) < 1) {
    return {
      anchorX: anchorFor(parameters.targetBoxGridsX),
      anchorY: anchorFor(parameters.targetBoxGridsY),
      centerPeg: stationsX.has(0) && stationsY.has(0),
      transverseIntegerAxes: [],
      junctionOnLattice: false,
    }
  }
  const horizontal = openGridDividerArmStationsFor(parameters, 'x')
  const vertical = openGridDividerArmStationsFor(parameters, 'y')
  const junctionX = -((horizontal.start + horizontal.end) / 2)
  const junctionY = -((vertical.start + vertical.end) / 2)
  const transverseIntegerAxes: ('x' | 'y')[] = []
  if ((parameters.left > 0 || parameters.right > 0) && !stationsY.has(0)) {
    // A horizontal wall's centerline must sit on a Y hole column.
    transverseIntegerAxes.push('y')
  }
  if ((parameters.up > 0 || parameters.down > 0) && !stationsX.has(0)) {
    // A vertical wall's centerline must sit on an X hole column.
    transverseIntegerAxes.push('x')
  }
  return {
    anchorX: anchorFor(parameters.targetBoxGridsX),
    anchorY: anchorFor(parameters.targetBoxGridsY),
    centerPeg: stationsX.has(0) && stationsY.has(0),
    transverseIntegerAxes,
    junctionOnLattice: stationsX.has(junctionX) && stationsY.has(junctionY),
  }
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
  retraction: number = OPENGRID_DIVIDER_CONFIGURATION.armEndRetraction,
): OpenGridDividerArmEndpoints {
  const { gridPitch } = OPENGRID_DIVIDER_CONFIGURATION
  const endpointFor = (count: number, direction: -1 | 1): number =>
    count > 0 ? direction * (count * gridPitch - retraction) : 0

  return {
    left: endpointFor(parameters.left, -1),
    right: endpointFor(parameters.right, 1),
    up: endpointFor(parameters.up, 1),
    down: endpointFor(parameters.down, -1),
  }
}

export function openGridDividerPlanBoundsFor(
  parameters: Pick<
    OpenGridDividerParameters,
    | 'left'
    | 'right'
    | 'up'
    | 'down'
    | 'alignmentMode'
    | 'endClearance'
    | 'pegDiameterIncrement'
  >,
): OpenGridDividerPlanBounds {
  const horizontalActive = parameters.left > 0 || parameters.right > 0
  const verticalActive = parameters.up > 0 || parameters.down > 0
  const halfWidth = openGridDividerBaseWidthFor(parameters) / 2
  const x = openGridDividerArmStationsFor(
    parameters as OpenGridDividerParameters,
    'x',
  )
  const y = openGridDividerArmStationsFor(
    parameters as OpenGridDividerParameters,
    'y',
  )
  // A perpendicular wall's 5 mm base extends wallWidth/2 past the junction
  // even where the axis stations stop at the centerline.
  return {
    minX: verticalActive ? Math.min(x.start, -halfWidth) : x.start,
    maxX: verticalActive ? Math.max(x.end, halfWidth) : x.end,
    minY: horizontalActive ? Math.min(y.start, -halfWidth) : y.start,
    maxY: horizontalActive ? Math.max(y.end, halfWidth) : y.end,
  }
}

export function openGridDividerPlanDimensionsFor(
  parameters: Pick<
    OpenGridDividerParameters,
    | 'left'
    | 'right'
    | 'up'
    | 'down'
    | 'height'
    | 'wallThickness'
    | 'alignmentMode'
    | 'endClearance'
    | 'pegLengthMode'
    | 'pegDiameterIncrement'
  >,
): OpenGridDividerPlanDimensions {
  const bounds = openGridDividerPlanBoundsFor(parameters)
  return {
    width: bounds.maxX - bounds.minX,
    depth: bounds.maxY - bounds.minY,
    wallHeight: parameters.height,
    totalHeight: parameters.height + openGridDividerPegLengthFor(parameters),
    wallThickness: parameters.wallThickness,
    baseWallWidth: OPENGRID_DIVIDER_CONFIGURATION.wallWidth,
  }
}

export function openGridDividerTransitionHeightFor(
  parameters: Pick<
    OpenGridDividerParameters,
    'wallThickness' | 'height' | 'pegDiameterIncrement'
  >,
): number {
  const { bottomSupportHeight, geometrySafetyMargin } =
    OPENGRID_DIVIDER_CONFIGURATION
  const halfWidthDifference =
    (openGridDividerBaseWidthFor(parameters) - parameters.wallThickness) / 2
  return Math.max(
    0,
    Math.min(
      halfWidthDifference,
      parameters.height - bottomSupportHeight - geometrySafetyMargin,
    ),
  )
}

const REMOVED_DIVIDER_PARAMETER_KEYS: readonly string[] = [
  'pegDiameter',
  'pegOffsetX',
  'pegOffsetY',
]

function hasAcceptableKeys(value: Record<string, unknown>): boolean {
  const knownKeys = new Set<string>(DIVIDER_PARAMETER_KEYS)
  const removedKeys = new Set<string>(REMOVED_DIVIDER_PARAMETER_KEYS)
  const allKeysKnown = Object.keys(value).every(
    (key) => knownKeys.has(key) || removedKeys.has(key),
  )
  const legacyKeysPresent = LEGACY_DIVIDER_PARAMETER_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(value, key),
  )
  return allKeysKnown && legacyKeysPresent
}

function withAlignmentDefaults(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = OPENGRID_DIVIDER_CONFIGURATION.defaultParameters
  const merged: Record<string, unknown> = { ...value }
  for (const key of REMOVED_DIVIDER_PARAMETER_KEYS) {
    delete merged[key]
  }
  for (const key of [
    'alignmentMode',
    'targetBoxGridsX',
    'targetBoxGridsY',
    'endClearance',
    'pegLengthMode',
    'pegDiameterIncrement',
  ] as const) {
    if (!Object.prototype.hasOwnProperty.call(merged, key)) {
      merged[key] = defaults[key]
    }
  }
  return merged
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
  if (!hasAcceptableKeys(value)) {
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

  const candidateRecord = hasAcceptableKeys(value)
    ? withAlignmentDefaults(value)
    : value
  const alignmentMode = candidateRecord.alignmentMode
  if (
    !DIVIDER_ALIGNMENT_MODES.includes(
      alignmentMode as OpenGridDividerAlignmentMode,
    )
  ) {
    issues.push({
      field: 'alignmentMode',
      messageId: 'validation.invalid',
    })
  }
  if (!isSafeTargetBoxGrids(candidateRecord.targetBoxGridsX)) {
    issues.push({
      field: 'targetBoxGridsX',
      messageId: 'validation.invalid',
    })
  }
  if (!isSafeTargetBoxGrids(candidateRecord.targetBoxGridsY)) {
    issues.push({
      field: 'targetBoxGridsY',
      messageId: 'validation.invalid',
    })
  }
  if (!isSafeEndClearance(candidateRecord.endClearance)) {
    issues.push({
      field: 'endClearance',
      messageId: 'validation.invalid',
    })
  }
  if (
    !DIVIDER_PEG_LENGTH_MODES.includes(
      candidateRecord.pegLengthMode as OpenGridDividerPegLengthMode,
    )
  ) {
    issues.push({
      field: 'pegLengthMode',
      messageId: 'validation.invalid',
    })
  }
  if (!isSafePegDiameterIncrement(candidateRecord.pegDiameterIncrement)) {
    issues.push({
      field: 'pegDiameterIncrement',
      messageId: 'validation.invalid',
    })
  }

  const countsAreValid = (['left', 'right', 'up', 'down'] as const).every(
    (field) => isSafeCount(value[field]),
  )
  const alignmentFieldsAreValid = [
    'alignmentMode',
    'targetBoxGridsX',
    'targetBoxGridsY',
    'endClearance',
  ].every((field) => !issues.some((issue) => issue.field === field))
  if (countsAreValid && alignmentFieldsAreValid) {
    const candidate = {
      left: value.left as number,
      right: value.right as number,
      up: value.up as number,
      down: value.down as number,
      alignmentMode:
        candidateRecord.alignmentMode as OpenGridDividerAlignmentMode,
      endClearance: candidateRecord.endClearance as number,
      pegDiameterIncrement: candidateRecord.pegDiameterIncrement as number,
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
      if (candidate.alignmentMode === 'box-fit') {
        const shape = classifyOpenGridDividerShape(candidate)
        if (shape !== 'single' && shape !== 'straight') {
          issues.push({
            field: 'parameters',
            messageId: 'validation.boxFitRequiresStraightArm',
          })
        }
        const horizontalSum = candidate.left + candidate.right
        const verticalSum = candidate.up + candidate.down
        if (horizontalSum > (candidateRecord.targetBoxGridsX as number)) {
          issues.push({
            field: 'targetBoxGridsX',
            messageId: 'validation.axisSumExceedsTarget',
          })
        }
        if (verticalSum > (candidateRecord.targetBoxGridsY as number)) {
          issues.push({
            field: 'targetBoxGridsY',
            messageId: 'validation.axisSumExceedsTarget',
          })
        }
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
      alignmentMode:
        candidateRecord.alignmentMode as OpenGridDividerAlignmentMode,
      targetBoxGridsX: candidateRecord.targetBoxGridsX as number,
      targetBoxGridsY: candidateRecord.targetBoxGridsY as number,
      endClearance: candidateRecord.endClearance as number,
      pegLengthMode:
        candidateRecord.pegLengthMode as OpenGridDividerPegLengthMode,
      pegDiameterIncrement: candidateRecord.pegDiameterIncrement as number,
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
      -openGridDividerPegLengthFor(parameters),
    ] as [number, number, number],
    max: [plan.maxX - centerX, plan.maxY - centerY, parameters.height] as [
      number,
      number,
      number,
    ],
  }
}

function openGridDividerFileNameSuffix(
  parameters: OpenGridDividerParameters,
): string {
  return (
    `-a${parameters.alignmentMode}` +
    `-g${parameters.targetBoxGridsX}x${parameters.targetBoxGridsY}` +
    `-c${parameters.endClearance}` +
    `-p${parameters.pegLengthMode}` +
    `-i${parameters.pegDiameterIncrement}`
  )
}

export function openGridDividerFileName(
  parameters: OpenGridDividerParameters,
): string {
  return (
    `opengrid-divider-l${parameters.left}-r${parameters.right}-u${parameters.up}-d${parameters.down}-t${parameters.wallThickness}-h${parameters.height}` +
    `${openGridDividerFileNameSuffix(parameters)}.step`
  )
}

export function openGridDividerStlFileName(
  parameters: OpenGridDividerParameters,
): string {
  return (
    `opengrid-divider-l${parameters.left}-r${parameters.right}-u${parameters.up}-d${parameters.down}-t${parameters.wallThickness}-h${parameters.height}` +
    `${openGridDividerFileNameSuffix(parameters)}.stl`
  )
}
