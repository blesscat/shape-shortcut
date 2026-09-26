import {
  isOpenGridLabelGridUnits,
  openGridLabelSlotLayoutFor,
  openGridLabelSlotPointsFor,
} from './opengrid-label-shared'
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

export type OpenGridOpenConnectOrganizerShape =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'pentagon'
  | 'hexagon'
  | 'rectangle'
  | 'ellipse'

export type OpenGridOpenConnectOrganizerSpacingMode = 'linked' | 'independent'

export type OpenGridOpenConnectOrganizerParameterKey =
  | OpenConnectAlignmentKey
  | 'holeCountX'
  | 'holeCountY'
  | 'holeSpacingMode'
  | 'holeSpacingX'
  | 'holeSpacingY'
  | 'holeShape'
  | 'holeDiameter'
  | 'holeWidth'
  | 'holeHeight'
  | 'holeCornerRadius'
  | 'holeDepth'
  | 'bottomThickness'
  | 'edgeThickness'
  | 'tiltAngle'
  | 'topRimEnabled'
  | 'topRimHeight'
  | 'labelSlotEnabled'
  | 'labelGridUnits'

export type OpenGridOpenConnectOrganizerParameters =
  OpenConnectAlignmentParameters & {
    holeCountX: number
    holeCountY: number
    holeSpacingMode: OpenGridOpenConnectOrganizerSpacingMode
    holeSpacingX: number
    holeSpacingY: number
    holeShape: OpenGridOpenConnectOrganizerShape
    holeDiameter: number
    holeWidth: number
    holeHeight: number
    holeCornerRadius: number
    holeDepth: number
    bottomThickness: number
    edgeThickness: number
    tiltAngle: number
    topRimEnabled: boolean
    topRimHeight: number
    labelSlotEnabled: boolean
    labelGridUnits: number
  }

export type OpenGridOpenConnectOrganizerPoint2D = [number, number]
export type OpenGridOpenConnectOrganizerPoint3D = [number, number, number]

export type OpenGridOpenConnectOrganizerCavityEnvelope = {
  x: number
  y: number
}

export type OpenGridOpenConnectOrganizerLayout = {
  cavityEnvelope: OpenGridOpenConnectOrganizerCavityEnvelope
  cavityPitch: OpenGridOpenConnectOrganizerPoint2D
  cavityCenters: OpenGridOpenConnectOrganizerPoint2D[]
  requiredSpan: { x: number; y: number }
  bodyWidth: number
  bodyDepth: number
  bodyThickness: number
  frontCornerRadius: number
  connectorColumns: number
  connectorRows: number
  rearInterfaceWidth: number
  rearInterfaceHeight: number
  installedBodyPivotZ: number
}

export type OpenGridOpenConnectOrganizerValidationIssue = {
  field: OpenGridOpenConnectOrganizerParameterKey | 'parameters'
  messageId: string
}

export type OpenGridOpenConnectOrganizerValidation =
  | { valid: true; value: OpenGridOpenConnectOrganizerParameters }
  | { valid: false; issues: OpenGridOpenConnectOrganizerValidationIssue[] }

export const OPENGRID_OPENCONNECT_ORGANIZER_SHAPES = [
  'circle',
  'triangle',
  'square',
  'pentagon',
  'hexagon',
  'rectangle',
  'ellipse',
] as const satisfies readonly OpenGridOpenConnectOrganizerShape[]

export const OPENGRID_OPENCONNECT_ORGANIZER_SPACING_MODES = [
  'linked',
  'independent',
] as const satisfies readonly OpenGridOpenConnectOrganizerSpacingMode[]

export const OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  rearThickness: 3.2,
  frontCornerRadius: 2.5,
  frontCornerRearStraightLength: 0.05,
  fusionOverlap: 0.05,
  minimumInterfaceSeparation: 0.5,
  workspaceMaxDimension: 500,
  minHoleCount: 1,
  maxHoleCount: 20,
  minHoleSpacing: 0.5,
  maxHoleSpacing: 300,
  minHoleDiameter: 1,
  maxHoleDiameter: 300,
  minHoleWidth: 1,
  maxHoleWidth: 300,
  minHoleHeight: 1,
  maxHoleHeight: 300,
  minHoleCornerRadius: 0,
  minHoleDepth: 1,
  maxHoleDepth: 500,
  minBottomThickness: 0,
  maxBottomThickness: 100,
  minEdgeThickness: 0.4,
  maxEdgeThickness: 100,
  minTiltAngle: 0,
  maxTiltAngle: 45,
  tiltAngleStep: 1,
  defaultHoleCountX: 2,
  defaultHoleCountY: 2,
  defaultHoleSpacingMode: 'linked' as OpenGridOpenConnectOrganizerSpacingMode,
  defaultHoleSpacing: 1,
  defaultHoleShape: 'circle' as OpenGridOpenConnectOrganizerShape,
  defaultHoleDiameter: 20,
  defaultHoleWidth: 20,
  defaultHoleHeight: 20,
  defaultHoleCornerRadius: 0,
  defaultHoleDepth: 28,
  defaultBottomThickness: 1,
  defaultEdgeThickness: 1,
  defaultTiltAngle: 15,
  defaultTopRimEnabled: false,
  defaultTopRimHeight: 2,
  minTopRimHeight: 1,
  defaultLabelSlotEnabled: false,
  defaultLabelGridUnits: 3,
} as const

export const OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS: OpenGridOpenConnectOrganizerParameters =
  {
    ...OPENCONNECT_ALIGNMENT_DEFAULTS,
    holeCountX: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleCountX,
    holeCountY: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleCountY,
    holeSpacingMode:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleSpacingMode,
    holeSpacingX:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleSpacing,
    holeSpacingY:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleSpacing,
    holeShape: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleShape,
    holeDiameter:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleDiameter,
    holeWidth: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleWidth,
    holeHeight: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleHeight,
    holeCornerRadius:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleCornerRadius,
    holeDepth: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleDepth,
    bottomThickness:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultBottomThickness,
    edgeThickness:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultEdgeThickness,
    tiltAngle: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultTiltAngle,
    topRimEnabled:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultTopRimEnabled,
    topRimHeight:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultTopRimHeight,
    labelSlotEnabled:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultLabelSlotEnabled,
    labelGridUnits:
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultLabelGridUnits,
  }

const PARAMETER_KEYS: readonly OpenGridOpenConnectOrganizerParameterKey[] = [
  'holeCountX',
  'holeCountY',
  'holeSpacingMode',
  'holeSpacingX',
  'holeSpacingY',
  'holeShape',
  'holeDiameter',
  'holeWidth',
  'holeHeight',
  'holeCornerRadius',
  'holeDepth',
  'bottomThickness',
  'edgeThickness',
  'tiltAngle',
  'topRimEnabled',
  'topRimHeight',
  'labelSlotEnabled',
  'labelGridUnits',
]

const POLYGON_SIDES: Record<
  Exclude<
    OpenGridOpenConnectOrganizerShape,
    'circle' | 'rectangle' | 'ellipse'
  >,
  number
> = {
  triangle: 3,
  square: 4,
  pentagon: 5,
  hexagon: 6,
}

const VALIDATION_TOLERANCE = 1e-9
const SQUARE_CORNER_CLEARANCE_FACTOR = 2 + Math.SQRT2

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>): boolean {
  return (
    Object.keys(value).every((key) =>
      [...PARAMETER_KEYS, ...OPENCONNECT_ALIGNMENT_KEYS].includes(
        key as OpenGridOpenConnectOrganizerParameterKey,
      ),
    ) &&
    PARAMETER_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    )
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFiniteInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return isFiniteNumber(value) && value >= minimum && value <= maximum
}

function isSafeIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return isFiniteInRange(value, minimum, maximum) && Number.isSafeInteger(value)
}

function isStepInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  step: number,
): value is number {
  if (!isFiniteInRange(value, minimum, maximum)) return false
  const stepCount = (value - minimum) / step
  return Number.isSafeInteger(stepCount)
}

function isShape(value: unknown): value is OpenGridOpenConnectOrganizerShape {
  return (
    typeof value === 'string' &&
    (OPENGRID_OPENCONNECT_ORGANIZER_SHAPES as readonly string[]).includes(value)
  )
}

function isSpacingMode(
  value: unknown,
): value is OpenGridOpenConnectOrganizerSpacingMode {
  return (
    typeof value === 'string' &&
    (
      OPENGRID_OPENCONNECT_ORGANIZER_SPACING_MODES as readonly string[]
    ).includes(value)
  )
}

function issue(
  field: OpenGridOpenConnectOrganizerParameterKey | 'parameters',
): OpenGridOpenConnectOrganizerValidationIssue {
  return { field, messageId: 'validation.invalid' }
}

export type OpenGridOpenConnectOrganizerPolygonShape = Exclude<
  OpenGridOpenConnectOrganizerShape,
  'circle' | 'rectangle' | 'ellipse'
>

export function openGridOpenConnectOrganizerPolygonPointsFor(
  shape: OpenGridOpenConnectOrganizerPolygonShape,
  diameter: number,
): OpenGridOpenConnectOrganizerPoint2D[] {
  const sides = POLYGON_SIDES[shape]
  const apothem = diameter / 2
  const circumradius = apothem / Math.cos(Math.PI / sides)
  return Array.from({ length: sides }, (_, index) => {
    const angle = Math.PI / 2 + Math.PI / sides + (index * 2 * Math.PI) / sides
    return [circumradius * Math.cos(angle), circumradius * Math.sin(angle)]
  })
}

export function openGridOpenConnectOrganizerCavityEnvelopeFor(input: {
  shape: OpenGridOpenConnectOrganizerShape
  diameter: number
  width: number
  height: number
}): OpenGridOpenConnectOrganizerCavityEnvelope {
  if (
    !isShape(input.shape) ||
    !isFiniteNumber(input.diameter) ||
    !isFiniteNumber(input.width) ||
    !isFiniteNumber(input.height)
  ) {
    throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_CAVITY_INVALID')
  }
  if (input.shape === 'rectangle' || input.shape === 'ellipse') {
    return { x: input.width, y: input.height }
  }
  if (input.shape === 'circle') {
    return { x: input.diameter, y: input.diameter }
  }

  const points = openGridOpenConnectOrganizerPolygonPointsFor(
    input.shape,
    input.diameter,
  )
  const xValues = points.map(([x]) => x)
  const yValues = points.map(([, y]) => y)
  return {
    x: Math.max(...xValues) - Math.min(...xValues),
    y: Math.max(...yValues) - Math.min(...yValues),
  }
}

function centersForAxis(count: number, pitch: number): number[] {
  const first = -((count - 1) * pitch) / 2
  return Array.from({ length: count }, (_, index) => first + index * pitch)
}

function completedGridCountFor(span: number): number {
  const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
  return Math.max(1, Math.floor(span / configuration.gridPitch))
}

function layoutForUnchecked(
  parameters: OpenGridOpenConnectOrganizerParameters,
): OpenGridOpenConnectOrganizerLayout {
  const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
  const cavityEnvelope = openGridOpenConnectOrganizerCavityEnvelopeFor({
    shape: parameters.holeShape,
    diameter: parameters.holeDiameter,
    width: parameters.holeWidth,
    height: parameters.holeHeight,
  })
  const pitchX = cavityEnvelope.x + parameters.holeSpacingX
  const pitchY = cavityEnvelope.y + parameters.holeSpacingY
  const centersX = centersForAxis(parameters.holeCountX, pitchX)
  const centersY = centersForAxis(parameters.holeCountY, pitchY)
  const cavityCenters: OpenGridOpenConnectOrganizerPoint2D[] = []
  for (const x of centersX) {
    for (const y of centersY) cavityCenters.push([x, y])
  }

  const requiredSpan = {
    x: cavityEnvelope.x + (parameters.holeCountX - 1) * pitchX,
    y: cavityEnvelope.y + (parameters.holeCountY - 1) * pitchY,
  }
  const bodyThickness = parameters.holeDepth + parameters.bottomThickness
  const bodyWidth = Math.max(
    configuration.gridPitch,
    requiredSpan.x + 2 * parameters.edgeThickness,
  )
  const bodyDepth = requiredSpan.y + 2 * parameters.edgeThickness
  const maximumSafeFrontCornerRadius =
    parameters.edgeThickness * SQUARE_CORNER_CLEARANCE_FACTOR
  const maximumFrontCornerRadiusForBody =
    bodyDepth - configuration.frontCornerRearStraightLength
  const frontCornerRadius = Math.min(
    configuration.frontCornerRadius,
    maximumSafeFrontCornerRadius,
    maximumFrontCornerRadiusForBody,
  )
  const rearInterfaceWidth = bodyWidth
  const rearInterfaceHeight = Math.max(configuration.gridPitch, bodyThickness)
  const connectorColumns = completedGridCountFor(rearInterfaceWidth)
  const connectorRows = completedGridCountFor(rearInterfaceHeight)
  const radians = (parameters.tiltAngle * Math.PI) / 180

  return {
    cavityEnvelope,
    cavityPitch: [pitchX, pitchY],
    cavityCenters,
    requiredSpan,
    bodyWidth,
    bodyDepth,
    bodyThickness,
    frontCornerRadius,
    connectorColumns,
    connectorRows,
    rearInterfaceWidth,
    rearInterfaceHeight,
    installedBodyPivotZ: -configuration.rearThickness * Math.tan(radians),
  }
}

export function openGridOpenConnectOrganizerLayoutFor(
  parameters: OpenGridOpenConnectOrganizerParameters,
): OpenGridOpenConnectOrganizerLayout {
  const validation = validateOpenGridOpenConnectOrganizerParameters(parameters)
  if (!validation.valid) {
    throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_INVALID_INPUT')
  }
  return layoutForUnchecked(validation.value)
}

export function openGridOpenConnectOrganizerTiltAxisFor(
  tiltAngle: number,
): OpenGridOpenConnectOrganizerPoint3D {
  const radians = (tiltAngle * Math.PI) / 180
  return [0, -Math.sin(radians), Math.cos(radians)]
}

export function openGridOpenConnectOrganizerSlotOriginsFor(
  parameters: OpenGridOpenConnectOrganizerParameters,
): OpenGridOpenConnectOrganizerPoint3D[] {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
  const offset = openConnectGridOffsets(
    layout.rearInterfaceWidth,
    layout.rearInterfaceHeight,
    layout.connectorColumns,
    layout.connectorRows,
    configuration.gridPitch,
    parameters,
  )
  return Array.from({ length: layout.connectorRows }, (_, row) =>
    Array.from(
      { length: layout.connectorColumns },
      (_, column) =>
        [
          offset.x + (column + 0.5) * configuration.gridPitch,
          configuration.rearThickness,
          offset.z +
            (layout.connectorRows - row - 0.5) * configuration.gridPitch,
        ] as OpenGridOpenConnectOrganizerPoint3D,
    ),
  ).flat()
}

function printInterfaceCornersFor(
  parameters: OpenGridOpenConnectOrganizerParameters,
  layout: OpenGridOpenConnectOrganizerLayout,
): OpenGridOpenConnectOrganizerPoint3D[] {
  const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
  const radians = (parameters.tiltAngle * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const pivotZ = layout.installedBodyPivotZ
  const corners: OpenGridOpenConnectOrganizerPoint3D[] = []
  for (const x of [
    -layout.rearInterfaceWidth / 2,
    layout.rearInterfaceWidth / 2,
  ]) {
    for (const y of [0, configuration.rearThickness]) {
      for (const z of [0, layout.rearInterfaceHeight]) {
        const relativeZ = z - pivotZ
        corners.push([
          x,
          y * cosine + relativeZ * sine,
          -y * sine + relativeZ * cosine,
        ])
      }
    }
  }
  return corners
}

function boundsForPoints(
  points: readonly OpenGridOpenConnectOrganizerPoint3D[],
) {
  return {
    min: [
      Math.min(...points.map(([x]) => x)),
      Math.min(...points.map(([, y]) => y)),
      Math.min(...points.map(([, , z]) => z)),
    ] as OpenGridOpenConnectOrganizerPoint3D,
    max: [
      Math.max(...points.map(([x]) => x)),
      Math.max(...points.map(([, y]) => y)),
      Math.max(...points.map(([, , z]) => z)),
    ] as OpenGridOpenConnectOrganizerPoint3D,
  }
}

function installedBoundsForUnchecked(
  parameters: OpenGridOpenConnectOrganizerParameters,
) {
  const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
  const layout = layoutForUnchecked(parameters)
  const radians = (parameters.tiltAngle * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const points: OpenGridOpenConnectOrganizerPoint3D[] = []

  for (const x of [-layout.bodyWidth / 2, layout.bodyWidth / 2]) {
    for (const y of [-layout.bodyDepth, 0]) {
      for (const z of [0, layout.bodyThickness]) {
        points.push([
          x,
          y * cosine - z * sine,
          y * sine + z * cosine + layout.installedBodyPivotZ,
        ])
      }
    }
  }

  for (const x of [
    -layout.rearInterfaceWidth / 2,
    layout.rearInterfaceWidth / 2,
  ]) {
    for (const y of [0, configuration.rearThickness]) {
      for (const z of [0, layout.rearInterfaceHeight]) points.push([x, y, z])
    }
  }

  const upperY = -layout.bodyThickness * sine
  const upperZ = layout.installedBodyPivotZ + layout.bodyThickness * cosine
  const transitionProfile: OpenGridOpenConnectOrganizerPoint2D[] = [
    [0, layout.installedBodyPivotZ],
    [configuration.rearThickness, 0],
    [
      configuration.rearThickness,
      Math.max(upperZ, configuration.fusionOverlap),
    ],
    [upperY - configuration.fusionOverlap, upperZ],
  ]
  for (const x of [-layout.bodyWidth / 2, layout.bodyWidth / 2]) {
    for (const [y, z] of transitionProfile) points.push([x, y, z])
  }

  if (parameters.labelSlotEnabled) {
    const slot = openGridLabelSlotLayoutFor(layout, parameters.labelGridUnits)
    for (const [x, y, z] of openGridLabelSlotPointsFor(slot)) {
      points.push([
        x,
        y * cosine - z * sine,
        y * sine + z * cosine + layout.installedBodyPivotZ,
      ])
    }
  }

  return boundsForPoints(points)
}

export function installedBoundsForOpenGridOpenConnectOrganizer(
  parameters: OpenGridOpenConnectOrganizerParameters,
) {
  const validation = validateOpenGridOpenConnectOrganizerParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer')
  }
  return installedBoundsForUnchecked(validation.value)
}

function boundsForUnchecked(
  parameters: OpenGridOpenConnectOrganizerParameters,
) {
  const layout = layoutForUnchecked(parameters)
  const bodyCorners: OpenGridOpenConnectOrganizerPoint3D[] = []
  for (const x of [-layout.bodyWidth / 2, layout.bodyWidth / 2]) {
    for (const y of [-layout.bodyDepth, 0]) {
      for (const z of [0, layout.bodyThickness]) bodyCorners.push([x, y, z])
    }
  }
  const points = [
    ...bodyCorners,
    ...printInterfaceCornersFor(parameters, layout),
  ]
  if (parameters.labelSlotEnabled) {
    points.push(
      ...openGridLabelSlotPointsFor(
        openGridLabelSlotLayoutFor(layout, parameters.labelGridUnits),
      ),
    )
  }
  return boundsForPoints(points)
}

export function boundsForOpenGridOpenConnectOrganizer(
  parameters: OpenGridOpenConnectOrganizerParameters,
) {
  const validation = validateOpenGridOpenConnectOrganizerParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer')
  }
  return boundsForUnchecked(validation.value)
}

function layoutExceedsWorkspace(
  parameters: OpenGridOpenConnectOrganizerParameters,
): boolean {
  const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
  const layout = layoutForUnchecked(parameters)
  const coordinateBounds = [
    boundsForUnchecked(parameters),
    installedBoundsForUnchecked(parameters),
  ]
  const derivedDimensions = [
    layout.requiredSpan.x,
    layout.requiredSpan.y,
    layout.bodyWidth,
    layout.bodyDepth,
    layout.bodyThickness,
    layout.rearInterfaceWidth,
    layout.rearInterfaceHeight,
  ]
  return (
    derivedDimensions.some(
      (dimension) => dimension > configuration.workspaceMaxDimension,
    ) ||
    coordinateBounds.some((bounds) =>
      bounds.max.some(
        (maximum, index) =>
          maximum - bounds.min[index]! > configuration.workspaceMaxDimension,
      ),
    )
  )
}

export function validateOpenGridOpenConnectOrganizerParameters(
  value: unknown,
): OpenGridOpenConnectOrganizerValidation {
  if (!isRecord(value)) {
    return { valid: false, issues: [issue('parameters')] }
  }

  if (
    !Object.hasOwn(value, 'labelSlotEnabled') &&
    !Object.hasOwn(value, 'labelGridUnits')
  ) {
    value = { ...value, labelSlotEnabled: false, labelGridUnits: 3 }
  }
  if (!isRecord(value)) return { valid: false, issues: [issue('parameters')] }
  const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
  const issues: OpenGridOpenConnectOrganizerValidationIssue[] =
    openConnectAlignmentIssues(value)
  if (!hasExactKeys(value)) issues.push(issue('parameters'))
  if (typeof value.labelSlotEnabled !== 'boolean')
    issues.push(issue('labelSlotEnabled'))
  if (!isOpenGridLabelGridUnits(value.labelGridUnits))
    issues.push(issue('labelGridUnits'))

  for (const field of ['holeCountX', 'holeCountY'] as const) {
    if (
      !isSafeIntegerInRange(
        value[field],
        configuration.minHoleCount,
        configuration.maxHoleCount,
      )
    ) {
      issues.push(issue(field))
    }
  }

  if (!isSpacingMode(value.holeSpacingMode)) {
    issues.push(issue('holeSpacingMode'))
  }
  for (const field of ['holeSpacingX', 'holeSpacingY'] as const) {
    if (
      !isFiniteInRange(
        value[field],
        configuration.minHoleSpacing,
        configuration.maxHoleSpacing,
      )
    ) {
      issues.push(issue(field))
    }
  }
  if (
    value.holeSpacingMode === 'linked' &&
    isFiniteNumber(value.holeSpacingX) &&
    isFiniteNumber(value.holeSpacingY) &&
    Math.abs(value.holeSpacingX - value.holeSpacingY) > VALIDATION_TOLERANCE
  ) {
    issues.push(issue('holeSpacingY'))
  }

  if (!isShape(value.holeShape)) issues.push(issue('holeShape'))
  if (
    !isFiniteInRange(
      value.holeDiameter,
      configuration.minHoleDiameter,
      configuration.maxHoleDiameter,
    )
  ) {
    issues.push(issue('holeDiameter'))
  }
  for (const field of ['holeWidth', 'holeHeight'] as const) {
    if (
      !isFiniteInRange(
        value[field],
        configuration.minHoleWidth,
        configuration.maxHoleWidth,
      )
    ) {
      issues.push(issue(field))
    }
  }
  if (
    !isFiniteNumber(value.holeCornerRadius) ||
    value.holeCornerRadius < configuration.minHoleCornerRadius ||
    (isFiniteNumber(value.holeWidth) &&
      isFiniteNumber(value.holeHeight) &&
      value.holeCornerRadius - VALIDATION_TOLERANCE >
        Math.min(value.holeWidth, value.holeHeight) / 2)
  ) {
    issues.push(issue('holeCornerRadius'))
  }
  if (
    !isFiniteInRange(
      value.holeDepth,
      configuration.minHoleDepth,
      configuration.maxHoleDepth,
    )
  ) {
    issues.push(issue('holeDepth'))
  }
  if (
    !isFiniteInRange(
      value.bottomThickness,
      configuration.minBottomThickness,
      configuration.maxBottomThickness,
    )
  ) {
    issues.push(issue('bottomThickness'))
  }
  if (
    !isFiniteInRange(
      value.edgeThickness,
      configuration.minEdgeThickness,
      configuration.maxEdgeThickness,
    )
  ) {
    issues.push(issue('edgeThickness'))
  }
  if (
    !isStepInRange(
      value.tiltAngle,
      configuration.minTiltAngle,
      configuration.maxTiltAngle,
      configuration.tiltAngleStep,
    )
  ) {
    issues.push(issue('tiltAngle'))
  }
  const hasTopRimEnabledField = Object.prototype.hasOwnProperty.call(
    value,
    'topRimEnabled',
  )
  const hasTopRimHeightField = Object.prototype.hasOwnProperty.call(
    value,
    'topRimHeight',
  )
  if (hasTopRimEnabledField && typeof value.topRimEnabled !== 'boolean') {
    issues.push(issue('topRimEnabled'))
  }
  if (
    hasTopRimHeightField &&
    (typeof value.topRimHeight !== 'number' ||
      !Number.isSafeInteger(value.topRimHeight))
  ) {
    issues.push(issue('topRimHeight'))
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters = {
    ...value,
    ...normalizedOpenConnectAlignment(value as OpenConnectAlignmentParameters),
  } as OpenGridOpenConnectOrganizerParameters
  const bodyThickness = parameters.holeDepth + parameters.bottomThickness
  const maximumTopRimHeight = Math.max(
    configuration.minTopRimHeight,
    Math.floor(bodyThickness / 2),
  )
  const topRimHeight = hasTopRimHeightField
    ? (value.topRimHeight as number)
    : configuration.defaultTopRimHeight
  if (
    (hasTopRimEnabledField ? value.topRimEnabled : false) === true &&
    (topRimHeight < configuration.minTopRimHeight ||
      topRimHeight > maximumTopRimHeight)
  ) {
    issues.push(issue('topRimHeight'))
  }
  if (issues.length > 0) return { valid: false, issues }

  const normalizedParameters: OpenGridOpenConnectOrganizerParameters = {
    ...parameters,
    topRimEnabled: hasTopRimEnabledField
      ? (value.topRimEnabled as boolean)
      : configuration.defaultTopRimEnabled,
    topRimHeight,
  }
  if (normalizedParameters.labelSlotEnabled) {
    const slot = openGridLabelSlotLayoutFor(
      layoutForUnchecked(normalizedParameters),
      normalizedParameters.labelGridUnits,
    )
    if (!slot.fits) {
      return {
        valid: false,
        issues: [
          {
            field: 'labelGridUnits',
            messageId: 'validation.labelSlotDoesNotFit',
          },
        ],
      }
    }
  }
  if (layoutExceedsWorkspace(normalizedParameters)) {
    return { valid: false, issues: [issue('parameters')] }
  }
  return { valid: true, value: normalizedParameters }
}

export function isOpenGridOpenConnectOrganizerParameters(
  value: unknown,
): value is OpenGridOpenConnectOrganizerParameters {
  return validateOpenGridOpenConnectOrganizerParameters(value).valid
}

function fileStem(parameters: OpenGridOpenConnectOrganizerParameters): string {
  const shapeToken =
    parameters.holeShape === 'rectangle'
      ? `rectangle-w${parameters.holeWidth}-h${parameters.holeHeight}-r${parameters.holeCornerRadius}`
      : parameters.holeShape === 'ellipse'
        ? `ellipse-w${parameters.holeWidth}-h${parameters.holeHeight}`
        : parameters.holeShape
  return [
    'opengrid-openconnect-organizer',
    `x${parameters.holeCountX}`,
    `y${parameters.holeCountY}`,
    `sm-${parameters.holeSpacingMode}`,
    `sx${parameters.holeSpacingX}`,
    `sy${parameters.holeSpacingY}`,
    shapeToken,
    parameters.holeShape === 'rectangle' || parameters.holeShape === 'ellipse'
      ? null
      : `d${parameters.holeDiameter}`,
    `h${parameters.holeDepth}`,
    `b${parameters.bottomThickness}`,
    `e${parameters.edgeThickness}`,
    `a${parameters.tiltAngle}`,
    parameters.labelSlotEnabled ? `label${parameters.labelGridUnits}` : null,
  ]
    .filter((token): token is string => token !== null)
    .join('-')
}

export function openGridOpenConnectOrganizerFileName(
  parameters: OpenGridOpenConnectOrganizerParameters,
): string {
  if (!isOpenGridOpenConnectOrganizerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer')
  }
  return `${fileStem(parameters)}.step`
}

export function openGridOpenConnectOrganizerStlFileName(
  parameters: OpenGridOpenConnectOrganizerParameters,
): string {
  return openGridOpenConnectOrganizerFileName(parameters).replace(
    /\.step$/,
    '.stl',
  )
}

export function openGridOpenConnectOrganizerThreeMfFileName(
  parameters: OpenGridOpenConnectOrganizerParameters,
): string | null {
  if (!parameters.topRimEnabled) return null
  return openGridOpenConnectOrganizerFileName(parameters)
    .replace(/\.step$/, '')
    .concat(`-rim${parameters.topRimHeight}.3mf`)
}
