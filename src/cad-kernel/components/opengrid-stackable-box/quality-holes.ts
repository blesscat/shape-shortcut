import { makeCylinder, measureVolume, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from '../../../cad-contract/units/opengrid-locating-assembly'
import type {
  OpenGridStackableBoxCaptiveSocketRecord,
  OpenGridStackableBoxMountingHoleProfile,
} from './quality-types'
import {
  readFaceQualityRecords,
  type FaceQualityRecord,
} from './quality-metrics'
import {
  closeEnough,
  deleteShape,
  openGridStackableBoxQualityRegionZBounds,
  readBounds,
  type Bounds,
  type OpenGridStackableBoxQualityRegions,
} from './shared'

function activeBottomThicknessFor(
  parameters?: OpenGridStackableBoxParameters,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (parameters?.thinShellMode) return configuration.thinShellFloorThickness
  if (parameters?.basePlateMode) return configuration.basePlateThickness
  return configuration.bottomAssemblyHeight
}

function mountingHoleStepHeightFor(
  parameters?: OpenGridStackableBoxParameters,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (parameters?.thinShellMode) {
    return configuration.thinShellBottomHoleStepHeight
  }
  if (parameters?.basePlateMode) return configuration.basePlateHoleBottomDepth
  return configuration.baseHoleStepHeight
}

export function measureMountingHoleStepVolumes(
  shape: Shape3D,
  centers: ReadonlyArray<[number, number]>,
  parameters?: OpenGridStackableBoxParameters,
  regions?: OpenGridStackableBoxQualityRegions,
): number[] {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const stepHeight = mountingHoleStepHeightFor(parameters)
  return centers.map(([centerX, centerY]) => {
    const outer = makeCylinder(
      configuration.baseHoleTopOpeningDiameter / 2 + 0.05,
      0.04,
      [centerX, centerY, stepHeight - 0.02],
    )
    const inner = makeCylinder(
      configuration.baseHoleBottomOpeningDiameter / 2 - 0.05,
      0.04,
      [centerX, centerY, stepHeight - 0.02],
    )
    const ring = outer.cut(inner)
    deleteShape(outer)
    deleteShape(inner)
    const target = regions
      ? regions.bottomZone(socketChipZone([centerX, centerY], parameters))
      : shape
    let intersection: Shape3D | null = null
    try {
      intersection = target.intersect(ring)
      return measureVolume(intersection)
    } finally {
      if (intersection && intersection !== target) deleteShape(intersection)
      deleteShape(ring)
    }
  })
}

function cylindricalFaceProfileAt(
  records: FaceQualityRecord[],
  center: [number, number],
  zMin: number,
  zMax: number,
): { diameter: number; depth: number } {
  const record = records
    .filter((candidate) => {
      if (candidate.surfaceType !== 'CYLINDRE') return false
      const candidateCenter = [
        (candidate.min[0] + candidate.max[0]) / 2,
        (candidate.min[1] + candidate.max[1]) / 2,
      ]
      const depth = candidate.max[2] - candidate.min[2]
      return (
        closeEnough(candidateCenter[0], center[0], 0.04) &&
        closeEnough(candidateCenter[1], center[1], 0.04) &&
        candidate.min[2] >= zMin - 0.03 &&
        candidate.max[2] <= zMax + 0.03 &&
        depth >= 0.5
      )
    })
    .sort(
      (first, second) =>
        second.max[2] - second.min[2] - (first.max[2] - first.min[2]),
    )[0]

  if (!record) return { diameter: Number.NaN, depth: Number.NaN }
  return {
    diameter: Math.max(
      record.max[0] - record.min[0],
      record.max[1] - record.min[1],
    ),
    depth: record.max[2] - record.min[2],
  }
}

export function measureMountingHoleProfiles(
  shape: Shape3D,
  centers: ReadonlyArray<[number, number]>,
  zRanges: {
    lower: readonly [number, number]
    upper: readonly [number, number]
  } = {
    lower: [-0.03, OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleStepHeight],
    upper: [
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleStepHeight,
      OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight,
    ],
  },
): OpenGridStackableBoxMountingHoleProfile[] {
  const records = readFaceQualityRecords(shape)
  return centers.map((center) => {
    const lower = cylindricalFaceProfileAt(records, center, ...zRanges.lower)
    const upper = cylindricalFaceProfileAt(records, center, ...zRanges.upper)
    return {
      center,
      lowerBoreDiameter: lower.diameter,
      lowerBoreDepth: lower.depth,
      upperBoreDiameter: upper.diameter,
      upperBoreDepth: upper.depth,
    }
  })
}

export function countOrdinaryBottomHoleFaces(
  shape: Shape3D,
  centers: ReadonlyArray<[number, number]>,
  parameters?: OpenGridStackableBoxParameters,
): number {
  if (centers.length === 0) return 0

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const bottomThickness = activeBottomThicknessFor(parameters)
  const records = readFaceQualityRecords(shape)
  let count = 0

  for (const [centerX, centerY] of centers) {
    const hasThroughHole = records.some((record) => {
      if (record.surfaceType !== 'CYLINDRE') return false
      const center = [
        (record.min[0] + record.max[0]) / 2,
        (record.min[1] + record.max[1]) / 2,
      ]
      const diameter = Math.max(
        record.max[0] - record.min[0],
        record.max[1] - record.min[1],
      )
      return (
        closeEnough(center[0], centerX, 0.04) &&
        closeEnough(center[1], centerY, 0.04) &&
        closeEnough(diameter, configuration.bottomGridHoleDiameter, 0.04) &&
        record.min[2] >= -0.03 &&
        record.max[2] >= bottomThickness - 0.03
      )
    })

    if (hasThroughHole) count += 1
  }

  return count
}

function makeFlangedSocketInsert(
  center: [number, number],
  parameters?: OpenGridStackableBoxParameters,
): Shape3D {
  const bottomThickness = activeBottomThicknessFor(parameters)
  const interfaceConfiguration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  const shaft = makeCylinder(
    interfaceConfiguration.testShaftDiameter / 2,
    interfaceConfiguration.testShaftLengthForFloor(bottomThickness),
    [center[0], center[1], -interfaceConfiguration.testShaftExposure],
  )
  const flange = makeCylinder(
    interfaceConfiguration.testFlangeDiameter / 2,
    interfaceConfiguration.testFlangeHeight,
    [center[0], center[1], bottomThickness],
  )
  const insert = shaft.fuse(flange)
  deleteShape(shaft)
  deleteShape(flange)
  return insert
}

function socketChipZone(
  center: readonly [number, number],
  parameters?: OpenGridStackableBoxParameters,
): Bounds {
  const pad = 1
  const zBounds = openGridStackableBoxQualityRegionZBounds(
    parameters ?? OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  )
  const radius = Math.max(
    OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter,
    OPENGRID_STACKABLE_BOX_CONFIGURATION.baseFlangeDiameter,
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeDiameter,
  )
  return [
    [center[0] - radius - pad, center[1] - radius - pad, zBounds.bottomMinZ],
    [center[0] + radius + pad, center[1] + radius + pad, zBounds.bottomMaxZ],
  ]
}

function volumeAtBottomOpeningBoundary(
  shape: Shape3D,
  center: [number, number],
  target: Shape3D = shape,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const outer = makeCylinder(
    configuration.baseHoleBottomOpeningDiameter / 2 + 0.2,
    0.1,
    [center[0], center[1], -0.02],
  )
  const inner = makeCylinder(
    configuration.baseHoleBottomOpeningDiameter / 2 + 0.1,
    0.1,
    [center[0], center[1], -0.02],
  )
  const ring = outer.cut(inner)
  deleteShape(outer)
  deleteShape(inner)
  let intersection: Shape3D | null = null
  try {
    intersection = target.intersect(ring)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== target) deleteShape(intersection)
    deleteShape(ring)
  }
}

export function inspectCaptiveSocketInterface(
  shape: Shape3D,
  center: [number, number],
  parameters?: OpenGridStackableBoxParameters,
  regions?: OpenGridStackableBoxQualityRegions,
): OpenGridStackableBoxCaptiveSocketRecord {
  const bottomThickness = activeBottomThicknessFor(parameters)
  const stepHeight = mountingHoleStepHeightFor(parameters)
  const insert = makeFlangedSocketInsert(center, parameters)
  const target = regions
    ? regions.bottomZone(socketChipZone(center, parameters))
    : shape
  let seatedIntersection: Shape3D | null = null
  let loweredInsert: Shape3D | null = null
  let loweredIntersection: Shape3D | null = null
  try {
    seatedIntersection = target.intersect(insert)
    const retentionProbeOffset = Math.max(
      0.2,
      bottomThickness - stepHeight + 0.2,
    )
    loweredInsert = insert.clone().translateZ(-retentionProbeOffset)
    loweredIntersection = target.intersect(loweredInsert)
    return {
      seatedIntersectionVolume: measureVolume(seatedIntersection),
      loweredIntersectionVolume: measureVolume(loweredIntersection),
      bottomOpeningBoundaryVolume: volumeAtBottomOpeningBoundary(
        shape,
        center,
        target,
      ),
      shaftBounds: readBounds(insert),
    }
  } finally {
    if (seatedIntersection && seatedIntersection !== target) {
      deleteShape(seatedIntersection)
    }
    if (loweredIntersection && loweredIntersection !== target) {
      deleteShape(loweredIntersection)
    }
    deleteShape(loweredInsert)
    deleteShape(insert)
  }
}
