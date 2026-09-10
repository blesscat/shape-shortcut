import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  normalizeOpenGridLocatingSeatMode,
  type OpenGridLocatingSeatMode,
} from './opengrid-locating-assembly'

export type OpenGridStackableBoxParameterKey =
  | 'x'
  | 'y'
  | 'height'
  | 'cornerSeatMode'
  | 'fullBottomHoleGrid'
  | 'topRimMode'
  | 'bottomMode'
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

export type OpenGridStackableBoxOpeningDirection = '+X' | '-X' | '+Y' | '-Y'

export type OpenGridStackableBoxOpeningParameterKey =
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

export const OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS = [
  '+X',
  '-X',
  '+Y',
  '-Y',
] as const satisfies readonly OpenGridStackableBoxOpeningDirection[]

export const OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS = [
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
] as const satisfies readonly OpenGridStackableBoxOpeningParameterKey[]

export type OpenGridStackableBoxTopRimMode = 'stacking-rail' | 'flat-top'

export type OpenGridStackableBoxBottomMode = 'stacking' | 'thin-shell' | 'none'

export type OpenGridStackableBoxParameters = {
  x: number
  y: number
  height: number
  cornerSeatMode: OpenGridLocatingSeatMode
  fullBottomHoleGrid: boolean
  topRimMode: OpenGridStackableBoxTopRimMode
  bottomMode: OpenGridStackableBoxBottomMode
  honeycombMode: boolean
} & Record<OpenGridStackableBoxOpeningParameterKey, number>

export type OpenGridStackableBoxDerivedOpening = {
  direction: OpenGridStackableBoxOpeningDirection
  normalAxis: 'x' | 'y'
  tangentAxis: 'x' | 'y'
  normalSign: -1 | 1
  enabled: boolean
  depth: number
  bottomLength: number
  angle: number
  arcRadius: number
  cornerRun: number
  cornerRise: number
  verticalSideHeight: number
  straightSideRun: number
  bottomZ: number
  tangentSpan: number
  straightRun: number
  horizontalRun: number
  upperWidth: number
  bridgeWidth: number
}

export type OpenGridStackableBoxDerivedGeometry = {
  activeFloorTopZ: number
  activeUpperInnerRimZ: number
  activeUpperOuterEdgeZ: number
  openings: Record<
    OpenGridStackableBoxOpeningDirection,
    OpenGridStackableBoxDerivedOpening
  >
}

export type OpenGridStackableBoxValidationIssue = {
  field: OpenGridStackableBoxParameterKey | 'parameters'
  messageId: string
}

export type OpenGridStackableBoxValidation =
  | { valid: true; value: OpenGridStackableBoxParameters }
  | { valid: false; issues: OpenGridStackableBoxValidationIssue[] }

export type OpenGridStackableBoxPoint2D = [number, number]

export const OPENGRID_STACKABLE_BOX_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  gridStep: 0.5,
  workspaceMaxDimension: 500,
  defaultX: 2,
  defaultY: 2,
  defaultHeight: 20,
  defaultCornerSeatMode: 'detachable-corner-seat' as OpenGridLocatingSeatMode,
  defaultFullBottomHoleGrid: false,
  defaultTopRimMode: 'stacking-rail' as OpenGridStackableBoxTopRimMode,
  defaultBottomMode: 'stacking' as OpenGridStackableBoxBottomMode,
  defaultHoneycombMode: false,
  minX: 0.5,
  maxX: 10,
  minY: 0.5,
  maxY: 10,
  minHeight: 10,
  maxHeight: 500,
  heightSliderMax: 200,
  clearanceTotal: 0.15,
  wallThickness: 1.2,
  floorThickness: 1.2,
  bottomAssemblyHeight: 5,
  outerCornerRadius: 3.75,
  topRailOuterInset: 0.1,
  topRailHeight: 7.55,
  topRailWidth: 2,
  topRailInnerChamfer: 1.75,
  topRailInnerVerticalHeight: 1.2,
  topRailMiddleChamfer: 0.8,
  topRailOuterVerticalHeight: 1.8,
  topRailOuterChamfer: 2,
  stackingLeadIn: 1.75,
  bottomStackingLeadIn: 1.2,
  bottomFootChamferHeight: 0.8,
  bottomSupportBandHeight: 1.8,
  stackingClearance: 0.25,
  stackingBearingLand: 0.8,
  bottomGrooveDepth: 1.2,
  bottomGridSeamOpeningWidth: 1.6,
  bottomGridSeamBedOpeningWidth: 5.6,
  bottomGridSeamSupportOpeningWidth: 4,
  baseHoleDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.nominalDiameter,
  baseHoleClearance: 0.25,
  baseHoleOffset: 7,
  baseHoleBottomOpeningDiameter:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
  baseHoleTopOpeningDiameter:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
  baseHoleStepHeight: 3,
  thinShellFloorThickness: 2,
  thinShellBottomChamfer: 1.5,
  openBottomCornerPadRadius: 10.5,
  // A 45-degree top chamfer consumes wall thickness in both axes.
  flatTopRimChamfer: 1.2,
  thinShellBottomHoleStepHeight: 1,
  thinShellBottomHoleTopDepth: 1,
  bottomHoleGridPitch: OPENGRID_GRID_CONFIGURATION.halfPitch,
  bottomHoleGridEdgeOffset: 7,
  bottomGridHoleDiameter:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.assemblyOpeningDiameter,
  baseFlangeDiameter:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeDiameter,
  baseFlangeThickness:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
  baseFixtureShaftExposure:
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftExposure,
  snapReferenceShaftExposure: 3,
  socketDeduplicationDistance:
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.outerDiameter,
  openingDepthMin: 0,
  openingDepthMax: 500,
  openingBottomLengthMin: 1,
  openingBottomLengthMax: 300,
  openingAngleMin: 1,
  openingAngleMax: 90,
  openingDepthStep: 1,
  openingBottomLengthStep: 1,
  openingAngleStep: 1,
  openingCornerRadius: 2.5,
  defaultOpeningDepth: 0,
  defaultOpeningBottomLength: 1,
  defaultOpeningAngle: 90,
  openingCornerBridge: 2,
} as const

export const OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS = {
  x: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultX,
  y: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultY,
  height: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHeight,
  cornerSeatMode: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultCornerSeatMode,
  fullBottomHoleGrid:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultFullBottomHoleGrid,
  topRimMode: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultTopRimMode,
  bottomMode: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultBottomMode,
  honeycombMode: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHoneycombMode,
  openingPlusXDepth: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningDepth,
  openingPlusXBottomLength:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningBottomLength,
  openingPlusXAngle: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningAngle,
  openingMinusXDepth: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningDepth,
  openingMinusXBottomLength:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningBottomLength,
  openingMinusXAngle: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningAngle,
  openingPlusYDepth: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningDepth,
  openingPlusYBottomLength:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningBottomLength,
  openingPlusYAngle: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningAngle,
  openingMinusYDepth: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningDepth,
  openingMinusYBottomLength:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningBottomLength,
  openingMinusYAngle: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningAngle,
} as const satisfies OpenGridStackableBoxParameters

type OpenGridStackableBoxOpeningKeys = {
  depth: OpenGridStackableBoxOpeningParameterKey & `${string}Depth`
  bottomLength: OpenGridStackableBoxOpeningParameterKey &
    `${string}BottomLength`
  angle: OpenGridStackableBoxOpeningParameterKey & `${string}Angle`
}

const OPENING_KEYS_BY_DIRECTION: Record<
  OpenGridStackableBoxOpeningDirection,
  OpenGridStackableBoxOpeningKeys
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

const LEGACY_BASE_PARAMETER_KEYS = [
  'x',
  'y',
  'height',
  'cornerBottomHoles',
  'fullBottomHoleGrid',
  'basePlateMode',
  'thinShellMode',
] as const

const CURRENT_BASE_PARAMETER_KEYS = [
  'x',
  'y',
  'height',
  'cornerSeatMode',
  'fullBottomHoleGrid',
  'topRimMode',
  'bottomMode',
  'honeycombMode',
] as const

const ALL_SUPPORTED_PARAMETER_KEYS = new Set<string>([
  ...LEGACY_BASE_PARAMETER_KEYS,
  ...CURRENT_BASE_PARAMETER_KEYS,
  ...OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
])

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function hasRequiredBaseParameters(value: Record<string, unknown>): boolean {
  return (
    hasOwn(value, 'x') &&
    hasOwn(value, 'y') &&
    hasOwn(value, 'height') &&
    hasOwn(value, 'fullBottomHoleGrid') &&
    (hasOwn(value, 'basePlateMode') ||
      hasOwn(value, 'topRimMode') ||
      hasOwn(value, 'bottomMode') ||
      hasOwn(value, 'thinShellMode'))
  )
}

function hasOnlySupportedParameterKeys(
  value: Record<string, unknown>,
): boolean {
  return Object.keys(value).every((key) =>
    ALL_SUPPORTED_PARAMETER_KEYS.has(key),
  )
}

function defaultOpeningValues(): Pick<
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxOpeningParameterKey
> {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
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
): Pick<
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxOpeningParameterKey
> {
  if (!hasOpeningParameters) return defaultOpeningValues()

  const defaults = defaultOpeningValues()
  const values = {} as Pick<
    OpenGridStackableBoxParameters,
    OpenGridStackableBoxOpeningParameterKey
  >
  for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
    values[key] =
      typeof value[key] === 'number' ? (value[key] as number) : defaults[key]
  }
  return values
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHalfStep(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isSafeInteger(value * 2) &&
    Number.isInteger(value * 2)
  )
}

function validateGridAxis(
  value: unknown,
  field: 'x' | 'y',
  min: number,
  max: number,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (!isHalfStep(value)) {
    issues.push({ field, messageId: 'validation.invalid' })
    return
  }

  if (value < min || value > max) {
    issues.push({ field, messageId: 'validation.invalid' })
  }
}

function validateHeight(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ field: 'height', messageId: 'validation.invalid' })
    return
  }
  if (!Number.isSafeInteger(value)) {
    issues.push({ field: 'height', messageId: 'validation.invalid' })
    return
  }
  if (
    value < OPENGRID_STACKABLE_BOX_CONFIGURATION.minHeight ||
    value > OPENGRID_STACKABLE_BOX_CONFIGURATION.maxHeight
  ) {
    issues.push({
      field: 'height',
      messageId: 'validation.invalid',
    })
  }
}

function validateCornerSeatMode(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (normalizeOpenGridLocatingSeatMode(value) === undefined) {
    issues.push({
      field: 'cornerSeatMode',
      messageId: 'validation.invalid',
    })
  }
}

function validateFullBottomHoleGrid(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (typeof value !== 'boolean') {
    issues.push({
      field: 'fullBottomHoleGrid',
      messageId: 'validation.invalid',
    })
  }
}

function validateTopRimMode(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (
    value !== 'stacking-rail' &&
    value !== 'flat-top'
  ) {
    issues.push({
      field: 'topRimMode',
      messageId: 'validation.invalid',
    })
  }
}

function validateBottomMode(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (value !== 'stacking' && value !== 'thin-shell' && value !== 'none') {
    issues.push({
      field: 'bottomMode',
      messageId: 'validation.invalid',
    })
  }
}

function validateHoneycombMode(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (typeof value !== 'boolean') {
    issues.push({
      field: 'honeycombMode',
      messageId: 'validation.invalid',
    })
  }
}

function legacyCornerSeatModeFor(
  value: Record<string, unknown>,
): OpenGridLocatingSeatMode {
  if (value.cornerBottomHoles === false) return 'none'
  return 'detachable-corner-seat'
}

function legacyModesFor(value: Record<string, unknown>): {
  topRimMode: OpenGridStackableBoxTopRimMode
  bottomMode: OpenGridStackableBoxBottomMode
} {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (value.thinShellMode === true) {
    return { topRimMode: 'flat-top', bottomMode: 'thin-shell' }
  }
  if (value.basePlateMode === true) {
    return { topRimMode: 'stacking-rail', bottomMode: 'none' }
  }
  return {
    topRimMode: configuration.defaultTopRimMode,
    bottomMode: configuration.defaultBottomMode,
  }
}

export function openGridStackableBoxBottomDatumZFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (parameters.bottomMode === 'stacking') {
    return configuration.bottomAssemblyHeight
  }
  return configuration.thinShellFloorThickness
}

export function nominalOpenGridStackableBoxFootprintFor(
  parameters: OpenGridStackableBoxParameters,
): [number, number] {
  return [
    parameters.x * OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch -
      OPENGRID_STACKABLE_BOX_CONFIGURATION.clearanceTotal,
    parameters.y * OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch -
      OPENGRID_STACKABLE_BOX_CONFIGURATION.clearanceTotal,
  ]
}

export function openGridStackableBoxUpperInnerRimZFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  return openGridStackableBoxBottomDatumZFor(parameters) + parameters.height
}

export function externalOpenGridStackableBoxHeightFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  const railHeight =
    parameters.topRimMode === 'stacking-rail'
      ? OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight
      : 0
  return (
    openGridStackableBoxUpperInnerRimZFor(parameters) + railHeight
  )
}

export function openGridStackableBoxActiveFloorTopZFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  return openGridStackableBoxBottomDatumZFor(parameters)
}

export function openGridStackableBoxActiveUpperInnerRimZFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  return openGridStackableBoxActiveFloorTopZFor(parameters) + parameters.height
}

function tangentSpanFor(
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
): number {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  if (direction === '+X' || direction === '-X') return depth
  return width
}

function openingBridgeWidth(
  parameters: OpenGridStackableBoxParameters,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return Math.max(
    configuration.openingCornerBridge,
    configuration.wallThickness + configuration.stackingClearance,
  )
}

function openingValuesFromParameters(
  parameters: OpenGridStackableBoxParameters,
): Pick<
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxOpeningParameterKey
> {
  return openingValuesFor(
    parameters as unknown as Record<string, unknown>,
    true,
  )
}

export function openGridStackableBoxDerivedGeometryFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxDerivedGeometry {
  const activeFloorTopZ = openGridStackableBoxActiveFloorTopZFor(parameters)
  const activeUpperInnerRimZ =
    openGridStackableBoxActiveUpperInnerRimZFor(parameters)
  const activeUpperOuterEdgeZ =
    externalOpenGridStackableBoxHeightFor(parameters)
  const values = openingValuesFromParameters(parameters)
  const bridgeWidth = openingBridgeWidth(parameters)
  const openings = {} as Record<
    OpenGridStackableBoxOpeningDirection,
    OpenGridStackableBoxDerivedOpening
  >

  for (const direction of OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS) {
    const keys = OPENING_KEYS_BY_DIRECTION[direction]
    const depth = values[keys.depth]
    const bottomLength = values[keys.bottomLength]
    const angle = values[keys.angle]
    const tangentSpan = tangentSpanFor(parameters, direction)
    const straightRun = Math.max(
      0,
      tangentSpan - 2 * OPENGRID_STACKABLE_BOX_CONFIGURATION.outerCornerRadius,
    )
    const angleRadians = (angle * Math.PI) / 180
    const arcRadius =
      depth > 0 ? OPENGRID_STACKABLE_BOX_CONFIGURATION.openingCornerRadius : 0
    const cornerRun = arcRadius * Math.sin(angleRadians)
    const cornerRise = arcRadius * (1 - Math.cos(angleRadians))
    const bottomZ = activeUpperInnerRimZ - depth
    const verticalSpan = activeUpperOuterEdgeZ - bottomZ
    const verticalSideHeight = verticalSpan - 2 * cornerRise
    const straightSideRun =
      Math.abs(Math.cos(angleRadians)) < 1e-9
        ? 0
        : verticalSideHeight / Math.tan(angleRadians)
    const horizontalRun = cornerRun * 2 + straightSideRun
    const usesXNormal = direction === '+X' || direction === '-X'
    openings[direction] = {
      direction,
      normalAxis: usesXNormal ? 'x' : 'y',
      tangentAxis: usesXNormal ? 'y' : 'x',
      normalSign: direction === '+X' || direction === '+Y' ? 1 : -1,
      enabled: depth > 0,
      depth,
      bottomLength,
      angle,
      arcRadius,
      cornerRun,
      cornerRise,
      verticalSideHeight,
      straightSideRun,
      bottomZ,
      tangentSpan,
      straightRun,
      horizontalRun,
      upperWidth: bottomLength + 2 * horizontalRun,
      bridgeWidth,
    }
  }

  return {
    activeFloorTopZ,
    activeUpperInnerRimZ,
    activeUpperOuterEdgeZ,
    openings,
  }
}

export function openGridStackableBoxOpeningBottomLengthMaximumFor(
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
): number {
  const opening =
    openGridStackableBoxDerivedGeometryFor(parameters).openings[direction]
  const availableWidth = opening.straightRun - 2 * opening.bridgeWidth
  const maximum = Math.floor(availableWidth - 2 * opening.horizontalRun)
  return Math.max(
    0,
    Math.min(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.openingBottomLengthMax,
      maximum,
    ),
  )
}

function validateOpeningIntegerField(
  value: unknown,
  field: OpenGridStackableBoxOpeningParameterKey,
  min: number,
  max: number,
  unit: 'mm' | '°',
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  const unitSuffix = unit === '°' ? ' °' : ' mm'
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ field, messageId: 'validation.invalid' })
    return
  }
  if (!Number.isSafeInteger(value)) {
    issues.push({ field, messageId: 'validation.invalid' })
    return
  }
  if (value < min || value > max) {
    issues.push({
      field,
      messageId: 'validation.invalid',
    })
  }
}

function openingValidationBoundsFor(
  key: OpenGridStackableBoxOpeningParameterKey,
  height: unknown,
): { minimum: number; maximum: number; unit: 'mm' | '°' } {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (key.endsWith('Depth')) {
    const heightMaximum =
      typeof height === 'number' && Number.isFinite(height)
        ? height
        : configuration.openingDepthMax
    return {
      minimum: configuration.openingDepthMin,
      maximum: Math.min(configuration.openingDepthMax, heightMaximum),
      unit: 'mm',
    }
  }
  if (key.endsWith('BottomLength')) {
    return {
      minimum: 0,
      maximum: configuration.openingBottomLengthMax,
      unit: 'mm',
    }
  }
  return {
    minimum: configuration.openingAngleMin,
    maximum: configuration.openingAngleMax,
    unit: '°',
  }
}

function openingValidationIssuesFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxValidationIssue[] {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const issues: OpenGridStackableBoxValidationIssue[] = []

  for (const direction of OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS) {
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
    if (opening.bottomZ < derived.activeFloorTopZ - 0.0001) {
      issues.push({ field: keys.depth, messageId: 'validation.invalid' })
    }
    const maximum = openGridStackableBoxOpeningBottomLengthMaximumFor(
      parameters,
      direction,
    )
    if (opening.bottomLength > maximum) {
      issues.push({
        field: keys.bottomLength,
        messageId: 'validation.invalid',
      })
    }
    if (opening.straightRun <= 2 * opening.bridgeWidth) {
      issues.push({
        field: keys.bottomLength,
        messageId: 'validation.invalid',
      })
    }
  }

  return issues
}

export function validateOpenGridStackableBoxParameters(
  value: unknown,
): OpenGridStackableBoxValidation {
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

  const issues: OpenGridStackableBoxValidationIssue[] = []
  const hasSupportedShape =
    hasRequiredBaseParameters(value) && hasOnlySupportedParameterKeys(value)
  const hasCurrentSeatMode = hasOwn(value, 'cornerSeatMode')
  const hasLegacySeatMode = hasOwn(value, 'cornerBottomHoles')
  const hasCurrentShape = hasSupportedShape && hasCurrentSeatMode
  const hasLegacyShape = hasSupportedShape && !hasCurrentSeatMode
  const hasOpeningParameters =
    OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS.some((key) =>
      hasOwn(value, key),
    )
  if (!hasLegacyShape && !hasCurrentShape) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  validateGridAxis(
    value.x,
    'x',
    OPENGRID_STACKABLE_BOX_CONFIGURATION.minX,
    OPENGRID_STACKABLE_BOX_CONFIGURATION.maxX,
    issues,
  )
  validateGridAxis(
    value.y,
    'y',
    OPENGRID_STACKABLE_BOX_CONFIGURATION.minY,
    OPENGRID_STACKABLE_BOX_CONFIGURATION.maxY,
    issues,
  )
  validateHeight(value.height, issues)
  if (hasCurrentShape) {
    validateCornerSeatMode(value.cornerSeatMode, issues)
  } else if (
    hasLegacySeatMode &&
    typeof value.cornerBottomHoles !== 'boolean'
  ) {
    issues.push({
      field: 'cornerSeatMode',
      messageId: 'validation.invalid',
    })
  }
  validateFullBottomHoleGrid(value.fullBottomHoleGrid, issues)
  const hasCanonicalTopRimMode = hasOwn(value, 'topRimMode')
  const hasCanonicalBottomMode = hasOwn(value, 'bottomMode')
  if (hasCanonicalTopRimMode) validateTopRimMode(value.topRimMode, issues)
  if (hasCanonicalBottomMode) validateBottomMode(value.bottomMode, issues)
  if (hasOwn(value, 'honeycombMode')) {
    validateHoneycombMode(value.honeycombMode, issues)
  }

  if (hasOpeningParameters) {
    for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
      const bounds = openingValidationBoundsFor(key, value.height)
      if (hasOwn(value, key)) {
        validateOpeningIntegerField(
          value[key],
          key,
          bounds.minimum,
          bounds.maximum,
          bounds.unit,
          issues,
        )
      }
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  const legacyModes = legacyModesFor(value)
  const parameters = {
    x: value.x as number,
    y: value.y as number,
    height: value.height as number,
    cornerSeatMode: hasCurrentShape
      ? (normalizeOpenGridLocatingSeatMode(
          value.cornerSeatMode,
        ) as OpenGridLocatingSeatMode)
      : legacyCornerSeatModeFor(value),
    fullBottomHoleGrid: value.fullBottomHoleGrid as boolean,
    topRimMode: hasCanonicalTopRimMode
      ? (value.topRimMode as OpenGridStackableBoxTopRimMode)
      : legacyModes.topRimMode,
    bottomMode: hasCanonicalBottomMode
      ? (value.bottomMode as OpenGridStackableBoxBottomMode)
      : legacyModes.bottomMode,
    honeycombMode:
      typeof value.honeycombMode === 'boolean'
        ? (value.honeycombMode as boolean)
        : OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHoneycombMode,
    ...openingValuesFor(value, hasOpeningParameters),
  }
  if (parameters.bottomMode === 'none' && parameters.fullBottomHoleGrid) {
    issues.push({
      field: 'fullBottomHoleGrid',
      messageId: 'validation.invalid',
    })
  }
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  if (width > OPENGRID_STACKABLE_BOX_CONFIGURATION.workspaceMaxDimension) {
    issues.push({
      field: 'x',
      messageId: 'validation.invalid',
    })
  }
  if (depth > OPENGRID_STACKABLE_BOX_CONFIGURATION.workspaceMaxDimension) {
    issues.push({
      field: 'y',
      messageId: 'validation.invalid',
    })
  }

  if (issues.length > 0) return { valid: false, issues }
  if (hasOpeningParameters) {
    const openingIssues = openingValidationIssuesFor(parameters)
    if (openingIssues.length > 0) {
      return { valid: false, issues: openingIssues }
    }
  }
  return { valid: true, value: parameters }
}

export function isOpenGridStackableBoxParameters(
  value: unknown,
): value is OpenGridStackableBoxParameters {
  return (
    isRecord(value) &&
    hasOwn(value, 'cornerSeatMode') &&
    validateOpenGridStackableBoxParameters(value).valid
  )
}

function uniqueSocketAxisPositions(halfExtent: number): number[] {
  const offset = OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleOffset
  const candidates = [-halfExtent + offset, halfExtent - offset]
  const first = candidates[0]
  const second = candidates[1]
  if (first === undefined || second === undefined) return []
  if (
    Math.abs(second - first) <
    OPENGRID_STACKABLE_BOX_CONFIGURATION.socketDeduplicationDistance
  ) {
    return [(first + second) / 2]
  }
  return candidates
}

function uniqueGridEndpointPositions(positions: number[]): number[] {
  const first = positions[0]
  const last = positions[positions.length - 1]
  if (first === undefined || last === undefined) return []
  if (
    Math.abs(last - first) <
    OPENGRID_STACKABLE_BOX_CONFIGURATION.socketDeduplicationDistance
  ) {
    return [(first + last) / 2]
  }
  return [first, last]
}

export function nominalOpenGridStackableBoxBottomGridAxisPositionsFor(
  axisCount: number,
): number[] {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const halfCellCount = Math.round(axisCount / configuration.gridStep)
  const positionCount = Math.max(1, halfCellCount)
  const nominalAxisLength = axisCount * configuration.gridPitch
  const firstPosition =
    -nominalAxisLength / 2 + configuration.bottomHoleGridEdgeOffset

  return Array.from(
    { length: positionCount },
    (_, index) => firstPosition + index * configuration.bottomHoleGridPitch,
  )
}

export function nominalOpenGridStackableBoxBottomGridCentersFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxPoint2D[] {
  const xPositions = nominalOpenGridStackableBoxBottomGridAxisPositionsFor(
    parameters.x,
  )
  const yPositions = nominalOpenGridStackableBoxBottomGridAxisPositionsFor(
    parameters.y,
  )
  const centers: OpenGridStackableBoxPoint2D[] = []

  for (const x of xPositions) {
    for (const y of yPositions) centers.push([x, y])
  }

  return centers
}

export function openGridStackableBoxOrdinaryBottomHoleCentersFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxPoint2D[] {
  if (!parameters.fullBottomHoleGrid) return []

  const specialCenters =
    parameters.cornerSeatMode !== 'none'
      ? openGridStackableBoxSocketCentersFor(parameters)
      : []
  const gridCenters =
    nominalOpenGridStackableBoxBottomGridCentersFor(parameters)
  const pitchTolerance = 0.001

  return gridCenters.filter(
    ([x, y]) =>
      !specialCenters.some(
        ([specialX, specialY]) =>
          Math.abs(x - specialX) <= pitchTolerance &&
          Math.abs(y - specialY) <= pitchTolerance,
      ),
  )
}

export function openGridStackableBoxSocketCentersFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxPoint2D[] {
  if (parameters.cornerSeatMode === 'none') return []

  if (parameters.fullBottomHoleGrid) {
    const xPositions = uniqueGridEndpointPositions(
      nominalOpenGridStackableBoxBottomGridAxisPositionsFor(parameters.x),
    )
    const yPositions = uniqueGridEndpointPositions(
      nominalOpenGridStackableBoxBottomGridAxisPositionsFor(parameters.y),
    )
    const centers: OpenGridStackableBoxPoint2D[] = []

    for (const x of xPositions) {
      for (const y of yPositions) centers.push([x, y])
    }

    return centers
  }

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const nominalWidth = parameters.x * configuration.gridPitch
  const nominalDepth = parameters.y * configuration.gridPitch
  const xPositions = uniqueSocketAxisPositions(nominalWidth / 2)
  const yPositions = uniqueSocketAxisPositions(nominalDepth / 2)
  const centers: OpenGridStackableBoxPoint2D[] = []
  for (const x of xPositions) {
    for (const y of yPositions) centers.push([x, y])
  }
  return centers
}

export function boundsForOpenGridStackableBox(
  parameters: OpenGridStackableBoxParameters,
) {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const minimumZ =
    parameters.cornerSeatMode === 'integrated'
      ? OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ
      : 0
  return {
    min: [-width / 2, -depth / 2, minimumZ] as [number, number, number],
    max: [
      width / 2,
      depth / 2,
      externalOpenGridStackableBoxHeightFor(parameters),
    ] as [number, number, number],
  }
}

function openingFileSuffixFor(
  parameters: OpenGridStackableBoxParameters,
): string {
  const values = openingValuesFromParameters(parameters)
  const hasEnabledOpening = OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS.some(
    (direction) => {
      const depthKey = OPENING_KEYS_BY_DIRECTION[direction].depth
      return values[depthKey] > 0
    },
  )
  if (!hasEnabledOpening) return ''

  const fingerprint = OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS.map((key) =>
    String(values[key]),
  ).join('-')
  return `-open-${fingerprint}`
}

function modeSuffixFor(parameters: OpenGridStackableBoxParameters): string {
  const bottomSuffix =
    parameters.bottomMode === 'thin-shell'
      ? '-thin-shell'
      : parameters.bottomMode === 'none'
        ? '-open-bottom'
        : ''
  const topSuffix =
    parameters.topRimMode === 'flat-top' ? '-flat-top' : ''
  return `${bottomSuffix}${topSuffix}`
}

function seatSuffixFor(parameters: OpenGridStackableBoxParameters): string {
  return `-seats-${parameters.cornerSeatMode}`
}

function honeycombSuffixFor(
  parameters: OpenGridStackableBoxParameters,
): string {
  return parameters.honeycombMode ? '-honeycomb' : ''
}

export function openGridStackableBoxFileName(
  parameters: OpenGridStackableBoxParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const seatSuffix = seatSuffixFor(parameters)
  const honeycombSuffix = honeycombSuffixFor(parameters)
  return `opengrid-stackable-box-${parameters.x}x${parameters.y}-h${parameters.height}${seatSuffix}${honeycombSuffix}${openingFileSuffixFor(parameters)}${modeSuffix}.step`
}

export function openGridStackableBoxStlFileName(
  parameters: OpenGridStackableBoxParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const seatSuffix = seatSuffixFor(parameters)
  const honeycombSuffix = honeycombSuffixFor(parameters)
  return `opengrid-stackable-box-${parameters.x}x${parameters.y}-h${parameters.height}${seatSuffix}${honeycombSuffix}${openingFileSuffixFor(parameters)}${modeSuffix}.stl`
}
