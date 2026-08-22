import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
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
export type OpenGridOrganizerBoxBottomInterfaceMode =
  'corner-seat' | 'detachable-corner-seat' | 'stackable'

export type OpenGridOrganizerBoxDetachableSocketCorner =
  'upper-left' | 'upper-right' | 'lower-right' | 'lower-left'

export type OpenGridOrganizerBoxDetachableSocketPose = {
  corner: OpenGridOrganizerBoxDetachableSocketCorner
  center: OpenGridOrganizerBoxPoint2D
  rotationDegrees: 0 | 90 | 180 | 270
}

export type OpenGridOrganizerBoxDetachableIndicatorPlacement = {
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
  | 'bottomInterfaceMode'

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
  bottomInterfaceMode: OpenGridOrganizerBoxBottomInterfaceMode
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

export const OPENGRID_ORGANIZER_BOX_BOTTOM_INTERFACE_MODES = [
  'corner-seat',
  'detachable-corner-seat',
  'stackable',
] as const satisfies readonly OpenGridOrganizerBoxBottomInterfaceMode[]

export const OPENGRID_ORGANIZER_BOX_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  gridStep: 0.5,
  gridStepPitch: OPENGRID_GRID_CONFIGURATION.fullPitch * 0.5,
  workspaceMaxDimension: 500,
  clearanceTotal: 0.15,
  boundaryClearance: 7,
  interfaceFloorDatum: 5,
  defaultHoleCountX: 2,
  defaultHoleCountY: 2,
  defaultHoleSpacingMode: 'linked' as OpenGridOrganizerBoxSpacingMode,
  defaultHoleSpacing: 2,
  defaultHoleShape: 'circle' as OpenGridOrganizerBoxShape,
  defaultHoleDiameter: 20,
  defaultHoleDepth: 20,
  defaultBottomThickness: 1,
  defaultBottomInterfaceMode:
    'detachable-corner-seat' as OpenGridOrganizerBoxBottomInterfaceMode,
  minHoleCount: 1,
  maxHoleCount: 20,
  minHoleSpacing: 0.5,
  maxHoleSpacing: 300,
  minHoleDiameter: 1,
  maxHoleDiameter: 300,
  minHoleDepth: 1,
  maxHoleDepth: 500,
  minBottomThickness: 1,
  maxBottomThickness: 100,
} as const

function interfaceFloorDatumFor(
  mode: OpenGridOrganizerBoxBottomInterfaceMode,
): number {
  if (mode === 'detachable-corner-seat') {
    return OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth
  }
  return OPENGRID_ORGANIZER_BOX_CONFIGURATION.interfaceFloorDatum
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
    bottomInterfaceMode:
      OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultBottomInterfaceMode,
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
const INTERFACE_COLLISION_TOLERANCE = 0.02

type InterfaceFeatureBounds = {
  min: [number, number, number]
  max: [number, number, number]
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

function isBottomInterfaceMode(
  value: unknown,
): value is OpenGridOrganizerBoxBottomInterfaceMode {
  return (
    typeof value === 'string' &&
    (
      OPENGRID_ORGANIZER_BOX_BOTTOM_INTERFACE_MODES as readonly string[]
    ).includes(value)
  )
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

function interfaceBoundaryClearanceFor(
  mode: OpenGridOrganizerBoxBottomInterfaceMode,
): number {
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  let interfaceClearance =
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridSeamBedOpeningWidth / 2
  if (mode === 'corner-seat') {
    interfaceClearance =
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter / 2
  }
  if (mode === 'detachable-corner-seat') {
    interfaceClearance =
      OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.outerDiameter / 2
  }
  return Math.max(
    configuration.boundaryClearance,
    interfaceClearance + configuration.clearanceTotal,
  )
}

function gridCountForSpan(
  span: number,
  mode: OpenGridOrganizerBoxBottomInterfaceMode,
): number {
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  const minimumSpan = span + 2 * interfaceBoundaryClearanceFor(mode)
  const gridCount =
    Math.ceil(
      (minimumSpan - VALIDATION_TOLERANCE) / configuration.gridStepPitch,
    ) * configuration.gridStep
  return Math.max(configuration.gridStep, gridCount)
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
    basePlateMode: false,
    thinShellMode: false,
    honeycombMode: false,
  }
}

function stackableInterfaceTopZFor(): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    configuration.bottomFootChamferHeight +
    configuration.bottomSupportBandHeight +
    configuration.bottomStackingLeadIn +
    configuration.bottomGridSeamOpeningWidth / 2
  )
}

function interfaceFeatureBoundsFor(
  mode: OpenGridOrganizerBoxBottomInterfaceMode,
  gridCountX: number,
  gridCountY: number,
): InterfaceFeatureBounds[] {
  const organizerConfiguration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  const stackableConfiguration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const footprintWidth = footprintForGridCount(gridCountX)
  const footprintDepth = footprintForGridCount(gridCountY)

  if (mode === 'corner-seat') {
    const interfaceParameters = stackableInterfaceParametersFor(
      gridCountX,
      gridCountY,
    )
    const radius =
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter / 2 +
      organizerConfiguration.clearanceTotal
    return openGridStackableBoxSocketCentersFor(interfaceParameters).map(
      ([x, y]) => ({
        min: [
          x - radius,
          y - radius,
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ -
            INTERFACE_COLLISION_TOLERANCE,
        ],
        max: [x + radius, y + radius, INTERFACE_COLLISION_TOLERANCE],
      }),
    )
  }

  if (mode === 'detachable-corner-seat') {
    const interfaceParameters = stackableInterfaceParametersFor(
      gridCountX,
      gridCountY,
    )
    const radius =
      OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.outerDiameter / 2 +
      organizerConfiguration.clearanceTotal
    return openGridStackableBoxSocketCentersFor(interfaceParameters).map(
      ([x, y]) => ({
        min: [x - radius, y - radius, -INTERFACE_COLLISION_TOLERANCE],
        max: [
          x + radius,
          y + radius,
          OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth +
            INTERFACE_COLLISION_TOLERANCE,
        ],
      }),
    )
  }

  const halfOpening =
    stackableConfiguration.bottomGridSeamBedOpeningWidth / 2 +
    organizerConfiguration.clearanceTotal
  const seamTop = stackableInterfaceTopZFor()
  const features: InterfaceFeatureBounds[] = []
  for (let index = 1; index < Math.ceil(gridCountX); index += 1) {
    const position =
      -footprintWidth / 2 + index * stackableConfiguration.gridPitch
    features.push({
      min: [position - halfOpening, -footprintDepth / 2, -0.02],
      max: [position + halfOpening, footprintDepth / 2, seamTop],
    })
  }
  for (let index = 1; index < Math.ceil(gridCountY); index += 1) {
    const position =
      -footprintDepth / 2 + index * stackableConfiguration.gridPitch
    features.push({
      min: [-footprintWidth / 2, position - halfOpening, -0.02],
      max: [footprintWidth / 2, position + halfOpening, seamTop],
    })
  }
  return features
}

function intervalsOverlap(
  firstMin: number,
  firstMax: number,
  secondMin: number,
  secondMax: number,
): boolean {
  return (
    firstMin < secondMax - INTERFACE_COLLISION_TOLERANCE &&
    secondMin < firstMax - INTERFACE_COLLISION_TOLERANCE
  )
}

function cavityIntersectsInterfaceFeature(
  center: OpenGridOrganizerBoxPoint2D,
  envelope: OpenGridOrganizerBoxCavityEnvelope,
  cavityMinZ: number,
  cavityMaxZ: number,
  feature: InterfaceFeatureBounds,
): boolean {
  return (
    intervalsOverlap(
      center[0] - envelope.x / 2,
      center[0] + envelope.x / 2,
      feature.min[0],
      feature.max[0],
    ) &&
    intervalsOverlap(
      center[1] - envelope.y / 2,
      center[1] + envelope.y / 2,
      feature.min[1],
      feature.max[1],
    ) &&
    intervalsOverlap(cavityMinZ, cavityMaxZ, feature.min[2], feature.max[2])
  )
}

function layoutIntersectsBottomInterfaceFor(
  parameters: OpenGridOrganizerBoxParameters,
  gridCountX: number,
  gridCountY: number,
  envelope: OpenGridOrganizerBoxCavityEnvelope,
  centers: readonly OpenGridOrganizerBoxPoint2D[],
): boolean {
  const interfaceFeatures = interfaceFeatureBoundsFor(
    parameters.bottomInterfaceMode,
    gridCountX,
    gridCountY,
  )
  const cavityMinZ =
    interfaceFloorDatumFor(parameters.bottomInterfaceMode) +
    parameters.bottomThickness -
    INTERFACE_COLLISION_TOLERANCE
  const cavityMaxZ =
    cavityMinZ + parameters.holeDepth + 2 * INTERFACE_COLLISION_TOLERANCE
  return centers.some((center) =>
    interfaceFeatures.some((feature) =>
      cavityIntersectsInterfaceFeature(
        center,
        envelope,
        cavityMinZ,
        cavityMaxZ,
        feature,
      ),
    ),
  )
}

function gridCountsForLayout(
  parameters: OpenGridOrganizerBoxParameters,
  envelope: OpenGridOrganizerBoxCavityEnvelope,
  centers: readonly OpenGridOrganizerBoxPoint2D[],
  requiredSpan: { x: number; y: number },
): { x: number; y: number } {
  const configuration = OPENGRID_ORGANIZER_BOX_CONFIGURATION
  const minimumX = gridCountForSpan(
    requiredSpan.x,
    parameters.bottomInterfaceMode,
  )
  const minimumY = gridCountForSpan(
    requiredSpan.y,
    parameters.bottomInterfaceMode,
  )
  const maximum =
    Math.ceil(
      (configuration.workspaceMaxDimension + configuration.clearanceTotal) /
        configuration.gridPitch /
        configuration.gridStep,
    ) * configuration.gridStep

  for (let gridCountX = minimumX; gridCountX <= maximum; gridCountX += 0.5) {
    for (let gridCountY = minimumY; gridCountY <= maximum; gridCountY += 0.5) {
      if (
        !layoutIntersectsBottomInterfaceFor(
          parameters,
          gridCountX,
          gridCountY,
          envelope,
          centers,
        )
      ) {
        return { x: gridCountX, y: gridCountY }
      }
    }
  }

  return { x: minimumX, y: minimumY }
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
  const gridCounts = gridCountsForLayout(
    parameters,
    envelope,
    cavityCenters,
    requiredSpan,
  )
  const gridCountX = gridCounts.x
  const gridCountY = gridCounts.y
  const interfaceFloorDatum = interfaceFloorDatumFor(
    parameters.bottomInterfaceMode,
  )
  return {
    cavityEnvelope: envelope,
    cavityPitch: [pitchX, pitchY],
    cavityCenters,
    requiredSpan,
    minimumFootprintSpan: {
      x:
        requiredSpan.x +
        2 * interfaceBoundaryClearanceFor(parameters.bottomInterfaceMode),
      y:
        requiredSpan.y +
        2 * interfaceBoundaryClearanceFor(parameters.bottomInterfaceMode),
    },
    gridCountX,
    gridCountY,
    footprint: [
      footprintForGridCount(gridCountX),
      footprintForGridCount(gridCountY),
    ],
    interfaceFloorDatum,
    bodyHeight:
      interfaceFloorDatum + parameters.bottomThickness + parameters.holeDepth,
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
  if (parameters.bottomInterfaceMode !== 'detachable-corner-seat') return []
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  const interfaceParameters = stackableInterfaceParametersFor(
    layout.gridCountX,
    layout.gridCountY,
  )
  const centers = openGridStackableBoxSocketCentersFor(interfaceParameters)
  return [
    {
      corner: 'upper-left',
      center: detachableSocketCenterFor(centers, -1, 1),
      rotationDegrees: 0,
    },
    {
      corner: 'upper-right',
      center: detachableSocketCenterFor(centers, 1, 1),
      rotationDegrees: 90,
    },
    {
      corner: 'lower-right',
      center: detachableSocketCenterFor(centers, 1, -1),
      rotationDegrees: 180,
    },
    {
      corner: 'lower-left',
      center: detachableSocketCenterFor(centers, -1, -1),
      rotationDegrees: 270,
    },
  ]
}

function detachableIndicatorRotationFor(
  socketRotation: OpenGridOrganizerBoxDetachableSocketPose['rotationDegrees'],
): OpenGridOrganizerBoxDetachableIndicatorPlacement['rotationDegrees'] {
  const lockRotation =
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.indicator.lockRotationDegrees
  const indicatorRotation = (socketRotation + lockRotation + 180) % 360
  if (indicatorRotation === 0) return 0
  if (indicatorRotation === 90) return 90
  if (indicatorRotation === 180) return 180
  if (indicatorRotation === 270) return 270
  throw new Error('OPENGRID_ORGANIZER_BOX_INDICATOR_ROTATION_INVALID')
}

function detachableIndicatorApexDirectionFor(
  rotationDegrees: OpenGridOrganizerBoxDetachableSocketPose['rotationDegrees'],
): OpenGridOrganizerBoxPoint2D {
  if (rotationDegrees === 0) return [1, 0]
  if (rotationDegrees === 90) return [0, 1]
  if (rotationDegrees === 180) return [-1, 0]
  return [0, -1]
}

export function openGridOrganizerBoxDetachableIndicatorPlacementFor(
  pose: OpenGridOrganizerBoxDetachableSocketPose,
): OpenGridOrganizerBoxDetachableIndicatorPlacement {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const offsetFromSocket =
    configuration.female.outerDiameter / 2 +
    configuration.indicator.socketBoundaryClearance +
    configuration.indicator.radialLength / 2
  const lockRotation = ((pose.rotationDegrees +
    configuration.indicator.lockRotationDegrees) %
    360) as OpenGridOrganizerBoxDetachableSocketPose['rotationDegrees']
  const apexDirection = detachableIndicatorApexDirectionFor(lockRotation)
  const referenceArrowSign =
    pose.corner === 'upper-left' || pose.corner === 'lower-right' ? -1 : 1
  return {
    center: [
      pose.center[0] + referenceArrowSign * apexDirection[0] * offsetFromSocket,
      pose.center[1] + referenceArrowSign * apexDirection[1] * offsetFromSocket,
    ],
    rotationDegrees: detachableIndicatorRotationFor(pose.rotationDegrees),
  }
}

export function validateOpenGridOrganizerBoxParameters(
  value: unknown,
): OpenGridOrganizerBoxValidation {
  if (!isRecord(value)) return { valid: false, issues: [issue('parameters')] }

  const keys: readonly OpenGridOrganizerBoxParameterKey[] = [
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
  ]
  const issues: OpenGridOrganizerBoxValidationIssue[] = []
  if (!hasExactKeys(value, keys)) issues.push(issue('parameters'))

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
  ] as const
  for (const [field, minimum, maximum] of scalarRanges) {
    const scalar = value[field]
    if (!isFiniteNumber(scalar) || scalar < minimum || scalar > maximum) {
      issues.push(issue(field))
    }
  }

  if (!isBottomInterfaceMode(value.bottomInterfaceMode)) {
    issues.push(issue('bottomInterfaceMode'))
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters = value as unknown as OpenGridOrganizerBoxParameters
  const layout = openGridOrganizerBoxLayoutForUnchecked(parameters)
  if (parameters.bottomInterfaceMode === 'detachable-corner-seat') {
    const cavityFloor = layout.bodyHeight - parameters.holeDepth
    const socketTop = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth
    const socketRoof = cavityFloor - socketTop
    if (
      socketRoof <
      OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.minimumSocketRoof
    ) {
      issues.push(issue('bottomThickness'))
    }
  }
  const interfaceCollision = layoutIntersectsBottomInterfaceFor(
    parameters,
    layout.gridCountX,
    layout.gridCountY,
    layout.cavityEnvelope,
    layout.cavityCenters,
  )
  if (
    interfaceCollision ||
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
    parameters.bottomInterfaceMode === 'corner-seat'
      ? OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ
      : 0
  return {
    min: [-width / 2, -depth / 2, minimumZ],
    max: [width / 2, depth / 2, layout.bodyHeight],
  }
}

function numberToken(value: number): string {
  return String(value).replace('.', 'p')
}

function organizerBoxFileStem(
  parameters: OpenGridOrganizerBoxParameters,
): string {
  return [
    'opengrid-organizer-box',
    `${parameters.holeCountX}x${parameters.holeCountY}`,
    parameters.holeShape,
    `sm-${parameters.holeSpacingMode}`,
    `d${numberToken(parameters.holeDiameter)}`,
    `sx${numberToken(parameters.holeSpacingX)}`,
    `sy${numberToken(parameters.holeSpacingY)}`,
    `h${numberToken(parameters.holeDepth)}`,
    `b${numberToken(parameters.bottomThickness)}`,
    `i${parameters.bottomInterfaceMode}`,
  ].join('-')
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
