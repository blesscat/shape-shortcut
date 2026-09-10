import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  normalizeOpenGridLocatingSeatMode,
  type OpenGridLocatingSeatMode,
} from './opengrid-locating-assembly'

export type OpenGridStackableCylinderParameterKey =
  | 'innerDiameter'
  | 'height'
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

export type OpenGridStackableCylinderProfile = 'thin' | 'bottom-plate'

export type OpenGridStackableCylinderParameters = {
  innerDiameter: number
  height: number
  bottomPlateMode: boolean
  bottomSeatMode: OpenGridLocatingSeatMode
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

export const OPENGRID_STACKABLE_CYLINDER_CONFIGURATION = {
  defaultInnerDiameter: 56,
  minInnerDiameter: 20,
  maxInnerDiameter: 300,
  defaultHeight: 20,
  minHeight: 10,
  maxHeight: 500,
  heightSliderMax: 200,
  inputStep: 1,
  wallThickness: 2,
  thinWallThickness: 1.6,
  thinFloorThickness: 2,
  floorThickness: 3,
  bottomHoleDiameter:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
  innerHoleDiameter:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
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
  defaultBottomSeatMode: 'detachable-corner-seat' as OpenGridLocatingSeatMode,
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
  innerDiameter: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultInnerDiameter,
  height: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultHeight,
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
  field: 'bottomPlateMode' | 'honeycombMode',
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
  if (normalizeOpenGridLocatingSeatMode(value) === undefined) {
    issues.push({
      field: 'bottomSeatMode',
      messageId: 'validation.invalid',
    })
  }
}

const ALL_SUPPORTED_PARAMETER_KEYS = new Set<string>([
  'innerDiameter',
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
): OpenGridLocatingSeatMode {
  if (value.bottomHolesEnabled === false) return 'none'
  return 'detachable-corner-seat'
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
      opening.upperWidth >= derived.radius * 2 ||
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

export function legacyInnerDiameterFor(
  value: Record<string, unknown>,
): number | undefined {
  const legacyOuterDiameter = value.diameter
  let outerDiameter = Number.NaN
  if (typeof legacyOuterDiameter === 'number') {
    outerDiameter = legacyOuterDiameter
  } else if (
    typeof legacyOuterDiameter === 'string' &&
    legacyOuterDiameter.trim() !== ''
  ) {
    outerDiameter = Number(legacyOuterDiameter)
  }
  if (!Number.isFinite(outerDiameter)) {
    return undefined
  }
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  return Math.round(outerDiameter - configuration.thinWallThickness * 2)
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
  const hasCanonicalInnerDiameter = hasOwn(value, 'innerDiameter')
  const hasLegacyOuterDiameter = hasOwn(value, 'diameter')
  const hasCoreParameters =
    (hasCanonicalInnerDiameter || hasLegacyOuterDiameter) &&
    hasOwn(value, 'height')
  const hasSupportedShape =
    hasCoreParameters && hasOnlySupportedParameterKeys(value)
  const hasCurrentSeatMode = hasOwn(value, 'bottomSeatMode')
  const hasLegacySeatMode = hasOwn(value, 'bottomHolesEnabled')
  const hasCurrentShape = hasSupportedShape && hasCurrentSeatMode
  const hasLegacyShape = hasSupportedShape && !hasCurrentSeatMode
  const hasProfileParameters =
    hasOwn(value, 'bottomPlateMode') || hasCurrentSeatMode || hasLegacySeatMode
  const hasOpeningParameters =
    hasSupportedShape &&
    OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS.some((key) =>
      hasOwn(value, key),
    )
  if (!hasLegacyShape && !hasCurrentShape) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  const legacyInnerDiameter = hasLegacyOuterDiameter
    ? legacyInnerDiameterFor(value)
    : undefined
  if (hasCanonicalInnerDiameter) {
    validateIntegerField(
      value.innerDiameter,
      'innerDiameter',
      configuration.minInnerDiameter,
      configuration.maxInnerDiameter,
      issues,
    )
  } else if (legacyInnerDiameter !== undefined) {
    validateIntegerField(
      legacyInnerDiameter,
      'innerDiameter',
      configuration.minInnerDiameter,
      configuration.maxInnerDiameter,
      issues,
    )
  } else if (hasLegacyOuterDiameter) {
    issues.push({ field: 'innerDiameter', messageId: 'validation.invalid' })
  }
  validateIntegerField(
    value.height,
    'height',
    configuration.minHeight,
    configuration.maxHeight,
    issues,
  )

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
  const openingValues = openingValuesFor(value, hasOpeningParameters)
  const normalizedValue = {
    innerDiameter:
      typeof value.innerDiameter === 'number'
        ? (value.innerDiameter as number)
        : (legacyInnerDiameter as number),
    height: value.height as number,
    bottomPlateMode:
      typeof value.bottomPlateMode === 'boolean'
        ? (value.bottomPlateMode as boolean)
        : false,
    bottomSeatMode: hasCurrentSeatMode
      ? (normalizeOpenGridLocatingSeatMode(
          value.bottomSeatMode,
        ) as OpenGridLocatingSeatMode)
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
  const radius = derivedOuterRadiusFor(parameters)
  const minimumZ =
    parameters.bottomSeatMode === 'integrated'
      ? OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ
      : 0
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
  return 'thin'
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
  if (profile === 'thin') {
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinFloorThickness
  }
  return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.floorThickness
}

function bottomHoleSectionDepthForProfile(
  profile: OpenGridStackableCylinderProfile,
): number {
  if (profile === 'thin') {
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinBottomHoleSectionDepth
  }
  return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomHoleSectionDepth
}

function derivedOuterRadiusFor(
  parameters: OpenGridStackableCylinderParameters,
): number {
  return (
    parameters.innerDiameter / 2 +
    wallThicknessForProfile(profileForParameters(parameters))
  )
}

function openingGeometryForDirection(
  parameters: OpenGridStackableCylinderParameters,
  direction: OpenGridStackableCylinderOpeningDirection,
  outerRadius: number,
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
  const radius = outerRadius
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
  outerRadius: number,
): Record<
  OpenGridStackableCylinderOpeningDirection,
  OpenGridStackableCylinderDerivedOpening
> {
  const openings = {} as Record<
    OpenGridStackableCylinderOpeningDirection,
    OpenGridStackableCylinderDerivedOpening
  >
  for (const direction of OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS) {
    openings[direction] = openingGeometryForDirection(
      parameters,
      direction,
      outerRadius,
    )
  }
  return openings
}

export function openGridStackableCylinderDerivedGeometryFor(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderDerivedGeometry {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const profile = profileForParameters(parameters)
  const wallThickness = wallThicknessForProfile(profile)
  const innerRadius = parameters.innerDiameter / 2
  const radius = innerRadius + wallThickness
  const topInnerChamfer = topInnerChamferForProfile(profile)
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
    openings: openingGeometryFor(parameters, floorThickness, radius),
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
    largestIntegerStrictlyBelow(derived.radius * 2 - opening.horizontalRun * 2),
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

    const upperWidthLimit = derived.radius * 2 * Math.sin(remainingAngle)
    const neighboringMaximum = largestIntegerStrictlyBelow(
      upperWidthLimit - opening.horizontalRun * 2,
    )
    maximum = Math.min(maximum, neighboringMaximum)
  }

  return Math.max(configuration.openingBottomLengthMin, maximum)
}

function locatingFeatureRadiusFor(
  parameters: OpenGridStackableCylinderParameters,
  largestHoleRadius: number,
): number {
  if (parameters.bottomSeatMode === 'detachable-corner-seat') {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    return configuration.female.outerDiameter / 2 + 0.15
  }
  return largestHoleRadius
}

export function openGridStackableCylinderOuterHoleIndexFor(
  parameters: OpenGridStackableCylinderParameters,
): number {
  if (parameters.bottomSeatMode === 'none') return 0
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const largestHoleRadius =
    Math.max(
      configuration.bottomHoleDiameter,
      configuration.innerHoleDiameter,
    ) / 2
  const locatingFeatureRadius = locatingFeatureRadiusFor(
    parameters,
    largestHoleRadius,
  )
  const outerAvailableRadius =
    derived.radius - configuration.outerEdgeClearance - locatingFeatureRadius
  const flatFloorAvailableRadius =
    derived.flatFloorRadius -
    configuration.flatFloorClearance -
    locatingFeatureRadius
  const availableRadius =
    derived.profile === 'thin'
      ? Math.min(outerAvailableRadius, flatFloorAvailableRadius)
      : outerAvailableRadius
  return Math.max(0, Math.floor(availableRadius / configuration.holeGridPitch))
}

export function openGridStackableCylinderHoleCentersFor(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderPoint2D[] {
  if (parameters.bottomSeatMode === 'none') return []
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
  return '-thin'
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
  return `opengrid-stackable-cylinder-d${parameters.innerDiameter}-h${parameters.height}${seatSuffix}${modeSuffix}${honeycombSuffix}${openingSuffix}.step`
}

export function openGridStackableCylinderStlFileName(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const seatSuffix = seatSuffixFor(parameters)
  const honeycombSuffix = honeycombSuffixFor(parameters)
  const openingSuffix = openingFingerprintFor(parameters)
  return `opengrid-stackable-cylinder-d${parameters.innerDiameter}-h${parameters.height}${seatSuffix}${modeSuffix}${honeycombSuffix}${openingSuffix}.stl`
}
