import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import {
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_LOCATING_SEAT_MODES,
} from './opengrid-locating-assembly'

export type OpenGridStackableCylinderParameterKey =
  | 'diameter'
  | 'height'
  | 'thinBottomMode'
  | 'bottomPlateMode'
  | 'bottomSeatMode'
  | 'honeycombMode'
  | 'openingPlusXDepth'
  | 'openingPlusXBottomLength'
  | 'openingPlusXAngle'
  | 'openingMinusXDepth'
  | 'openingMinusXBottomLength'
  | 'openingMinusXAngle'
  | 'openingPlusYDepth'
  | 'openingPlusYBottomLength'
  | 'openingPlusYAngle'
  | 'openingMinusYDepth'
  | 'openingMinusYBottomLength'
  | 'openingMinusYAngle'

export type OpenGridStackableCylinderOpeningDirection =
  '+X' | '-X' | '+Y' | '-Y'

export type OpenGridStackableCylinderProfile =
  'default' | 'thin' | 'bottom-plate'

export const OPENGRID_STACKABLE_CYLINDER_SEAT_MODES = [
  ...OPENGRID_LOCATING_SEAT_MODES,
  'center-hook',
] as const

export type OpenGridStackableCylinderSeatMode =
  (typeof OPENGRID_STACKABLE_CYLINDER_SEAT_MODES)[number]

export type OpenGridStackableCylinderParameters = {
  diameter: number
  height: number
  thinBottomMode: boolean
  bottomPlateMode: boolean
  bottomSeatMode: OpenGridStackableCylinderSeatMode
  honeycombMode: boolean
} & Record<OpenGridStackableCylinderOpeningParameterKey, number>

export type OpenGridStackableCylinderOpeningParameterKey =
  | 'openingPlusXDepth'
  | 'openingPlusXBottomLength'
  | 'openingPlusXAngle'
  | 'openingMinusXDepth'
  | 'openingMinusXBottomLength'
  | 'openingMinusXAngle'
  | 'openingPlusYDepth'
  | 'openingPlusYBottomLength'
  | 'openingPlusYAngle'
  | 'openingMinusYDepth'
  | 'openingMinusYBottomLength'
  | 'openingMinusYAngle'

export const OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS = [
  'openingPlusXDepth',
  'openingPlusXBottomLength',
  'openingPlusXAngle',
  'openingMinusXDepth',
  'openingMinusXBottomLength',
  'openingMinusXAngle',
  'openingPlusYDepth',
  'openingPlusYBottomLength',
  'openingPlusYAngle',
  'openingMinusYDepth',
  'openingMinusYBottomLength',
  'openingMinusYAngle',
] as const satisfies readonly OpenGridStackableCylinderOpeningParameterKey[]

export type OpenGridStackableCylinderPoint2D = [number, number]

export type OpenGridStackableCylinderDerivedOpening = {
  direction: OpenGridStackableCylinderOpeningDirection
  enabled: boolean
  depth: number
  bottomLength: number
  angle: number
  bottomZ: number
  arcRadius: number
  cornerRun: number
  cornerRise: number
  horizontalRun: number
  verticalSideHeight: number
  straightSideRun: number
  upperWidth: number
  angularHalfWidth: number
}

export type OpenGridStackableCylinderValidationIssue = {
  field: OpenGridStackableCylinderParameterKey | 'parameters'
  messageId: string
}

export type OpenGridStackableCylinderValidation =
  | { valid: true; value: OpenGridStackableCylinderParameters }
  | { valid: false; issues: OpenGridStackableCylinderValidationIssue[] }

const CENTER_HOOK_NOMINAL_SHORT_SIDE = 4
const CENTER_HOOK_NOMINAL_LONG_SIDE = 8
const CENTER_HOOK_CLEARANCE_PER_SIDE = 0.2
const CENTER_HOOK_WIDTH =
  CENTER_HOOK_NOMINAL_SHORT_SIDE - CENTER_HOOK_CLEARANCE_PER_SIDE * 2
const CENTER_HOOK_DEPTH =
  CENTER_HOOK_NOMINAL_LONG_SIDE - CENTER_HOOK_CLEARANCE_PER_SIDE * 2
const CENTER_HOOK_FULL_PASSAGE_DEPTH = 2
const CENTER_HOOK_ROTATION_CLEARANCE = 0.1
const CENTER_HOOK_HEAD_HEIGHT = 0.8
const CENTER_HOOK_STEM_HEIGHT =
  CENTER_HOOK_FULL_PASSAGE_DEPTH + CENTER_HOOK_ROTATION_CLEARANCE
const CENTER_HOOK_HEIGHT = CENTER_HOOK_STEM_HEIGHT + CENTER_HOOK_HEAD_HEIGHT
const CENTER_HOOK_STEM_DIAMETER = CENTER_HOOK_WIDTH

export const OPENGRID_STACKABLE_CYLINDER_CONFIGURATION = {
  defaultDiameter: 60,
  minDiameter: 20,
  maxDiameter: 300,
  defaultHeight: 20,
  minHeight: 10,
  maxHeight: 500,
  heightSliderMax: 200,
  inputStep: 1,
  wallThickness: 2,
  defaultFloorThickness: 5,
  thinWallThickness: 1.6,
  thinFloorThickness: 2,
  floorThickness: 3,
  bottomHoleDiameter:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
  innerHoleDiameter:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
  defaultBottomHoleSectionDepth: 4,
  thinBottomHoleSectionDepth: 1,
  bottomHoleSectionDepth: 2,
  innerHoleSectionDepth: 1,
  innerFloorFilletRadius: 0.6,
  holeGridPitch: OPENGRID_GRID_CONFIGURATION.halfPitch,
  outerEdgeClearance: 2,
  flatFloorClearance: 2,
  stackGrooveDepth: 0.8,
  stackFitClearance: 0.2,
  bottomProtrusionInset: 2,
  bottomFootBevel: 0.8,
  bottomVerticalHeight: 2.6,
  topInnerChamfer: 2,
  thinTopInnerChamfer: 1.6,
  topInnerChamferLand: 0,
  bottomOuterChamfer: 2,
  defaultBottomSeatMode: 'hole' as OpenGridStackableCylinderSeatMode,
  centerHookNominalShortSide: CENTER_HOOK_NOMINAL_SHORT_SIDE,
  centerHookNominalLongSide: CENTER_HOOK_NOMINAL_LONG_SIDE,
  centerHookClearancePerSide: CENTER_HOOK_CLEARANCE_PER_SIDE,
  centerHookWidth: CENTER_HOOK_WIDTH,
  centerHookDepth: CENTER_HOOK_DEPTH,
  centerHookHeight: CENTER_HOOK_HEIGHT,
  centerHookFullPassageDepth: CENTER_HOOK_FULL_PASSAGE_DEPTH,
  centerHookRotationClearance: CENTER_HOOK_ROTATION_CLEARANCE,
  centerHookHeadHeight: CENTER_HOOK_HEAD_HEIGHT,
  centerHookStemDiameter: CENTER_HOOK_STEM_DIAMETER,
  centerHookStemHeight: CENTER_HOOK_STEM_HEIGHT,
  centerHookHeadMinZ: -CENTER_HOOK_HEIGHT,
  centerHookHeadMaxZ: -CENTER_HOOK_STEM_HEIGHT,
  centerHookStemMinZ: -CENTER_HOOK_STEM_HEIGHT,
  centerHookStemMaxZ: 0,
  centerHookMinZ: -CENTER_HOOK_HEIGHT,
  centerHookMaxZ: 0,
  centerHookQuarterTurnDegrees: 90,
  openingDepthMin: 0,
  openingDepthMax: 500,
  openingBottomLengthMin: 1,
  openingBottomLengthMax: 300,
  openingAngleMin: 1,
  openingAngleMax: 90,
  openingCornerRadius: 2.5,
  defaultOpeningDepth: 0,
  defaultOpeningBottomLength: 1,
  defaultOpeningAngle: 90,
  openingLengthStep: 1,
  openingAngleStep: 1,
} as const

export const OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS = {
  diameter: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultDiameter,
  height: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultHeight,
  thinBottomMode: false,
  bottomPlateMode: false,
  bottomSeatMode:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultBottomSeatMode,
  honeycombMode: false,
  openingPlusXDepth:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
  openingPlusXBottomLength:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
  openingPlusXAngle:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
  openingMinusXDepth:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
  openingMinusXBottomLength:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
  openingMinusXAngle:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
  openingPlusYDepth:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
  openingPlusYBottomLength:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
  openingPlusYAngle:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
  openingMinusYDepth:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
  openingMinusYBottomLength:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
  openingMinusYAngle:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
} as const satisfies OpenGridStackableCylinderParameters

type OpenGridStackableCylinderOpeningValues = Pick<
  OpenGridStackableCylinderParameters,
  OpenGridStackableCylinderOpeningParameterKey
>

function defaultOpeningValues(): OpenGridStackableCylinderOpeningValues {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  return {
    openingPlusXDepth: configuration.defaultOpeningDepth,
    openingPlusXBottomLength: configuration.defaultOpeningBottomLength,
    openingPlusXAngle: configuration.defaultOpeningAngle,
    openingMinusXDepth: configuration.defaultOpeningDepth,
    openingMinusXBottomLength: configuration.defaultOpeningBottomLength,
    openingMinusXAngle: configuration.defaultOpeningAngle,
    openingPlusYDepth: configuration.defaultOpeningDepth,
    openingPlusYBottomLength: configuration.defaultOpeningBottomLength,
    openingPlusYAngle: configuration.defaultOpeningAngle,
    openingMinusYDepth: configuration.defaultOpeningDepth,
    openingMinusYBottomLength: configuration.defaultOpeningBottomLength,
    openingMinusYAngle: configuration.defaultOpeningAngle,
  }
}

function openingValuesFor(
  value: Record<string, unknown>,
  hasOpeningParameters: boolean,
): OpenGridStackableCylinderOpeningValues {
  if (!hasOpeningParameters) return defaultOpeningValues()

  const defaults = defaultOpeningValues()
  const values = {} as OpenGridStackableCylinderOpeningValues
  for (const key of OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS) {
    values[key] =
      typeof value[key] === 'number' ? (value[key] as number) : defaults[key]
  }
  return values
}

function openingFieldRangeFor(
  key: OpenGridStackableCylinderOpeningParameterKey,
): { min: number; max: number; unit: 'mm' | '°' } {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  if (key.endsWith('Angle')) {
    return {
      min: configuration.openingAngleMin,
      max: configuration.openingAngleMax,
      unit: '°',
    }
  }
  if (key.endsWith('BottomLength')) {
    return {
      min: configuration.openingBottomLengthMin,
      max: configuration.openingBottomLengthMax,
      unit: 'mm',
    }
  }
  return {
    min: configuration.openingDepthMin,
    max: configuration.openingDepthMax,
    unit: 'mm',
  }
}

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

export function isOpenGridStackableCylinderSeatMode(
  value: unknown,
): value is OpenGridStackableCylinderSeatMode {
  return (
    typeof value === 'string' &&
    (OPENGRID_STACKABLE_CYLINDER_SEAT_MODES as readonly string[]).includes(
      value,
    )
  )
}

function validateIntegerField(
  value: unknown,
  field: OpenGridStackableCylinderParameterKey,
  min: number,
  max: number,
  issues: OpenGridStackableCylinderValidationIssue[],
  unit = 'mm',
): void {
  const unitSuffix = unit === '°' ? ' °' : ''
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ field, messageId: 'validation.invalid' })
    return
  }
  if (!Number.isSafeInteger(value)) {
    issues.push({ field, messageId: 'validation.invalid' })
    return
  }
  if (value < min || value > max) {
    issues.push({ field, messageId: 'validation.invalid' })
  }
}

function validateBooleanField(
  value: unknown,
  field: 'thinBottomMode' | 'bottomPlateMode' | 'honeycombMode',
  issues: OpenGridStackableCylinderValidationIssue[],
): void {
  if (typeof value !== 'boolean') {
    issues.push({ field, messageId: 'validation.invalid' })
  }
}

function validateBottomSeatMode(
  value: unknown,
  issues: OpenGridStackableCylinderValidationIssue[],
): void {
  if (!isOpenGridStackableCylinderSeatMode(value)) {
    issues.push({
      field: 'bottomSeatMode',
      messageId: 'validation.invalid',
    })
  }
}

const ALL_SUPPORTED_PARAMETER_KEYS = new Set<string>([
  'diameter',
  'height',
  'thinBottomMode',
  'bottomPlateMode',
  'bottomSeatMode',
  'bottomHolesEnabled',
  'honeycombMode',
  ...OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
])

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function hasOnlySupportedParameterKeys(
  value: Record<string, unknown>,
): boolean {
  return Object.keys(value).every((key) =>
    ALL_SUPPORTED_PARAMETER_KEYS.has(key),
  )
}

function legacyBottomSeatModeFor(
  value: Record<string, unknown>,
): OpenGridStackableCylinderSeatMode {
  if (value.bottomHolesEnabled === false) return 'none'
  return 'hole'
}

function openingValidationIssuesFor(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderValidationIssue[] {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const issues: OpenGridStackableCylinderValidationIssue[] = []

  for (const direction of OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS) {
    const opening = derived.openings[direction]
    if (!opening.enabled) continue
    const keys = OPENING_KEYS_BY_DIRECTION[direction]
    if (opening.bottomLength < configuration.openingBottomLengthMin) {
      issues.push({
        field: keys.bottomLength,
        messageId: 'validation.invalid',
      })
    }
    if (opening.verticalSideHeight <= 1e-9) {
      issues.push({
        field: keys.depth,
        messageId: 'validation.invalid',
      })
    }
    if (opening.bottomZ < derived.floorThickness) {
      issues.push({
        field: keys.depth,
        messageId: 'validation.invalid',
      })
    }
    if (
      opening.upperWidth >= parameters.diameter ||
      opening.angularHalfWidth >= Math.PI / 2
    ) {
      issues.push({
        field: keys.bottomLength,
        messageId: 'validation.invalid',
      })
    }
  }

  for (const [firstDirection, secondDirection] of ADJACENT_OPENING_DIRECTIONS) {
    const first = derived.openings[firstDirection]
    const second = derived.openings[secondDirection]
    if (!first.enabled || !second.enabled) continue
    if (first.angularHalfWidth + second.angularHalfWidth >= Math.PI / 2) {
      issues.push({
        field: OPENING_KEYS_BY_DIRECTION[secondDirection].depth,
        messageId: 'validation.invalid',
      })
    }
  }

  return issues
}

export function validateOpenGridStackableCylinderParameters(
  value: unknown,
): OpenGridStackableCylinderValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        {
          field: 'parameters',
          messageId: 'validation.invalid',
        },
      ],
    }
  }

  const issues: OpenGridStackableCylinderValidationIssue[] = []
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const hasCoreParameters = hasOwn(value, 'diameter') && hasOwn(value, 'height')
  const hasSupportedShape =
    hasCoreParameters && hasOnlySupportedParameterKeys(value)
  const hasCurrentSeatMode = hasOwn(value, 'bottomSeatMode')
  const hasLegacySeatMode = hasOwn(value, 'bottomHolesEnabled')
  const hasCurrentShape = hasSupportedShape && hasCurrentSeatMode
  const hasLegacyShape = hasSupportedShape && !hasCurrentSeatMode
  const hasProfileParameters =
    hasOwn(value, 'thinBottomMode') ||
    hasOwn(value, 'bottomPlateMode') ||
    hasCurrentSeatMode ||
    hasLegacySeatMode
  const hasOpeningParameters =
    hasSupportedShape &&
    OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS.some((key) =>
      hasOwn(value, key),
    )
  if (!hasLegacyShape && !hasCurrentShape) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  validateIntegerField(
    value.diameter,
    'diameter',
    configuration.minDiameter,
    configuration.maxDiameter,
    issues,
  )
  validateIntegerField(
    value.height,
    'height',
    configuration.minHeight,
    configuration.maxHeight,
    issues,
  )

  if (hasProfileParameters && hasOwn(value, 'thinBottomMode')) {
    validateBooleanField(value.thinBottomMode, 'thinBottomMode', issues)
  }
  if (hasProfileParameters && hasOwn(value, 'bottomPlateMode')) {
    validateBooleanField(value.bottomPlateMode, 'bottomPlateMode', issues)
  }
  if (hasCurrentShape) {
    validateBottomSeatMode(value.bottomSeatMode, issues)
  } else if (
    hasLegacySeatMode &&
    typeof value.bottomHolesEnabled !== 'boolean'
  ) {
    if (!hasCurrentSeatMode) {
      issues.push({
        field: 'bottomSeatMode',
        messageId: 'validation.invalid',
      })
    }
  }
  if (hasOwn(value, 'honeycombMode')) {
    validateBooleanField(value.honeycombMode, 'honeycombMode', issues)
  }
  if (hasOpeningParameters) {
    for (const key of OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS) {
      if (!hasOwn(value, key)) continue
      const range = openingFieldRangeFor(key)
      const maximum =
        key.endsWith('Depth') &&
        typeof value.height === 'number' &&
        Number.isFinite(value.height)
          ? Math.min(range.max, value.height)
          : range.max
      const minimum = key.endsWith('BottomLength') ? 0 : range.min
      validateIntegerField(
        value[key],
        key,
        minimum,
        maximum,
        issues,
        range.unit,
      )
    }
  }
  if (
    hasProfileParameters &&
    value.thinBottomMode === true &&
    value.bottomPlateMode === true
  ) {
    issues.push({
      field: 'parameters',
      messageId: 'validation.invalid',
    })
  }

  const openingValues = openingValuesFor(value, hasOpeningParameters)
  const normalizedValue = {
    diameter: value.diameter as number,
    height: value.height as number,
    thinBottomMode:
      typeof value.thinBottomMode === 'boolean'
        ? (value.thinBottomMode as boolean)
        : false,
    bottomPlateMode:
      typeof value.bottomPlateMode === 'boolean'
        ? (value.bottomPlateMode as boolean)
        : false,
    bottomSeatMode: hasCurrentSeatMode
      ? (value.bottomSeatMode as OpenGridStackableCylinderSeatMode)
      : legacyBottomSeatModeFor(value),
    honeycombMode:
      typeof value.honeycombMode === 'boolean'
        ? (value.honeycombMode as boolean)
        : false,
    ...openingValues,
  }
  if (issues.length === 0 && hasOpeningParameters) {
    issues.push(...openingValidationIssuesFor(normalizedValue))
  }
  if (issues.length > 0) return { valid: false, issues }
  return {
    valid: true,
    value: normalizedValue,
  }
}

export function isOpenGridStackableCylinderParameters(
  value: unknown,
): value is OpenGridStackableCylinderParameters {
  return (
    isRecord(value) &&
    hasOwn(value, 'bottomSeatMode') &&
    validateOpenGridStackableCylinderParameters(value).valid
  )
}

export function boundsForOpenGridStackableCylinder(
  parameters: OpenGridStackableCylinderParameters,
) {
  const radius = parameters.diameter / 2
  let minimumZ = 0
  if (parameters.bottomSeatMode === 'integrated') {
    minimumZ = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ
  } else if (parameters.bottomSeatMode === 'center-hook') {
    minimumZ = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookMinZ
  }
  return {
    min: [-radius, -radius, minimumZ] as [number, number, number],
    max: [radius, radius, parameters.height] as [number, number, number],
  }
}

export type OpenGridStackableCylinderDerivedGeometry = {
  profile: OpenGridStackableCylinderProfile
  wallThickness: number
  floorThickness: number
  bottomHoleSectionDepth: number
  topInnerChamfer: number
  innerFloorFilletRadius: number
  radius: number
  innerRadius: number
  matingProtrusionRadius: number
  lowerFootRadius: number
  outerTransitionStartRadius: number
  outerTransitionStartZ: number
  outerTransitionEndRadius: number
  outerTransitionEndZ: number
  flatFloorRadius: number
  flatFloorZ: number
  innerRampEndRadius: number
  innerRampEndZ: number
  openings: Record<
    OpenGridStackableCylinderOpeningDirection,
    OpenGridStackableCylinderDerivedOpening
  >
}

type OpenGridStackableCylinderOpeningKeys = {
  depth:
    | 'openingPlusXDepth'
    | 'openingMinusXDepth'
    | 'openingPlusYDepth'
    | 'openingMinusYDepth'
  bottomLength:
    | 'openingPlusXBottomLength'
    | 'openingMinusXBottomLength'
    | 'openingPlusYBottomLength'
    | 'openingMinusYBottomLength'
  angle:
    | 'openingPlusXAngle'
    | 'openingMinusXAngle'
    | 'openingPlusYAngle'
    | 'openingMinusYAngle'
}

const OPENING_KEYS_BY_DIRECTION: Record<
  OpenGridStackableCylinderOpeningDirection,
  OpenGridStackableCylinderOpeningKeys
> = {
  '+X': {
    depth: 'openingPlusXDepth',
    bottomLength: 'openingPlusXBottomLength',
    angle: 'openingPlusXAngle',
  },
  '-X': {
    depth: 'openingMinusXDepth',
    bottomLength: 'openingMinusXBottomLength',
    angle: 'openingMinusXAngle',
  },
  '+Y': {
    depth: 'openingPlusYDepth',
    bottomLength: 'openingPlusYBottomLength',
    angle: 'openingPlusYAngle',
  },
  '-Y': {
    depth: 'openingMinusYDepth',
    bottomLength: 'openingMinusYBottomLength',
    angle: 'openingMinusYAngle',
  },
}

export const OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS = [
  '+X',
  '-X',
  '+Y',
  '-Y',
] as const satisfies readonly OpenGridStackableCylinderOpeningDirection[]

const ADJACENT_OPENING_DIRECTIONS: ReadonlyArray<
  readonly [
    OpenGridStackableCylinderOpeningDirection,
    OpenGridStackableCylinderOpeningDirection,
  ]
> = [
  ['+X', '+Y'],
  ['+Y', '-X'],
  ['-X', '-Y'],
  ['-Y', '+X'],
]

function profileForParameters(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderProfile {
  if (parameters.bottomPlateMode === true) return 'bottom-plate'
  if (parameters.thinBottomMode === true) return 'thin'
  return 'default'
}

function wallThicknessForProfile(
  profile: OpenGridStackableCylinderProfile,
): number {
  if (profile === 'thin') {
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinWallThickness
  }
  return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.wallThickness
}

function topInnerChamferForProfile(
  profile: OpenGridStackableCylinderProfile,
): number {
  if (profile === 'thin') {
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinTopInnerChamfer
  }
  return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.topInnerChamfer
}

function floorThicknessForProfile(
  profile: OpenGridStackableCylinderProfile,
): number {
  if (profile === 'default') {
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultFloorThickness
  }
  if (profile === 'thin') {
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinFloorThickness
  }
  return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.floorThickness
}

function bottomHoleSectionDepthForProfile(
  profile: OpenGridStackableCylinderProfile,
): number {
  if (profile === 'default') {
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultBottomHoleSectionDepth
  }
  if (profile === 'thin') {
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinBottomHoleSectionDepth
  }
  return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomHoleSectionDepth
}

function openingGeometryForDirection(
  parameters: OpenGridStackableCylinderParameters,
  direction: OpenGridStackableCylinderOpeningDirection,
): OpenGridStackableCylinderDerivedOpening {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const keys = OPENING_KEYS_BY_DIRECTION[direction]
  const depth = parameters[keys.depth]
  const bottomLength = parameters[keys.bottomLength]
  const angle = parameters[keys.angle]
  const enabled = depth > configuration.openingDepthMin
  const bottomZ = parameters.height - depth
  if (!enabled) {
    return {
      direction,
      enabled: false,
      depth,
      bottomLength,
      angle,
      bottomZ: parameters.height,
      arcRadius: 0,
      cornerRun: 0,
      cornerRise: 0,
      horizontalRun: 0,
      verticalSideHeight: 0,
      straightSideRun: 0,
      upperWidth: 0,
      angularHalfWidth: 0,
    }
  }

  const angleRadians = (angle * Math.PI) / 180
  const arcRadius = configuration.openingCornerRadius
  const cornerRun = arcRadius * Math.sin(angleRadians)
  const cornerRise = arcRadius * (1 - Math.cos(angleRadians))
  const verticalSideHeight = depth - cornerRise * 2
  const straightSideRun =
    Math.abs(Math.cos(angleRadians)) < 1e-9
      ? 0
      : verticalSideHeight / Math.tan(angleRadians)
  const horizontalRun = cornerRun * 2 + straightSideRun
  const upperWidth = bottomLength + horizontalRun * 2
  const radius = parameters.diameter / 2
  const halfWidthRatio = upperWidth / 2 / radius
  const angularHalfWidth =
    halfWidthRatio < 1 ? Math.asin(halfWidthRatio) : Math.PI / 2

  return {
    direction,
    enabled,
    depth,
    bottomLength,
    angle,
    bottomZ,
    arcRadius,
    cornerRun,
    cornerRise,
    horizontalRun,
    verticalSideHeight,
    straightSideRun,
    upperWidth,
    angularHalfWidth,
  }
}

function openingGeometryFor(
  parameters: OpenGridStackableCylinderParameters,
  floorThickness: number,
): Record<
  OpenGridStackableCylinderOpeningDirection,
  OpenGridStackableCylinderDerivedOpening
> {
  const openings = {} as Record<
    OpenGridStackableCylinderOpeningDirection,
    OpenGridStackableCylinderDerivedOpening
  >
  for (const direction of OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS) {
    openings[direction] = openingGeometryForDirection(parameters, direction)
  }
  return openings
}

export function openGridStackableCylinderDerivedGeometryFor(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderDerivedGeometry {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const profile = profileForParameters(parameters)
  const radius = parameters.diameter / 2
  const wallThickness = wallThicknessForProfile(profile)
  const topInnerChamfer = topInnerChamferForProfile(profile)
  const innerRadius = radius - wallThickness
  const matingProtrusionRadius = innerRadius - configuration.stackFitClearance
  const isBottomPlate = profile === 'bottom-plate'
  const outerTransitionStartRadius = matingProtrusionRadius
  const outerTransitionStartZ = isBottomPlate
    ? 0
    : configuration.bottomVerticalHeight
  const outerTransitionEndRadius = radius
  const outerTransitionEndZ =
    outerTransitionStartZ +
    (outerTransitionEndRadius - outerTransitionStartRadius)
  const floorThickness = floorThicknessForProfile(profile)
  const bottomHoleSectionDepth = bottomHoleSectionDepthForProfile(profile)
  const innerFloorFilletRadius =
    profile === 'thin' ? 0 : configuration.innerFloorFilletRadius
  const innerRampEndRadius = innerRadius
  const innerRampStartRadius =
    outerTransitionStartRadius - wallThickness * Math.SQRT2
  const innerRampEndZ =
    profile === 'thin'
      ? outerTransitionStartZ + (innerRadius - innerRampStartRadius)
      : floorThickness + innerFloorFilletRadius
  const flatFloorZ = floorThickness
  const flatFloorRadius =
    profile === 'thin'
      ? innerRampEndRadius - (innerRampEndZ - flatFloorZ)
      : innerRampEndRadius - innerFloorFilletRadius
  const lowerFootRadius = isBottomPlate
    ? matingProtrusionRadius
    : matingProtrusionRadius - configuration.bottomFootBevel

  return {
    profile,
    wallThickness,
    floorThickness,
    bottomHoleSectionDepth,
    topInnerChamfer,
    innerFloorFilletRadius,
    radius,
    innerRadius,
    matingProtrusionRadius,
    lowerFootRadius,
    outerTransitionStartRadius,
    outerTransitionStartZ,
    outerTransitionEndRadius,
    outerTransitionEndZ,
    flatFloorRadius,
    flatFloorZ,
    innerRampEndRadius,
    innerRampEndZ,
    openings: openingGeometryFor(parameters, floorThickness),
  }
}

function largestIntegerStrictlyBelow(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.ceil(value) - 1
}

export function openGridStackableCylinderOpeningBottomLengthMaximumFor(
  parameters: OpenGridStackableCylinderParameters,
  direction: OpenGridStackableCylinderOpeningDirection,
): number {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const opening = derived.openings[direction]
  if (!opening.enabled) return configuration.openingBottomLengthMax
  if (opening.verticalSideHeight <= 1e-9) {
    return configuration.openingBottomLengthMin
  }

  let maximum = Math.min(
    configuration.openingBottomLengthMax,
    largestIntegerStrictlyBelow(
      parameters.diameter - opening.horizontalRun * 2,
    ),
  )

  for (const [firstDirection, secondDirection] of ADJACENT_OPENING_DIRECTIONS) {
    let neighborDirection: OpenGridStackableCylinderOpeningDirection | null =
      null
    if (firstDirection === direction) neighborDirection = secondDirection
    if (secondDirection === direction) neighborDirection = firstDirection
    if (!neighborDirection) continue

    const neighbor = derived.openings[neighborDirection]
    if (!neighbor.enabled) continue
    const remainingAngle = Math.PI / 2 - neighbor.angularHalfWidth
    if (remainingAngle <= 0) return configuration.openingBottomLengthMin

    const upperWidthLimit = parameters.diameter * Math.sin(remainingAngle)
    const neighboringMaximum = largestIntegerStrictlyBelow(
      upperWidthLimit - opening.horizontalRun * 2,
    )
    maximum = Math.min(maximum, neighboringMaximum)
  }

  return Math.max(configuration.openingBottomLengthMin, maximum)
}

export function openGridStackableCylinderOuterHoleIndexFor(
  parameters: OpenGridStackableCylinderParameters,
): number {
  if (
    parameters.bottomSeatMode === 'none' ||
    parameters.bottomSeatMode === 'center-hook'
  ) {
    return 0
  }
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const largestHoleRadius =
    Math.max(
      configuration.bottomHoleDiameter,
      configuration.innerHoleDiameter,
    ) / 2
  const outerAvailableRadius =
    derived.radius - configuration.outerEdgeClearance - largestHoleRadius
  const flatFloorAvailableRadius =
    derived.flatFloorRadius -
    configuration.flatFloorClearance -
    largestHoleRadius
  const availableRadius =
    derived.profile === 'thin'
      ? Math.min(outerAvailableRadius, flatFloorAvailableRadius)
      : outerAvailableRadius
  return Math.max(0, Math.floor(availableRadius / configuration.holeGridPitch))
}

export function openGridStackableCylinderHoleCentersFor(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderPoint2D[] {
  if (
    parameters.bottomSeatMode === 'none' ||
    parameters.bottomSeatMode === 'center-hook'
  ) {
    return []
  }
  const centers: OpenGridStackableCylinderPoint2D[] = [[0, 0]]
  const index = openGridStackableCylinderOuterHoleIndexFor(parameters)
  if (index < 1) return centers

  const offset = index * OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.holeGridPitch
  centers.push([offset, 0], [-offset, 0], [0, offset], [0, -offset])
  return centers
}

function modeSuffixFor(
  parameters: OpenGridStackableCylinderParameters,
): string {
  if (parameters.bottomPlateMode === true) return '-bottom-plate'
  if (parameters.thinBottomMode === true) return '-thin'
  return ''
}

function seatSuffixFor(
  parameters: OpenGridStackableCylinderParameters,
): string {
  return `-seats-${parameters.bottomSeatMode}`
}

function honeycombSuffixFor(
  parameters: OpenGridStackableCylinderParameters,
): string {
  return parameters.honeycombMode ? '-honeycomb' : ''
}

function openingFingerprintFor(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const openingValues = OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS.map(
    (direction) => {
      const keys = OPENING_KEYS_BY_DIRECTION[direction]
      return [
        parameters[keys.depth],
        parameters[keys.bottomLength],
        parameters[keys.angle],
      ].join('-')
    },
  )
  const hasEnabledOpening = OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS.some(
    (direction) => derived.openings[direction].enabled,
  )
  return hasEnabledOpening ? `-open-${openingValues.join('_')}` : ''
}

export function openGridStackableCylinderFileName(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const seatSuffix = seatSuffixFor(parameters)
  const honeycombSuffix = honeycombSuffixFor(parameters)
  const openingSuffix = openingFingerprintFor(parameters)
  return `opengrid-stackable-cylinder-d${parameters.diameter}-h${parameters.height}${seatSuffix}${modeSuffix}${honeycombSuffix}${openingSuffix}.step`
}

export function openGridStackableCylinderStlFileName(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const seatSuffix = seatSuffixFor(parameters)
  const honeycombSuffix = honeycombSuffixFor(parameters)
  const openingSuffix = openingFingerprintFor(parameters)
  return `opengrid-stackable-cylinder-d${parameters.diameter}-h${parameters.height}${seatSuffix}${modeSuffix}${honeycombSuffix}${openingSuffix}.stl`
}
