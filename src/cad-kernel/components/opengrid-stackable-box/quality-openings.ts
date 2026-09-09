import type { Shape3D } from 'replicad'
import {
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxDerivedGeometryFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS,
  type OpenGridStackableBoxDerivedOpening,
  type OpenGridStackableBoxOpeningDirection,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import { closeEnough, type Bounds } from './shared'
import { readFaceQualityRecords, volumeInBox } from './quality-metrics'

export type OpenGridStackableBoxOpeningQuality = {
  direction: OpenGridStackableBoxOpeningDirection
  cutProbeVolume: number
  topEdgeProbeVolume: number
  topRailProbeVolume: number
  sillProbeVolume: number | null
  cornerBridgeVolumes: number[]
  planarSillFaceCount: number
  planarSideFaceCount: number
  cylindricalFaceCount: number
}

export type OpenGridStackableBoxOpeningInspectionOptions = Readonly<{
  volumeProbes?: boolean
}>

function tangentAxisFor(
  direction: OpenGridStackableBoxOpeningDirection,
): 0 | 1 {
  return direction === '+X' || direction === '-X' ? 1 : 0
}

function normalAxisFor(direction: OpenGridStackableBoxOpeningDirection): 0 | 1 {
  return direction === '+X' || direction === '-X' ? 0 : 1
}

function sideHalfExtentFor(
  direction: OpenGridStackableBoxOpeningDirection,
  width: number,
  depth: number,
): number {
  return direction === '+X' || direction === '-X' ? width / 2 : depth / 2
}

function tangentHalfExtentFor(
  direction: OpenGridStackableBoxOpeningDirection,
  width: number,
  depth: number,
): number {
  return direction === '+X' || direction === '-X' ? depth / 2 : width / 2
}

function sideProbeBounds(
  direction: OpenGridStackableBoxOpeningDirection,
  width: number,
  depth: number,
  tangentMin: number,
  tangentMax: number,
  zMin: number,
  zMax: number,
  normalInnerOffset = OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness - 0.05,
  normalOuterOffset = 0.02,
): Bounds {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const sideHalfExtent = sideHalfExtentFor(direction, width, depth)
  const normalMin = sideHalfExtent - normalInnerOffset
  const normalMax = sideHalfExtent + normalOuterOffset
  const sideIsPositive = direction === '+X' || direction === '+Y'
  const signedNormalMin = sideIsPositive ? normalMin : -normalMax
  const signedNormalMax = sideIsPositive ? normalMax : -normalMin
  const normalAxis = normalAxisFor(direction)
  const tangentAxis = tangentAxisFor(direction)
  const min: [number, number, number] = [0, 0, zMin]
  const max: [number, number, number] = [0, 0, zMax]
  min[normalAxis] = signedNormalMin
  max[normalAxis] = signedNormalMax
  min[tangentAxis] = tangentMin
  max[tangentAxis] = tangentMax
  return [min, max]
}

function wallThicknessFor(parameters: OpenGridStackableBoxParameters): number {
  if (parameters.thinShellMode) {
    return OPENGRID_STACKABLE_BOX_CONFIGURATION.thinShellWallThickness
  }
  return OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness
}

function openingFaceEnvelope(
  direction: OpenGridStackableBoxOpeningDirection,
  width: number,
  depth: number,
  opening: OpenGridStackableBoxDerivedOpening,
  upperEdgeZ: number,
  wallThickness: number,
): Bounds {
  const tangentHalf = opening.upperWidth / 2 + 0.15
  return sideProbeBounds(
    direction,
    width,
    depth,
    -tangentHalf,
    tangentHalf,
    opening.bottomZ - 0.05,
    upperEdgeZ + 0.12,
    wallThickness - 0.05,
  )
}

function faceOverlapsBounds(
  record: {
    min: [number, number, number]
    max: [number, number, number]
  },
  bounds: Bounds,
): boolean {
  return (
    record.min.every((value, axis) => value <= bounds[1][axis] + 0.02) &&
    record.max.every((value, axis) => value >= bounds[0][axis] - 0.02)
  )
}

function openingQualityFor(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
  volumeProbes: boolean,
): OpenGridStackableBoxOpeningQuality {
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const opening = derived.openings[direction]
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const wallThickness = wallThicknessFor(parameters)
  const probeHalf = Math.max(0.08, Math.min(0.25, opening.bottomLength / 4))
  const cutProbeBounds = sideProbeBounds(
    direction,
    width,
    depth,
    -probeHalf,
    probeHalf,
    opening.bottomZ + 0.05,
    derived.activeUpperInnerRimZ - 0.05,
    wallThickness - 0.05,
  )
  const cutProbeVolume = volumeProbes
    ? volumeInBox(shape, ...cutProbeBounds)
    : 0
  const topEdgeProbeVolume = volumeProbes
    ? volumeInBox(
        shape,
        ...sideProbeBounds(
          direction,
          width,
          depth,
          -probeHalf,
          probeHalf,
          derived.activeUpperOuterEdgeZ - 1.5,
          derived.activeUpperOuterEdgeZ - 0.1,
          wallThickness - 0.05,
        ),
      )
    : 0
  const upperRailInnerInset =
    wallThickness +
    (parameters.thinShellMode
      ? OPENGRID_STACKABLE_BOX_CONFIGURATION.thinShellTopChamfer
      : OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailInnerChamfer)
  const topRailProbeVolume = volumeProbes
    ? volumeInBox(
        shape,
        ...sideProbeBounds(
          direction,
          width,
          depth,
          -probeHalf,
          probeHalf,
          derived.activeUpperInnerRimZ + 0.05,
          derived.activeUpperOuterEdgeZ - 0.1,
          upperRailInnerInset + 0.05,
          0.02,
        ),
      )
    : 0

  const sillProbeMin = Math.max(
    derived.activeFloorTopZ + 0.02,
    opening.bottomZ - 0.15,
  )
  const sillProbeMax = opening.bottomZ - 0.02
  const sillProbeVolume =
    volumeProbes && sillProbeMax > sillProbeMin
      ? volumeInBox(
          shape,
          ...sideProbeBounds(
            direction,
            width,
            depth,
            -probeHalf,
            probeHalf,
            sillProbeMin,
            sillProbeMax,
            wallThickness - 0.05,
          ),
        )
      : null

  const bridgeHalfStart = opening.upperWidth / 2 + 0.05
  const bridgeHalfEnd =
    bridgeHalfStart + Math.max(0.1, opening.bridgeWidth - 0.1)
  const bridgeZMax = derived.activeUpperInnerRimZ - 0.08
  const bridgeZMin = Math.max(opening.bottomZ + 0.1, bridgeZMax - 0.25)
  const cornerBridgeVolumes =
    volumeProbes && bridgeHalfEnd > bridgeHalfStart && bridgeZMax > bridgeZMin
      ? [
          volumeInBox(
            shape,
            ...sideProbeBounds(
              direction,
              width,
              depth,
              bridgeHalfStart,
              bridgeHalfEnd,
              bridgeZMin,
              bridgeZMax,
              wallThickness - 0.05,
            ),
          ),
          volumeInBox(
            shape,
            ...sideProbeBounds(
              direction,
              width,
              depth,
              -bridgeHalfEnd,
              -bridgeHalfStart,
              bridgeZMin,
              bridgeZMax,
              wallThickness - 0.05,
            ),
          ),
        ]
      : []

  const records = readFaceQualityRecords(shape)
  const envelope = openingFaceEnvelope(
    direction,
    width,
    depth,
    opening,
    derived.activeUpperOuterEdgeZ,
    wallThickness,
  )
  const tangentAxis = tangentAxisFor(direction)
  const normalAxis = normalAxisFor(direction)
  const expectedTangentNormal = Math.sin((opening.angle * Math.PI) / 180)
  const expectedZNormal = Math.cos((opening.angle * Math.PI) / 180)
  const straightSideTopZ = derived.activeUpperOuterEdgeZ - opening.cornerRise
  let planarSillFaceCount = 0
  let planarSideFaceCount = 0
  let cylindricalFaceCount = 0

  for (const record of records) {
    if (!faceOverlapsBounds(record, envelope)) continue
    if (record.surfaceType === 'CYLINDRE') {
      cylindricalFaceCount += 1
      continue
    }
    if (record.surfaceType !== 'PLANE' || record.normal === null) continue

    const zSpan = record.max[2] - record.min[2]
    const tangentSpan = record.max[tangentAxis] - record.min[tangentAxis]
    const tangentCenter =
      (record.min[tangentAxis] + record.max[tangentAxis]) / 2
    const sideCenterDistance = Math.abs(tangentCenter)
    const expectedSideCenter =
      (opening.bottomLength / 2 + opening.upperWidth / 2) / 2
    const nearOpeningSide = closeEnough(
      sideCenterDistance,
      expectedSideCenter,
      Math.max(0.35, expectedSideCenter * 0.25),
    )
    const normalAlongTangent = Math.abs(record.normal[tangentAxis])
    const normalAlongZ = Math.abs(record.normal[2])

    if (
      Math.abs(record.min[2] - opening.bottomZ) <= 0.08 &&
      Math.abs(record.max[2] - opening.bottomZ) <= 0.08 &&
      Math.abs(record.normal[2]) >= 0.9 &&
      tangentSpan >= opening.bottomLength * 0.5 &&
      tangentSpan <= opening.upperWidth + 0.3
    ) {
      planarSillFaceCount += 1
    }
    if (
      nearOpeningSide &&
      zSpan >= Math.max(0.25, opening.verticalSideHeight * 0.5) &&
      record.max[2] >= straightSideTopZ - 0.06 &&
      Math.abs(record.normal[normalAxis]) <= 0.2 &&
      closeEnough(normalAlongTangent, expectedTangentNormal, 0.2) &&
      closeEnough(normalAlongZ, expectedZNormal, 0.2)
    ) {
      planarSideFaceCount += 1
    }
  }

  const tangentHalfExtent = tangentHalfExtentFor(direction, width, depth)
  if (opening.upperWidth / 2 > tangentHalfExtent) {
    throw new Error(`OPENGRID_STACKABLE_BOX_OPENING_SPAN_INVALID:${direction}`)
  }

  return {
    direction,
    cutProbeVolume,
    topEdgeProbeVolume,
    topRailProbeVolume,
    sillProbeVolume,
    cornerBridgeVolumes,
    planarSillFaceCount,
    planarSideFaceCount,
    cylindricalFaceCount,
  }
}

export function inspectOpenGridStackableBoxOpenings(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  options: OpenGridStackableBoxOpeningInspectionOptions = {},
): OpenGridStackableBoxOpeningQuality[] {
  const volumeProbes = options.volumeProbes ?? true
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  return OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS.filter(
    (direction) => derived.openings[direction].enabled,
  ).map((direction) =>
    openingQualityFor(shape, parameters, direction, volumeProbes),
  )
}

function hasClosedWallFace(
  records: ReturnType<typeof readFaceQualityRecords>,
  direction: OpenGridStackableBoxOpeningDirection,
  width: number,
  depth: number,
  zMin: number,
  zMax: number,
  wallThickness: number,
): boolean {
  const normalAxis = normalAxisFor(direction)
  const normalSign = direction === '+X' || direction === '+Y' ? 1 : -1
  const envelope = sideProbeBounds(
    direction,
    width,
    depth,
    -0.35,
    0.35,
    zMin,
    zMax,
    wallThickness + 0.15,
    0.15,
  )
  return records.some(
    (record) =>
      record.surfaceType === 'PLANE' &&
      record.normal !== null &&
      record.normal[normalAxis] * normalSign > 0.85 &&
      faceOverlapsBounds(record, envelope),
  )
}

export function assertOpenGridStackableBoxOpenings(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  options: OpenGridStackableBoxOpeningInspectionOptions = {},
): void {
  const volumeProbes = options.volumeProbes ?? true
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const wallThickness = wallThicknessFor(parameters)
  const records = volumeProbes ? null : readFaceQualityRecords(shape)
  for (const direction of OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS) {
    if (derived.openings[direction].enabled) continue
    if (
      !volumeProbes &&
      !hasClosedWallFace(
        records ?? [],
        direction,
        width,
        depth,
        derived.activeFloorTopZ + 0.05,
        derived.activeUpperInnerRimZ - 0.05,
        wallThickness,
      )
    ) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_CLOSED_WALL_INVALID:${direction}`,
      )
    }
    if (!volumeProbes) continue
    const closedWallVolume = volumeInBox(
      shape,
      ...sideProbeBounds(
        direction,
        width,
        depth,
        -0.25,
        0.25,
        derived.activeFloorTopZ + 0.05,
        derived.activeUpperInnerRimZ - 0.05,
        wallThickness - 0.05,
      ),
    )
    if (closedWallVolume <= 0.001) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_CLOSED_WALL_INVALID:${direction}`,
      )
    }
  }

  for (const quality of inspectOpenGridStackableBoxOpenings(
    shape,
    parameters,
    options,
  )) {
    if (volumeProbes && quality.cutProbeVolume > 0.01) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_NOT_CUT:${quality.direction}:${quality.cutProbeVolume}`,
      )
    }
    if (volumeProbes && quality.topEdgeProbeVolume > 0.01) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_TOP_EDGE_NOT_OPEN:${quality.direction}:${quality.topEdgeProbeVolume}`,
      )
    }
    if (volumeProbes && quality.topRailProbeVolume > 0.01) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_TOP_RAIL_NOT_OPEN:${quality.direction}:${quality.topRailProbeVolume}`,
      )
    }
    if (
      volumeProbes &&
      quality.sillProbeVolume !== null &&
      quality.sillProbeVolume <= 0.001
    ) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_SILL_INVALID:${quality.direction}`,
      )
    }
    if (
      volumeProbes &&
      quality.cornerBridgeVolumes.some((volume) => volume <= 0.001)
    ) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_CORNER_BRIDGE_INVALID:${quality.direction}`,
      )
    }
    if (quality.planarSillFaceCount < 1) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_SILL_FACE_INVALID:${quality.direction}`,
      )
    }
    if (quality.planarSideFaceCount < 2) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_SIDE_FACE_INVALID:${quality.direction}`,
      )
    }
    if (quality.cylindricalFaceCount < 4) {
      throw new Error(
        `OPENGRID_STACKABLE_BOX_OPENING_ROUNDED_TRANSITION_INVALID:${quality.direction}`,
      )
    }
  }
}
