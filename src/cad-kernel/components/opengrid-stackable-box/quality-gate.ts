import { measureVolume, type Shape3D } from 'replicad'
import {
  boundsForOpenGridStackableBox,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import { bottomGridSeamsFor } from './geometry'
import { toGeometryError } from '../../geometry-errors'
import {
  inspectOpenGridStackableBoxInterface,
  integratedSeatRecordCountFor,
} from './quality-interface'
import { countOrdinaryBottomHoleFaces } from './quality-holes'
import { countSolids, isBRepValid } from './quality-metrics'
import { assertBottomGridSpacing } from './quality-seams'
import { assertOpenGridStackableBoxOpenings } from './quality-openings'
import {
  inspectOpenGridStackableBoxThinShell,
  type OpenGridStackableBoxThinShellQualityReport,
} from './quality-thin'
import type { OpenGridStackableBoxInterfaceQualityReport } from './quality-types'
import {
  closeEnough,
  createOpenGridStackableBoxQualityRegions,
  deleteShape,
  openGridStackableBoxQualityRegionZBounds,
  readBounds,
  type Bounds,
  type OpenGridStackableBoxQualityRegions,
} from './shared'
import {
  assertOpenGridDetachableCornerSeatConsumers,
  type OpenGridDetachableCornerSeatConsumerContext,
} from '../opengrid-locating-assembly/consumer'

export function socketSeatChipZone(
  parameters: OpenGridStackableBoxParameters,
  center: readonly [number, number],
): Bounds {
  const seatConfiguration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const zBounds = openGridStackableBoxQualityRegionZBounds(parameters)
  // The socket-void probe is the widest seat measurement: its circular
  // envelope (holder diameter minus the host overlap) must fit inside the
  // chip or the residual check would silently ignore material in the outer
  // annulus and weaken the rejection verdict.
  const radius =
    Math.max(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseFlangeDiameter / 2,
      seatConfiguration.female.outerDiameter / 2 +
        seatConfiguration.geometryTolerance,
    ) + 1
  return [
    [center[0] - radius, center[1] - radius, zBounds.bottomMinZ],
    [center[0] + radius, center[1] + radius, zBounds.bottomMaxZ],
  ]
}

function assertExpectedBounds(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): void {
  const actual = readBounds(shape)
  const expected = boundsForOpenGridStackableBox(parameters)
  const matches = actual.every((point, pointIndex) => {
    const expectedPoint = pointIndex === 0 ? expected.min : expected.max
    return point.every((value, axis) => closeEnough(value, expectedPoint[axis]))
  })
  if (!matches) throw new Error('OPENGRID_STACKABLE_BOX_INVALID_BOUNDS')
}

function assertSocketLayout(parameters: OpenGridStackableBoxParameters): void {
  const socketCenters = openGridStackableBoxSocketCentersFor(parameters)
  if (parameters.fullBottomHoleGrid) assertBottomGridSpacing(parameters)

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  for (let firstIndex = 0; firstIndex < socketCenters.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < socketCenters.length;
      secondIndex += 1
    ) {
      const first = socketCenters[firstIndex]
      const second = socketCenters[secondIndex]
      if (!first || !second) continue
      const minimumSpacing = Math.max(
        configuration.baseFlangeDiameter + configuration.baseHoleClearance,
        configuration.baseHoleTopOpeningDiameter,
      )
      if (
        Math.hypot(first[0] - second[0], first[1] - second[1]) < minimumSpacing
      ) {
        throw new Error('OPENGRID_STACKABLE_BOX_SOCKET_OVERLAP')
      }
    }
  }
}

function assertValidShape(shape: Shape3D): void {
  try {
    if (!(measureVolume(shape) > 0)) {
      throw new Error('OPENGRID_STACKABLE_BOX_VOLUME_INVALID')
    }
    if (countSolids(shape) !== 1) {
      throw new Error('OPENGRID_STACKABLE_BOX_SOLID_COUNT_INVALID')
    }
    if (!isBRepValid(shape)) {
      throw new Error('OPENGRID_STACKABLE_BOX_BREP_INVALID')
    }
  } catch (error) {
    const normalized = toGeometryError(error)
    if (normalized.message.startsWith('OPENGRID_')) {
      throw normalized
    }
    throw new Error(
      `OPENGRID_STACKABLE_BOX_GEOMETRY_INVALID:${normalized.message}`,
    )
  }
}

function assertInterfaceConstants(): void {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const topRailProfileHeight =
    configuration.topRailInnerChamfer +
    configuration.topRailInnerVerticalHeight +
    configuration.topRailMiddleChamfer +
    configuration.topRailOuterVerticalHeight +
    configuration.topRailOuterChamfer
  const bottomAssemblyHeight =
    configuration.bottomFootChamferHeight +
    configuration.bottomSupportBandHeight +
    configuration.bottomStackingLeadIn +
    configuration.floorThickness
  if (
    configuration.baseFlangeThickness > configuration.floorThickness ||
    configuration.snapReferenceShaftExposure <= 0 ||
    configuration.baseFixtureShaftExposure <= 0 ||
    configuration.floorThickness <= 0 ||
    configuration.wallThickness <= 0 ||
    configuration.bottomAssemblyHeight <= configuration.floorThickness ||
    configuration.topRailHeight <= 0 ||
    configuration.topRailWidth <= 0 ||
    configuration.topRailInnerChamfer <= 0 ||
    configuration.topRailInnerVerticalHeight <= 0 ||
    configuration.topRailMiddleChamfer <= 0 ||
    configuration.topRailOuterVerticalHeight <= 0 ||
    configuration.topRailOuterChamfer <= 0 ||
    !closeEnough(configuration.topRailHeight, topRailProfileHeight, 0.001) ||
    !closeEnough(
      configuration.bottomAssemblyHeight,
      bottomAssemblyHeight,
      0.001,
    ) ||
    configuration.stackingLeadIn <= 0 ||
    configuration.bottomStackingLeadIn <= 0 ||
    configuration.bottomFootChamferHeight <= 0 ||
    configuration.bottomSupportBandHeight <= 0 ||
    configuration.topRailOuterInset <= 0 ||
    configuration.stackingClearance <= 0 ||
    configuration.stackingClearance >= configuration.stackingLeadIn ||
    configuration.stackingBearingLand <= 0 ||
    configuration.bottomGrooveDepth <= 0 ||
    configuration.bottomGridSeamOpeningWidth <= 0 ||
    configuration.bottomGridSeamSupportOpeningWidth <=
      configuration.bottomGridSeamOpeningWidth ||
    configuration.bottomGridSeamBedOpeningWidth <=
      configuration.bottomGridSeamSupportOpeningWidth ||
    configuration.basePlateThickness <= 0 ||
    configuration.basePlateCutoffHeight <= 0 ||
    !closeEnough(
      configuration.basePlateThickness + configuration.basePlateCutoffHeight,
      configuration.bottomAssemblyHeight,
      0.001,
    ) ||
    configuration.basePlateHoleBottomDepth <= 0 ||
    configuration.basePlateHoleTopDepth <= 0 ||
    !closeEnough(
      configuration.basePlateHoleBottomDepth +
        configuration.basePlateHoleTopDepth,
      configuration.basePlateThickness,
      0.001,
    ) ||
    configuration.wallThickness - configuration.stackingClearance <= 0 ||
    configuration.stackingBearingLand <= 0 ||
    configuration.stackingBearingLand >= configuration.topRailWidth
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_INTERFACE_CONSTANTS_INVALID')
  }
}

function assertThickShell(
  quality: OpenGridStackableBoxInterfaceQualityReport,
): void {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (
    quality.floorProbeVolumes.some((volume) => volume <= 0.01) ||
    quality.floorProbeThicknesses.some(
      (thickness) => !closeEnough(thickness, configuration.floorThickness, 0.1),
    ) ||
    quality.sideWallProbeThicknesses.some(
      (thickness) => !closeEnough(thickness, configuration.wallThickness, 0.1),
    )
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_THICK_SHELL_INVALID')
  }
}

function assertGuideInterface(
  quality: OpenGridStackableBoxInterfaceQualityReport,
  parameters: OpenGridStackableBoxParameters,
): void {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const hasInvalidSeamCount =
    quality.bottomGridSeamCount !== bottomGridSeamsFor(parameters).length
  const hasUnsupportedSeam = quality.bottomGridSeamSupportVolumes.some(
    (volume) => volume <= 0.001,
  )
  const hasThinSeamSupport = quality.bottomGridSeamSupportThicknesses.some(
    (thickness) => thickness < configuration.floorThickness * 0.5,
  )
  const hasUnsupportedSeamSlope = quality.bottomGridSeamSlopeFaceCounts.some(
    (faceCount) => faceCount < 2,
  )
  const profileSegmentCounts = [
    ...Object.values(quality.topRailProfileSegmentFaceCounts),
    ...Object.values(quality.bottomGuideProfileSegmentFaceCounts),
  ]
  const hasMissingProfileSegment = profileSegmentCounts.some(
    (faceCount) => faceCount <= 0,
  )
  const hasInvalidStackingClearance =
    quality.stackingClearanceNominalIntersectionVolume > 0.01 ||
    quality.stackingClearanceBelowNominalIntersectionVolume <= 0.01
  if (hasInvalidStackingClearance) {
    throw new Error('OPENGRID_STACKABLE_BOX_STACKING_CLEARANCE_INVALID')
  }
  if (
    quality.topGuideLeadInFaceCount < 4 ||
    quality.topRailCornerContinuationFaceCount < 4 ||
    quality.topRailInnerCornerRadiusFaceCount < 4 ||
    quality.topRailOuterCornerRadiusFaceCount < 4 ||
    quality.bottomGuideLeadInFaceCount < 4 ||
    (quality.bottomGridSeamCount > 0 &&
      quality.bottomGridSeamSlopeFaceCount <
        Math.max(2, quality.bottomGridSeamCount * 2)) ||
    (quality.bottomGridSeamCount > 0 &&
      quality.bottomGridSeamApexFaceCounts.some(
        (faceCount) => faceCount < 2,
      )) ||
    quality.bottomGridSeamClosureFaceCount !== 0 ||
    hasInvalidSeamCount ||
    quality.bottomGridSeamClearanceVolumes.some((volume) => volume > 0.05) ||
    hasUnsupportedSeam ||
    hasThinSeamSupport ||
    hasUnsupportedSeamSlope ||
    hasMissingProfileSegment ||
    quality.bearingLandVolumes.some((volume) => volume <= 0.001) ||
    quality.topRailProbeVolumes.some((volume) => volume <= 0.001) ||
    quality.bottomGuideProtrusionVolumes.some((volume) => volume <= 0.001) ||
    quality.bottomFootChamferVolumes.some((volume) => volume <= 0.001) ||
    quality.bottomSupportBandVolumes.some((volume) => volume <= 0.001) ||
    quality.bottomGridSeamFloorVolumes.some((volume) => volume <= 0.001)
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_INTEGRATED_GUIDE_INVALID')
  }
}

function assertBottomSupport(
  quality: OpenGridStackableBoxInterfaceQualityReport,
  parameters: OpenGridStackableBoxParameters,
): void {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const bottomSupportBandWidth = 0.2
  const bottomSupportProbeHeight = configuration.bottomSupportBandHeight + 0.1
  const minimumBottomSupportVolume =
    bottomSupportBandWidth *
    (2 * Math.min(2, width / 4, depth / 4)) *
    bottomSupportProbeHeight *
    0.25
  const hasWeakGuideSupport = quality.bottomSupportVolumes.some(
    (volume) => volume <= minimumBottomSupportVolume,
  )
  const hasMissingPerimeterSupport =
    quality.bottomPerimeterResidualVolumes.some((volume) => volume <= 0.001)
  const hasThinFloorSupport = quality.bottomSupportFloorThicknesses.some(
    (thickness) => !closeEnough(thickness, configuration.floorThickness, 0.1),
  )
  const hasThinTransitionSupport =
    quality.bottomTransitionSupportThicknesses.some(
      (thickness) => !closeEnough(thickness, configuration.floorThickness, 0.1),
    )
  if (
    hasWeakGuideSupport ||
    hasMissingPerimeterSupport ||
    hasThinFloorSupport ||
    hasThinTransitionSupport
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_SUPPORT_INVALID')
  }
}

function assertIntegratedSeats(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): void {
  const centers = openGridStackableBoxSocketCentersFor(parameters)
  if (integratedSeatRecordCountFor(shape, parameters) !== centers.length) {
    throw new Error('OPENGRID_STACKABLE_BOX_INTEGRATED_SEAT_INVALID')
  }
}

function assertThinShellQuality(
  quality: OpenGridStackableBoxThinShellQualityReport,
): void {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (
    quality.floorProbeVolumes.some((volume) => volume <= 0.01) ||
    quality.floorProbeThicknesses.some(
      (thickness) =>
        !closeEnough(thickness, configuration.thinShellFloorThickness, 0.1),
    ) ||
    quality.sideWallProbeThicknesses.some(
      (thickness) =>
        !closeEnough(thickness, configuration.thinShellWallThickness, 0.1),
    ) ||
    quality.bottomChamferFaceCount < 4 ||
    quality.topChamferFaceCount < 4 ||
    quality.topRimHorizontalPlanarFaceCount !== 0 ||
    quality.innerFloorFilletFaceCount < 4
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_THIN_SHELL_PROFILE_INVALID')
  }

  if (
    quality.ordinaryBottomHoleCount !== quality.expectedOrdinaryBottomHoleCount
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_GRID_HOLES_INVALID')
  }
}

function assertBasePlateMountingInterface(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): void {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (parameters.cornerSeatMode === 'integrated') {
    assertIntegratedSeats(shape, parameters)
    const ordinaryCenters =
      openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
    if (
      countOrdinaryBottomHoleFaces(shape, ordinaryCenters, parameters) !==
      ordinaryCenters.length
    ) {
      throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_GRID_HOLES_INVALID')
    }
    return
  }
  if (parameters.cornerSeatMode === 'none') {
    const ordinaryCenters =
      openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
    if (
      countOrdinaryBottomHoleFaces(shape, ordinaryCenters, parameters) !==
      ordinaryCenters.length
    ) {
      throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_GRID_HOLES_INVALID')
    }
    return
  }
  const ordinaryCenters =
    openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
  if (
    countOrdinaryBottomHoleFaces(shape, ordinaryCenters, parameters) !==
    ordinaryCenters.length
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_GRID_HOLES_INVALID')
  }
}

export function assertOpenGridStackableBoxGeometry(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridDetachableCornerSeatConsumerContext = {},
): void {
  assertExpectedBounds(shape, parameters)
  assertSocketLayout(parameters)
  assertValidShape(shape)
  assertInterfaceConstants()
  assertOpenGridStackableBoxOpenings(shape, parameters)

  // Lattice candidates have too many faces for every measurement to run
  // against the full shape within the engine memory ceiling: pre-cut the two
  // measurement regions once and reuse small chips of them for every probe.
  const regions: OpenGridStackableBoxQualityRegions | undefined =
    parameters.honeycombMode
      ? createOpenGridStackableBoxQualityRegions(shape, parameters)
      : undefined
  try {
    inspectWithRegions(shape, parameters, context, regions)
  } finally {
    regions?.dispose()
  }
}

function inspectWithRegions(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridDetachableCornerSeatConsumerContext,
  regions: OpenGridStackableBoxQualityRegions | undefined,
): void {
  if (parameters.cornerSeatMode === 'detachable-corner-seat') {
    try {
      assertOpenGridDetachableCornerSeatConsumers(
        shape,
        openGridStackableBoxSocketCentersFor(parameters),
        context,
        'OPENGRID_STACKABLE_BOX_DETACHABLE_CORNER_SEAT_QUALITY_INVALID',
        regions
          ? (center) =>
              regions.bottomZone(socketSeatChipZone(parameters, center))
          : undefined,
      )
    } catch (error) {
      const normalized = toGeometryError(error)
      if (normalized.message.startsWith('OPENGRID_')) {
        throw normalized
      }
      throw new Error(
        `OPENGRID_STACKABLE_BOX_DETACHABLE_CORNER_SEAT_QUALITY_INVALID:${normalized.message}`,
      )
    }
  }

  if (parameters.thinShellMode) {
    try {
      assertThinShellQuality(
        inspectOpenGridStackableBoxThinShell(shape, parameters),
      )
    } catch (error) {
      const normalized = toGeometryError(error)
      if (normalized.message.startsWith('OPENGRID_')) {
        throw normalized
      }
      throw new Error('OPENGRID_STACKABLE_BOX_THIN_SHELL_GEOMETRY_INVALID')
    }
    if (parameters.cornerSeatMode === 'integrated') {
      assertIntegratedSeats(shape, parameters)
    }
    return
  }

  if (parameters.basePlateMode) {
    try {
      assertBasePlateMountingInterface(shape, parameters)
    } catch (error) {
      const normalized = toGeometryError(error)
      if (normalized.message.startsWith('OPENGRID_')) {
        throw normalized
      }
      throw new Error('OPENGRID_STACKABLE_BOX_INTERFACE_GEOMETRY_INVALID')
    }
    return
  }

  let quality: OpenGridStackableBoxInterfaceQualityReport
  try {
    quality = inspectOpenGridStackableBoxInterface(shape, parameters, regions)
  } catch (error) {
    const normalized = toGeometryError(error)
    if (normalized.message.startsWith('OPENGRID_')) {
      throw normalized
    }
    throw new Error(
      `OPENGRID_STACKABLE_BOX_INTERFACE_GEOMETRY_INVALID:${normalized.message}`,
    )
  }

  assertThickShell(quality)
  assertGuideInterface(quality, parameters)
  assertBottomSupport(quality, parameters)
  if (parameters.cornerSeatMode === 'integrated') {
    if (
      quality.integratedSeatRecordCount !==
      openGridStackableBoxSocketCentersFor(parameters).length
    ) {
      throw new Error('OPENGRID_STACKABLE_BOX_INTEGRATED_SEAT_INVALID')
    }
  }
  if (
    quality.ordinaryBottomHoleCount !== quality.expectedOrdinaryBottomHoleCount
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_GRID_HOLES_INVALID')
  }
}
