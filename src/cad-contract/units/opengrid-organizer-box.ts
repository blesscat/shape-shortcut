import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import {
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  normalizeOpenGridLocatingSeatMode,
  openGridDetachableCornerSeatSocketRotationFor,
  type OpenGridLocatingSeatMode,
} from './opengrid-locating-assembly'
import {
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from './opengrid-stackable-box'

export type OpenGridOrganizerBoxShape =
  'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon'

export type OpenGridOrganizerBoxSpacingMode = 'linked' | 'independent'
export type OpenGridOrganizerBoxBoxMode = 'normal' | 'stackable'
type OpenGridOrganizerBoxLegacyBottomInterfaceMode =
  'corner-seat' | 'detachable-corner-seat' | 'stackable'

export type OpenGridOrganizerBoxDetachableSocketCorner =
  'upper-left' | 'upper-right' | 'lower-right' | 'lower-left'

export type OpenGridOrganizerBoxDetachableSocketPose = {
  corner: OpenGridOrganizerBoxDetachableSocketCorner
  center: OpenGridOrganizerBoxPoint2D
  rotationDegrees: 0 | 90 | 180 | 270
}

export type OpenGridOrganizerBoxParameterKey =
  | 'holeCountX'
  | 'holeCountY'
  | 'holeSpacingMode'
  | 'holeSpacingX'
  | 'holeSpacingY'
  | 'holeShape'
  | 'holeDiameter'
  | 'holeDepth'
  | 'bottomThickness'
  | 'wallThickness'
  | 'cornerSeatMode'
  | 'boxMode'
  | 'stackingClearanceHeight'

export type OpenGridOrganizerBoxParameters = {
  holeCountX: number
  holeCountY: number
  holeSpacingMode: OpenGridOrganizerBoxSpacingMode
  holeSpacingX: number
  holeSpacingY: number
  holeShape: OpenGridOrganizerBoxShape
  holeDiameter: number
  holeDepth: number
  bottomThickness: number
  wallThickness: number
  cornerSeatMode: OpenGridLocatingSeatMode
  boxMode: OpenGridOrganizerBoxBoxMode
  stackingClearanceHeight: number
}

export type OpenGridOrganizerBoxPoint2D = [number, number]

export type OpenGridOrganizerBoxCavityEnvelope = {
  x: number
  y: number
}

export type OpenGridOrganizerBoxCavityEnvelopeInput = {
  shape: OpenGridOrganizerBoxShape
  diameter: number
}

export type OpenGridOrganizerBoxLayout = {
  cavityEnvelope: OpenGridOrganizerBoxCavityEnvelope
  cavityPitch: OpenGridOrganizerBoxPoint2D
  cavityCenters: OpenGridOrganizerBoxPoint2D[]
  requiredSpan: { x: number; y: number }
  minimumFootprintSpan: { x: number; y: number }
  gridCountX: number
  gridCountY: number
  footprint: [number, number]
  interfaceFloorDatum: number
  bodyHeight: number
  stacking: OpenGridOrganizerBoxStackingLayout | null
}

export type OpenGridOrganizerBoxStackingLayout = {
  riserHeight: number
  railBaseZ: number
  seatDatumZ: number
  externalTopZ: number
}

export type OpenGridOrganizerBoxValidationIssue = {
  field: OpenGridOrganizerBoxParameterKey | 'parameters'
  messageId: string
}

export type OpenGridOrganizerBoxValidation =
  | { valid: true; value: OpenGridOrganizerBoxParameters }
  | { valid: false; issues: OpenGridOrganizerBoxValidationIssue[] }

export const OPENGRID_ORGANIZER_BOX_SHAPES = [
  'circle',
  'triangle',
  'square',
  'pentagon',
  'hexagon',
] as const satisfies readonly OpenGridOrganizerBoxShape[]

export const OPENGRID_ORGANIZER_BOX_SPACING_MODES = [
  'linked',
  'independent',
] as const satisfies readonly OpenGridOrganizerBoxSpacingMode[]

export const OPENGRID_ORGANIZER_BOX_BOX_MODES = [
  'normal',
  'stackable',
] as const satisfies readonly OpenGridOrganizerBoxBoxMode[]

export const OPENGRID_ORGANIZER_BOX_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  gridStep: 0.5,
  gridStepPitch: OPENGRID_GRID_CONFIGURATION.fullPitch * 0.5,
  workspaceMaxDimension: 500,
  clearanceTotal: 0.15,
  interfaceFloorDatumNormal: 2,
  interfaceFloorDatumStackable: 5,
  defaultHoleCountX: 2,
  defaultHoleCountY: 2,
  defaultHoleSpacingMode: 'linked' as OpenGridOrganizerBoxSpacingMode,
  defaultHoleSpacing: 2,
  defaultHoleShape: 'circle' as OpenGridOrganizerBoxShape,
  defaultHoleDiameter: 20,
  defaultHoleDepth: 20,
  defaultBottomThickness: 1,
  defaultWallThickness: 2,
  defaultCornerSeatMode: 'detachable-corner-seat' as OpenGridLocatingSeatMode,
  defaultBoxMode: 'normal' as OpenGridOrganizerBoxBoxMode,
  defaultStackingClearanceHeight: 3.5,
  minimumStackingMatingDatum:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailInnerChamfer +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailInnerVerticalHeight +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance,
  minHoleCount: 1,
  maxHoleCount: 20,
  minHoleSpacing: 0.5,
  maxHoleSpacing: 300,
  minHoleDiameter: 1,
  maxHoleDiameter: 300,
  minHoleDepth: 1,
  maxHoleDepth: 500,
  minBottomThickness: 0,
  maxBottomThickness: 100,
  minWallThicknessNormal: 2,
  minWallThicknessStackable: 2.95,
  maxWallThickness: 100,
  minStackingClearanceHeight: 3.5,
  maxStackingClearanceHeight: 500,
} as const

function interfaceFloorDatumFor(
  parameters: Pick<OpenGridOrganizerBoxParameters, 'boxMode'>,
): number {
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  return parameters.boxMode === 'stackable'
    ? configuration.interfaceFloorDatumStackable
    : configuration.interfaceFloorDatumNormal
}

export const OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS: OpenGridOrganizerBoxParameters =
  {
    holeCountX: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleCountX,
    holeCountY: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleCountY,
    holeSpacingMode:
      OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleSpacingMode,
    holeSpacingX: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleSpacing,
    holeSpacingY: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleSpacing,
    holeShape: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleShape,
    holeDiameter: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleDiameter,
    holeDepth: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleDepth,
    bottomThickness:
      OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultBottomThickness,
    wallThickness: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultWallThickness,
    cornerSeatMode: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultCornerSeatMode,
    boxMode: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultBoxMode,
    stackingClearanceHeight:
      OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultStackingClearanceHeight,
  }

const POLYGON_SIDES_BY_SHAPE: Record<
  Exclude<OpenGridOrganizerBoxShape, 'circle'>,
  number
> = {
  triangle: 3,
  square: 4,
  pentagon: 5,
  hexagon: 6,
}

const VALIDATION_TOLERANCE = 1e-9

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

function isShape(value: unknown): value is OpenGridOrganizerBoxShape {
  return (
    typeof value === 'string' &&
    (OPENGRID_ORGANIZER_BOX_SHAPES as readonly string[]).includes(value)
  )
}

function isSpacingMode(
  value: unknown,
): value is OpenGridOrganizerBoxSpacingMode {
  return (
    typeof value === 'string' &&
    (OPENGRID_ORGANIZER_BOX_SPACING_MODES as readonly string[]).includes(value)
  )
}

function isBoxMode(value: unknown): value is OpenGridOrganizerBoxBoxMode {
  return (
    typeof value === 'string' &&
    (OPENGRID_ORGANIZER_BOX_BOX_MODES as readonly string[]).includes(value)
  )
}

function isCornerSeatMode(value: unknown): value is OpenGridLocatingSeatMode {
  return normalizeOpenGridLocatingSeatMode(value) === value
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPositiveInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isSafeInteger(value) && value > 0
}

function issue(
  field: OpenGridOrganizerBoxParameterKey | 'parameters',
): OpenGridOrganizerBoxValidationIssue {
  return { field, messageId: 'validation.invalid' }
}

function cavityEnvelopeFor(
  shape: OpenGridOrganizerBoxShape,
  diameter: number,
): OpenGridOrganizerBoxCavityEnvelope {
  if (shape === 'circle') return { x: diameter, y: diameter }

  const sides = POLYGON_SIDES_BY_SHAPE[shape]
  const apothem = diameter / 2
  const circumradius = apothem / Math.cos(Math.PI / sides)
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = Math.PI / 2 + Math.PI / sides + (index * 2 * Math.PI) / sides
    return [circumradius * Math.cos(angle), circumradius * Math.sin(angle)]
  })
  const xValues = points.map(([x]) => x)
  const yValues = points.map(([, y]) => y)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)

  return { x: maxX - minX, y: maxY - minY }
}

export function openGridOrganizerBoxCavityEnvelopeFor(
  input: OpenGridOrganizerBoxCavityEnvelopeInput,
): OpenGridOrganizerBoxCavityEnvelope {
  if (!isShape(input.shape) || !isFiniteNumber(input.diameter)) {
    throw new Error('OPENGRID_ORGANIZER_BOX_CAVITY_INVALID')
  }
  return cavityEnvelopeFor(input.shape, input.diameter)
}

export function openGridOrganizerBoxPolygonPointsFor(
  shape: Exclude<OpenGridOrganizerBoxShape, 'circle'>,
  diameter: number,
): OpenGridOrganizerBoxPoint2D[] {
  const sides = POLYGON_SIDES_BY_SHAPE[shape]
  const apothem = diameter / 2
  const circumradius = apothem / Math.cos(Math.PI / sides)
  return Array.from({ length: sides }, (_, index) => {
    const angle = Math.PI / 2 + Math.PI / sides + (index * 2 * Math.PI) / sides
    return [circumradius * Math.cos(angle), circumradius * Math.sin(angle)]
  })
}

function minimumWallThicknessFor(boxMode: OpenGridOrganizerBoxBoxMode): number {
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  return boxMode === 'stackable'
    ? configuration.minWallThicknessStackable
    : configuration.minWallThicknessNormal
}

function hydratableWallThicknessFor(
  boxMode: OpenGridOrganizerBoxBoxMode,
): number {
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  const minimum = minimumWallThicknessFor(boxMode)
  return (
    Math.ceil(minimum / configuration.gridStep - VALIDATION_TOLERANCE) *
    configuration.gridStep
  )
}

function gridCountForSpan(span: number, wallThickness: number): number {
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  const minimumSpan = span + 2 * wallThickness + configuration.clearanceTotal
  const gridCount =
    Math.ceil(
      (minimumSpan - VALIDATION_TOLERANCE) / configuration.gridStepPitch,
    ) * configuration.gridStep
  return Math.max(1, gridCount)
}

function footprintForGridCount(gridCount: number): number {
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  return gridCount * configuration.gridPitch - configuration.clearanceTotal
}

function centersForAxis(count: number, pitch: number): number[] {
  const first = -((count - 1) * pitch) / 2
  return Array.from({ length: count }, (_, index) => first + index * pitch)
}

function stackableInterfaceParametersFor(
  gridCountX: number,
  gridCountY: number,
): OpenGridStackableBoxParameters {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: gridCountX,
    y: gridCountY,
    cornerSeatMode: 'integrated',
    fullBottomHoleGrid: false,
    topRimMode: 'stacking-rail' as const,
    bottomMode: 'stacking' as const,
    honeycombMode: false,
  }
}

function detachableSocketPosesForGridCounts(
  gridCountX: number,
  gridCountY: number,
): OpenGridOrganizerBoxDetachableSocketPose[] {
  const interfaceParameters = stackableInterfaceParametersFor(
    gridCountX,
    gridCountY,
  )
  const centers = openGridStackableBoxSocketCentersFor(interfaceParameters)
  const upperLeft = detachableSocketCenterFor(centers, -1, 1)
  const upperRight = detachableSocketCenterFor(centers, 1, 1)
  const lowerRight = detachableSocketCenterFor(centers, 1, -1)
  const lowerLeft = detachableSocketCenterFor(centers, -1, -1)
  return [
    {
      corner: 'upper-left',
      center: upperLeft,
      rotationDegrees: openGridDetachableCornerSeatSocketRotationFor(upperLeft),
    },
    {
      corner: 'upper-right',
      center: upperRight,
      rotationDegrees:
        openGridDetachableCornerSeatSocketRotationFor(upperRight),
    },
    {
      corner: 'lower-right',
      center: lowerRight,
      rotationDegrees:
        openGridDetachableCornerSeatSocketRotationFor(lowerRight),
    },
    {
      corner: 'lower-left',
      center: lowerLeft,
      rotationDegrees: openGridDetachableCornerSeatSocketRotationFor(lowerLeft),
    },
  ]
}

function stackingLayoutFor(
  parameters: Pick<
    OpenGridOrganizerBoxParameters,
    'boxMode' | 'stackingClearanceHeight'
  >,
  bodyHeight: number,
): OpenGridOrganizerBoxStackingLayout | null {
  if (parameters.boxMode !== 'stackable') return null

  const matingDatum =
    OPENGRID_ORGANIZER_BOX_CONFIGURATION.minimumStackingMatingDatum
  const riserHeight = parameters.stackingClearanceHeight - matingDatum
  const railBaseZ = bodyHeight + riserHeight
  return {
    riserHeight,
    railBaseZ,
    seatDatumZ: railBaseZ + matingDatum,
    externalTopZ:
      railBaseZ + OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight,
  }
}

export function openGridOrganizerBoxLayoutFor(
  parameters: OpenGridOrganizerBoxParameters,
): OpenGridOrganizerBoxLayout {
  const validation = validateOpenGridOrganizerBoxParameters(parameters)
  if (!validation.valid) throw new Error('OPENGRID_ORGANIZER_BOX_INVALID_INPUT')
  return openGridOrganizerBoxLayoutForUnchecked(parameters)
}

function layoutExceedsWorkspace(
  parameters: OpenGridOrganizerBoxParameters,
): boolean {
  const layout = openGridOrganizerBoxLayoutForUnchecked(parameters)
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  return (
    layout.footprint[0] > configuration.workspaceMaxDimension ||
    layout.footprint[1] > configuration.workspaceMaxDimension
  )
}

function openGridOrganizerBoxLayoutForUnchecked(
  parameters: OpenGridOrganizerBoxParameters,
): OpenGridOrganizerBoxLayout {
  const envelope = cavityEnvelopeFor(
    parameters.holeShape,
    parameters.holeDiameter,
  )
  const pitchX = envelope.x + parameters.holeSpacingX
  const pitchY = envelope.y + parameters.holeSpacingY
  const centersX = centersForAxis(parameters.holeCountX, pitchX)
  const centersY = centersForAxis(parameters.holeCountY, pitchY)
  const cavityCenters: OpenGridOrganizerBoxPoint2D[] = []
  for (const x of centersX) {
    for (const y of centersY) cavityCenters.push([x, y])
  }
  const requiredSpan = {
    x: envelope.x + (parameters.holeCountX - 1) * pitchX,
    y: envelope.y + (parameters.holeCountY - 1) * pitchY,
  }
  const gridCountX = gridCountForSpan(requiredSpan.x, parameters.wallThickness)
  const gridCountY = gridCountForSpan(requiredSpan.y, parameters.wallThickness)
  const interfaceFloorDatum = interfaceFloorDatumFor(parameters)
  const bodyHeight =
    interfaceFloorDatum + parameters.bottomThickness + parameters.holeDepth
  const stacking = stackingLayoutFor(parameters, bodyHeight)
  return {
    cavityEnvelope: envelope,
    cavityPitch: [pitchX, pitchY],
    cavityCenters,
    requiredSpan,
    minimumFootprintSpan: {
      x: requiredSpan.x + 2 * parameters.wallThickness,
      y: requiredSpan.y + 2 * parameters.wallThickness,
    },
    gridCountX,
    gridCountY,
    footprint: [
      footprintForGridCount(gridCountX),
      footprintForGridCount(gridCountY),
    ],
    interfaceFloorDatum,
    bodyHeight,
    stacking,
  }
}

function detachableSocketCenterFor(
  centers: readonly OpenGridOrganizerBoxPoint2D[],
  xSign: -1 | 1,
  ySign: -1 | 1,
): OpenGridOrganizerBoxPoint2D {
  const center = centers.find(
    ([x, y]) => Math.sign(x) === xSign && Math.sign(y) === ySign,
  )
  if (!center) throw new Error('OPENGRID_ORGANIZER_BOX_SOCKET_LAYOUT_INVALID')
  return center
}

export function openGridOrganizerBoxDetachableSocketPosesFor(
  parameters: OpenGridOrganizerBoxParameters,
): OpenGridOrganizerBoxDetachableSocketPose[] {
  if (parameters.cornerSeatMode !== 'detachable-corner-seat') return []
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  return detachableSocketPosesForGridCounts(
    layout.gridCountX,
    layout.gridCountY,
  )
}

const CANONICAL_PARAMETER_KEYS: readonly OpenGridOrganizerBoxParameterKey[] = [
  'holeCountX',
  'holeCountY',
  'holeSpacingMode',
  'holeSpacingX',
  'holeSpacingY',
  'holeShape',
  'holeDiameter',
  'holeDepth',
  'bottomThickness',
  'wallThickness',
  'cornerSeatMode',
  'boxMode',
  'stackingClearanceHeight',
]

const LEGACY_PARAMETER_KEYS = [
  'holeCountX',
  'holeCountY',
  'holeSpacingMode',
  'holeSpacingX',
  'holeSpacingY',
  'holeShape',
  'holeDiameter',
  'holeDepth',
  'bottomThickness',
  'bottomInterfaceMode',
] as const

function isLegacyBottomInterfaceMode(
  value: unknown,
): value is OpenGridOrganizerBoxLegacyBottomInterfaceMode {
  return (
    value === 'corner-seat' ||
    value === 'detachable-corner-seat' ||
    value === 'stackable'
  )
}

function modesForLegacyBottomInterface(
  mode: OpenGridOrganizerBoxLegacyBottomInterfaceMode,
): Pick<OpenGridOrganizerBoxParameters, 'cornerSeatMode' | 'boxMode'> {
  if (mode === 'corner-seat') {
    return { cornerSeatMode: 'integrated', boxMode: 'normal' }
  }
  if (mode === 'detachable-corner-seat') {
    return { cornerSeatMode: 'detachable-corner-seat', boxMode: 'normal' }
  }
  return { cornerSeatMode: 'none', boxMode: 'stackable' }
}

export function normalizeOpenGridOrganizerBoxParameters(
  value: unknown,
): unknown {
  if (!isRecord(value)) return value
  if (!hasExactKeys(value, LEGACY_PARAMETER_KEYS)) return value
  if (!isLegacyBottomInterfaceMode(value.bottomInterfaceMode)) return value

  const { bottomInterfaceMode, ...withoutLegacyMode } = value
  const modes = modesForLegacyBottomInterface(bottomInterfaceMode)
  return {
    ...withoutLegacyMode,
    ...modes,
    stackingClearanceHeight:
      OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultStackingClearanceHeight,
    wallThickness: hydratableWallThicknessFor(modes.boxMode),
  }
}

export function validateOpenGridOrganizerBoxParameters(
  value: unknown,
): OpenGridOrganizerBoxValidation {
  if (!isRecord(value)) return { valid: false, issues: [issue('parameters')] }

  const issues: OpenGridOrganizerBoxValidationIssue[] = []
  if (!hasExactKeys(value, CANONICAL_PARAMETER_KEYS)) {
    issues.push(issue('parameters'))
  }

  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  for (const field of ['holeCountX', 'holeCountY'] as const) {
    const count = value[field]
    if (!isPositiveInteger(count)) {
      issues.push(issue(field))
      continue
    }
    if (
      count < configuration.minHoleCount ||
      count > configuration.maxHoleCount
    ) {
      issues.push(issue(field))
    }
  }

  const spacingMode = value.holeSpacingMode
  if (!isSpacingMode(spacingMode)) issues.push(issue('holeSpacingMode'))

  for (const field of ['holeSpacingX', 'holeSpacingY'] as const) {
    const spacing = value[field]
    if (!isFiniteNumber(spacing)) {
      issues.push(issue(field))
      continue
    }
    if (
      spacing < configuration.minHoleSpacing ||
      spacing > configuration.maxHoleSpacing
    ) {
      issues.push(issue(field))
    }
  }

  if (
    spacingMode === 'linked' &&
    isFiniteNumber(value.holeSpacingX) &&
    isFiniteNumber(value.holeSpacingY) &&
    Math.abs(value.holeSpacingX - value.holeSpacingY) > VALIDATION_TOLERANCE
  ) {
    issues.push(issue('holeSpacingY'))
  }

  if (!isShape(value.holeShape)) issues.push(issue('holeShape'))

  const scalarRanges = [
    [
      'holeDiameter',
      configuration.minHoleDiameter,
      configuration.maxHoleDiameter,
    ],
    ['holeDepth', configuration.minHoleDepth, configuration.maxHoleDepth],
    [
      'bottomThickness',
      configuration.minBottomThickness,
      configuration.maxBottomThickness,
    ],
    [
      'wallThickness',
      configuration.minWallThicknessNormal,
      configuration.maxWallThickness,
    ],
    [
      'stackingClearanceHeight',
      configuration.minStackingClearanceHeight,
      configuration.maxStackingClearanceHeight,
    ],
  ] as const
  for (const [field, minimum, maximum] of scalarRanges) {
    const scalar = value[field]
    if (!isFiniteNumber(scalar) || scalar < minimum || scalar > maximum) {
      issues.push(issue(field))
    }
  }

  if (
    isFiniteNumber(value.stackingClearanceHeight) &&
    Math.abs(
      value.stackingClearanceHeight / configuration.gridStep -
        Math.round(value.stackingClearanceHeight / configuration.gridStep),
    ) > VALIDATION_TOLERANCE
  ) {
    issues.push(issue('stackingClearanceHeight'))
  }

  if (!isCornerSeatMode(value.cornerSeatMode)) {
    issues.push(issue('cornerSeatMode'))
  }
  if (!isBoxMode(value.boxMode)) {
    issues.push(issue('boxMode'))
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters = value as unknown as OpenGridOrganizerBoxParameters
  if (
    parameters.boxMode === 'stackable' &&
    parameters.wallThickness + VALIDATION_TOLERANCE <
      minimumWallThicknessFor('stackable')
  ) {
    issues.push(issue('wallThickness'))
  }
  if (
    parameters.holeSpacingX <= 0 ||
    parameters.holeSpacingY <= 0 ||
    layoutExceedsWorkspace(parameters)
  ) {
    issues.push(issue('parameters'))
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function isOpenGridOrganizerBoxParameters(
  value: unknown,
): value is OpenGridOrganizerBoxParameters {
  return validateOpenGridOrganizerBoxParameters(value).valid
}

export function boundsForOpenGridOrganizerBox(
  parameters: OpenGridOrganizerBoxParameters,
): { min: [number, number, number]; max: [number, number, number] } {
  const validation = validateOpenGridOrganizerBoxParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  const layout = openGridOrganizerBoxLayoutForUnchecked(parameters)
  const [width, depth] = layout.footprint
  const minimumZ =
    parameters.cornerSeatMode === 'integrated'
      ? OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ
      : 0
  const maximumZ = layout.stacking?.externalTopZ ?? layout.bodyHeight
  return {
    min: [-width / 2, -depth / 2, minimumZ],
    max: [width / 2, depth / 2, maximumZ],
  }
}

function numberToken(value: number): string {
  return String(value).replace('.', 'p')
}

function organizerBoxFileStem(
  parameters: OpenGridOrganizerBoxParameters,
): string {
  const tokens = [
    'opengrid-organizer-box',
    `${parameters.holeCountX}x${parameters.holeCountY}`,
    parameters.holeShape,
    `sm-${parameters.holeSpacingMode}`,
    `d${numberToken(parameters.holeDiameter)}`,
    `sx${numberToken(parameters.holeSpacingX)}`,
    `sy${numberToken(parameters.holeSpacingY)}`,
    `h${numberToken(parameters.holeDepth)}`,
    `wt${numberToken(parameters.wallThickness)}`,
    `b${numberToken(parameters.bottomThickness)}`,
    `seats-${parameters.cornerSeatMode}`,
    `body-${parameters.boxMode}`,
  ]
  if (parameters.boxMode === 'stackable') {
    tokens.push(`z${numberToken(parameters.stackingClearanceHeight)}`)
  }
  return tokens.join('-')
}

export function openGridOrganizerBoxFileName(
  parameters: OpenGridOrganizerBoxParameters,
): string {
  if (!isOpenGridOrganizerBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  return `${organizerBoxFileStem(parameters)}.step`
}

export function openGridOrganizerBoxStlFileName(
  parameters: OpenGridOrganizerBoxParameters,
): string {
  if (!isOpenGridOrganizerBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  return `${organizerBoxFileStem(parameters)}.stl`
}
