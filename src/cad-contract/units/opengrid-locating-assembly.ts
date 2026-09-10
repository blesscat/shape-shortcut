const NOMINAL_DIAMETER = 5
const ASSEMBLY_INCREMENT = 0.05
const TEST_SHAFT_DIAMETER = 5
const TEST_FLANGE_DIAMETER = 7
const TEST_SHAFT_EXTERIOR_ALLOWANCE = 1
const INTEGRATED_SEAT_DIAMETER = NOMINAL_DIAMETER
const INTEGRATED_SEAT_HEIGHT = 3.8
const INTEGRATED_SEAT_BOTTOM_CHAMFER = 0.2
const BOTTOM_EDGE_FILLET_RADIUS = 0.5
const DETACHABLE_SEAT_BODY_DIAMETER = 5
const DETACHABLE_SEAT_BODY_HEIGHT = 3.8
const DETACHABLE_SEAT_LEAD_IN_HEIGHT = 0.2
const DETACHABLE_SEAT_WEAR_HEIGHT = 0.15
const DETACHABLE_SEAT_TOTAL_HEIGHT = 5.3
const DETACHABLE_SEAT_TAPER_TOP_Z = 5.15
const DETACHABLE_SEAT_HEAD_TOP_TRIM = 0.1
const DETACHABLE_SEAT_EFFECTIVE_TOTAL_HEIGHT =
  DETACHABLE_SEAT_TOTAL_HEIGHT - DETACHABLE_SEAT_HEAD_TOP_TRIM
const DETACHABLE_SEAT_NOMINAL_VOLUME = 89.3026235581
const DETACHABLE_SEAT_KEY_WIDTH = 1.96
const DETACHABLE_SEAT_HEAD_START_LENGTH = 4.24
const DETACHABLE_SEAT_HEAD_MAX_LENGTH = 6.64
const DETACHABLE_SEAT_HEAD_BOUND_XY = 3.321716
const DETACHABLE_SEAT_INDICATOR_WIDTH = 0.5
const DETACHABLE_SEAT_INDICATOR_RADIAL_LENGTH = 3
const DETACHABLE_SEAT_INDICATOR_DEPTH = 0.4
const DETACHABLE_SEAT_INDICATOR = {
  width: DETACHABLE_SEAT_INDICATOR_WIDTH,
  radialLength: DETACHABLE_SEAT_INDICATOR_RADIAL_LENGTH,
  depth: DETACHABLE_SEAT_INDICATOR_DEPTH,
} as const
const DETACHABLE_HOLDER_OUTER_DIAMETER = 11
const DETACHABLE_HOLDER_DEPTH = 1.5
const DETACHABLE_HOLDER_SOURCE_MIN_Z = 3.8
const DETACHABLE_HOLDER_SOURCE_MAX_Z = 5.3
const DETACHABLE_HOLDER_SOURCE_NOMINAL_VOLUME = 106.453536642
const DETACHABLE_HOLDER_POCKET_SIDE_CLEARANCE = 0.02
const DETACHABLE_HOLDER_HOST_OVERLAP = 0.01

export const OPENGRID_LOCATING_SEAT_MODES = [
  'none',
  'detachable-corner-seat',
  'integrated',
] as const

export const OPENGRID_LEGACY_LOCATING_SEAT_MODE = 'hole' as const

export type OpenGridLocatingSeatMode =
  (typeof OPENGRID_LOCATING_SEAT_MODES)[number]

export type OpenGridDetachableCornerSeatRotation = 0 | 90 | 180 | 270
export type OpenGridDetachableCornerSeatPoint2D = [number, number]

export function normalizeOpenGridLocatingSeatMode(
  value: unknown,
): OpenGridLocatingSeatMode | undefined {
  if (value === OPENGRID_LEGACY_LOCATING_SEAT_MODE) {
    return 'detachable-corner-seat'
  }
  if (
    typeof value === 'string' &&
    (OPENGRID_LOCATING_SEAT_MODES as readonly string[]).includes(value)
  ) {
    return value as OpenGridLocatingSeatMode
  }
  return undefined
}

export const OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION = {
  nominalDiameter: NOMINAL_DIAMETER,
  assemblyIncrement: ASSEMBLY_INCREMENT,
  assemblyOpeningDiameter: NOMINAL_DIAMETER + ASSEMBLY_INCREMENT,
  testShaftDiameter: TEST_SHAFT_DIAMETER,
  shaftOpeningDiameter: TEST_SHAFT_DIAMETER,
  testFlangeDiameter: TEST_FLANGE_DIAMETER,
  retainingOpeningDiameter: TEST_FLANGE_DIAMETER + ASSEMBLY_INCREMENT,
  testFlangeHeight: 0.8,
  testShaftExposure: TEST_SHAFT_EXTERIOR_ALLOWANCE,
  integratedSeatDiameter: INTEGRATED_SEAT_DIAMETER,
  integratedSeatHeight: INTEGRATED_SEAT_HEIGHT,
  integratedSeatMinZ: -INTEGRATED_SEAT_HEIGHT,
  integratedSeatBottomChamfer: INTEGRATED_SEAT_BOTTOM_CHAMFER,
  bottomEdgeFilletRadius: BOTTOM_EDGE_FILLET_RADIUS,
  testShaftLengthForFloor: (floorThickness: number): number =>
    floorThickness + TEST_SHAFT_EXTERIOR_ALLOWANCE,
} as const

export const OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION = {
  geometryTolerance: 0.02,
  volumeTolerance: 0.02,
  intersectionVolumeTolerance: 1e-6,
  minimumSocketRoof: 0.5,
  male: {
    bodyDiameter: DETACHABLE_SEAT_BODY_DIAMETER,
    bodyHeight: DETACHABLE_SEAT_BODY_HEIGHT,
    leadInHeight: DETACHABLE_SEAT_LEAD_IN_HEIGHT,
    leadInTipDiameter: 4.6,
    keyWidth: DETACHABLE_SEAT_KEY_WIDTH,
    headStartLength: DETACHABLE_SEAT_HEAD_START_LENGTH,
    headMaxLength: DETACHABLE_SEAT_HEAD_MAX_LENGTH,
    taperTopZ: DETACHABLE_SEAT_TAPER_TOP_Z,
    wearHeight: DETACHABLE_SEAT_WEAR_HEIGHT,
    totalHeight: DETACHABLE_SEAT_TOTAL_HEIGHT,
    headTopTrim: DETACHABLE_SEAT_HEAD_TOP_TRIM,
    effectiveTotalHeight: DETACHABLE_SEAT_EFFECTIVE_TOTAL_HEIGHT,
    nominalVolume: DETACHABLE_SEAT_NOMINAL_VOLUME,
    markedNominalVolume: DETACHABLE_SEAT_NOMINAL_VOLUME,
    indicator: DETACHABLE_SEAT_INDICATOR,
    bounds: {
      min: [-DETACHABLE_SEAT_HEAD_BOUND_XY, -2.5, 0],
      max: [DETACHABLE_SEAT_HEAD_BOUND_XY, 2.5, DETACHABLE_SEAT_TOTAL_HEIGHT],
    },
  },
  maleReference: {
    bodyHeight: DETACHABLE_SEAT_BODY_HEIGHT,
    totalHeight: DETACHABLE_SEAT_TOTAL_HEIGHT,
    nominalVolume: DETACHABLE_SEAT_NOMINAL_VOLUME,
    bounds: {
      min: [-DETACHABLE_SEAT_HEAD_BOUND_XY, -2.5, 0],
      max: [DETACHABLE_SEAT_HEAD_BOUND_XY, 2.5, DETACHABLE_SEAT_TOTAL_HEIGHT],
    },
  },
  female: {
    outerDiameter: DETACHABLE_HOLDER_OUTER_DIAMETER,
    depth: DETACHABLE_HOLDER_DEPTH,
    hostOverlap: DETACHABLE_HOLDER_HOST_OVERLAP,
    pocketSideClearance: DETACHABLE_HOLDER_POCKET_SIDE_CLEARANCE,
    sourceMinZ: DETACHABLE_HOLDER_SOURCE_MIN_Z,
    sourceMaxZ: DETACHABLE_HOLDER_SOURCE_MAX_Z,
    nominalVolume: DETACHABLE_HOLDER_SOURCE_NOMINAL_VOLUME,
    bounds: {
      min: [
        -DETACHABLE_HOLDER_OUTER_DIAMETER / 2,
        -DETACHABLE_HOLDER_OUTER_DIAMETER / 2,
        DETACHABLE_HOLDER_SOURCE_MIN_Z,
      ],
      max: [
        DETACHABLE_HOLDER_OUTER_DIAMETER / 2,
        DETACHABLE_HOLDER_OUTER_DIAMETER / 2,
        DETACHABLE_HOLDER_SOURCE_MAX_Z,
      ],
    },
  },
  femaleReference: {
    depth: DETACHABLE_HOLDER_DEPTH,
    sourceMinZ: DETACHABLE_HOLDER_SOURCE_MIN_Z,
    sourceMaxZ: DETACHABLE_HOLDER_SOURCE_MAX_Z,
    nominalVolume: DETACHABLE_HOLDER_SOURCE_NOMINAL_VOLUME,
    bounds: {
      min: [
        -DETACHABLE_HOLDER_OUTER_DIAMETER / 2,
        -DETACHABLE_HOLDER_OUTER_DIAMETER / 2,
        DETACHABLE_HOLDER_SOURCE_MIN_Z,
      ],
      max: [
        DETACHABLE_HOLDER_OUTER_DIAMETER / 2,
        DETACHABLE_HOLDER_OUTER_DIAMETER / 2,
        DETACHABLE_HOLDER_SOURCE_MAX_Z,
      ],
    },
  },
} as const

export function openGridDetachableCornerSeatSocketRotationFor(
  center: OpenGridDetachableCornerSeatPoint2D,
): OpenGridDetachableCornerSeatRotation {
  const [x, y] = center
  if (x <= 0 && y > 0) return 0
  if (x > 0 && y >= 0) return 90
  if (x >= 0 && y < 0) return 180
  if (x < 0 && y <= 0) return 270
  return 0
}
