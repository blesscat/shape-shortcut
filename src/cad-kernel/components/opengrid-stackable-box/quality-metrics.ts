import {
  getOC,
  makeBox,
  measureVolume,
  type Face,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { closeEnough, deleteShape, type Bounds } from './shared'

export type ReliefSeam = {
  axis: 'x' | 'y'
  position: number
}

export type FaceQualityRecord = {
  surfaceType: string
  min: [number, number, number]
  max: [number, number, number]
  normal: [number, number, number] | null
}

export function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

export function isBRepValid(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

export function volumeInBox(
  shape: Shape3D,
  min: [number, number, number],
  max: [number, number, number],
  target: Shape3D = shape,
): number {
  const probe = makeBox(min, max)
  let intersection: Shape3D | null = null
  try {
    intersection = target.intersect(probe)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== target) deleteShape(intersection)
    deleteShape(probe)
  }
}

export type EdgeBandTargetFor = (
  axis: 'x' | 'y',
  sign: -1 | 1,
) => Shape3D | undefined

function edgeBandBounds(
  width: number,
  depth: number,
  axis: 'x' | 'y',
  sign: -1 | 1,
  innerDistance: number,
  outerDistance: number,
  zMin: number,
  zMax: number,
  crossCenter = 0,
): Bounds {
  const axisHalfExtent = axis === 'x' ? width / 2 : depth / 2
  const crossHalfExtent = axis === 'x' ? depth / 2 : width / 2
  const crossHalfLength = Math.min(2, crossHalfExtent / 2)
  const positiveMin = axisHalfExtent - innerDistance
  const positiveMax = axisHalfExtent - outerDistance
  const axisMin = sign > 0 ? positiveMin : -positiveMax
  const axisMax = sign > 0 ? positiveMax : -positiveMin

  if (axis === 'x') {
    return [
      [axisMin, crossCenter - crossHalfLength, zMin],
      [axisMax, crossCenter + crossHalfLength, zMax],
    ]
  }

  return [
    [crossCenter - crossHalfLength, axisMin, zMin],
    [crossCenter + crossHalfLength, axisMax, zMax],
  ]
}

export function edgeBandVolumes(
  shape: Shape3D,
  width: number,
  depth: number,
  innerDistance: number,
  outerDistance: number,
  zMin: number,
  zMax: number,
  crossCenters: { x?: number; y?: number } = {},
  targetFor?: EdgeBandTargetFor,
): number[] {
  const volumes: number[] = []
  for (const axis of ['x', 'y'] as const) {
    for (const sign of [-1, 1] as const) {
      const [min, max] = edgeBandBounds(
        width,
        depth,
        axis,
        sign,
        innerDistance,
        outerDistance,
        zMin,
        zMax,
        axis === 'x' ? (crossCenters.y ?? 0) : (crossCenters.x ?? 0),
      )
      volumes.push(volumeInBox(shape, min, max, targetFor?.(axis, sign)))
    }
  }
  return volumes
}

export function edgeBandExpectedVolumes(
  width: number,
  depth: number,
  innerDistance: number,
  outerDistance: number,
  zMin: number,
  zMax: number,
): number[] {
  const bandWidth = innerDistance - outerDistance
  const height = Math.max(0, zMax - zMin)
  const xEdgeLength = 2 * Math.min(2, depth / 4)
  const yEdgeLength = 2 * Math.min(2, width / 4)
  return [
    bandWidth * xEdgeLength * height,
    bandWidth * xEdgeLength * height,
    bandWidth * yEdgeLength * height,
    bandWidth * yEdgeLength * height,
  ]
}

export function readFaceQualityRecords(shape: Shape3D): FaceQualityRecord[] {
  const records: FaceQualityRecord[] = []
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    let normal: ReturnType<typeof face.normalAt> | null = null
    try {
      if (face.surface.surfaceType === 'PLANE') normal = face.normalAt()
      const [min, max] = boundingBox.bounds as Bounds
      records.push({
        surfaceType: face.surface.surfaceType,
        min: [min[0], min[1], min[2]],
        max: [max[0], max[1], max[2]],
        normal: normal ? [normal.x, normal.y, normal.z] : null,
      })
    } finally {
      boundingBox.delete()
      normal?.delete()
      face.delete()
    }
  }
  return records
}

export function countFortyFiveDegreeFaces(
  shape: Shape3D,
  zMin: number,
  zMax: number,
  expectedSpan: number,
  normalZSign: -1 | 0 | 1,
  minimumSpanRatio = 0.7,
): number {
  const records = readFaceQualityRecords(shape)
  let count = 0
  for (const record of records) {
    if (
      isFortyFiveDegreeFace(
        record,
        zMin,
        zMax,
        expectedSpan,
        normalZSign,
        minimumSpanRatio,
      )
    ) {
      count += 1
    }
  }
  return count
}

function isFortyFiveDegreeFace(
  record: FaceQualityRecord,
  zMin: number,
  zMax: number,
  expectedSpan: number,
  normalZSign: -1 | 0 | 1,
  minimumSpanRatio: number,
): boolean {
  if (record.surfaceType !== 'PLANE' || record.normal === null) return false
  const faceMinZ = record.min[2]
  const faceMaxZ = record.max[2]
  const span = faceMaxZ - faceMinZ
  const normalZ = record.normal[2]
  const spanIsExpected =
    span >= expectedSpan * minimumSpanRatio && span <= expectedSpan * 1.3
  const zRangeIsExpected = faceMinZ >= zMin - 0.03 && faceMaxZ <= zMax + 0.03
  const normalIsExpected =
    (normalZSign === 0 || normalZ * normalZSign > 0) &&
    closeEnough(Math.abs(normalZ), Math.SQRT1_2, 0.12)
  return spanIsExpected && zRangeIsExpected && normalIsExpected
}

export function countFortyFiveDegreeFacesNearSeam(
  shape: Shape3D,
  seam: ReliefSeam,
  zMin: number,
  zMax: number,
  expectedSpan: number,
  normalZSign: -1 | 0 | 1,
): number {
  const records = readFaceQualityRecords(shape)
  let count = 0
  for (const record of records) {
    const coordinate = seam.axis === 'x' ? 0 : 1
    const coordinateMin = record.min[coordinate]
    const coordinateMax = record.max[coordinate]
    const distanceToSeam = Math.max(
      coordinateMin - seam.position,
      seam.position - coordinateMax,
      0,
    )
    if (
      distanceToSeam > expectedSpan + 0.03 ||
      coordinateMax - coordinateMin > expectedSpan * 1.3
    ) {
      continue
    }
    if (
      isFortyFiveDegreeFace(record, zMin, zMax, expectedSpan, normalZSign, 0.7)
    ) {
      count += 1
    }
  }
  return count
}

export function countReliefApexFaces(
  shape: Shape3D,
  seams: ReadonlyArray<ReliefSeam>,
  supportTopZ: number,
  apexTopZ: number,
  seamHalfWidth: number,
  seamProfileSpan: number,
): number {
  const records = readFaceQualityRecords(shape)
  let count = 0

  for (const record of records) {
    if (record.surfaceType !== 'PLANE' || record.normal === null) continue
    if (
      Math.abs(Math.abs(record.normal[2]) - Math.SQRT1_2) > 0.05 ||
      Math.abs(record.min[2] - supportTopZ) > 0.05 ||
      Math.abs(record.max[2] - apexTopZ) > 0.05
    ) {
      continue
    }

    const belongsToRelief = seams.some((seam) => {
      const coordinate = seam.axis === 'x' ? 0 : 1
      const coordinateSpan = record.max[coordinate] - record.min[coordinate]
      if (coordinateSpan > seamProfileSpan * 1.3) return false

      if (seam.axis === 'x') {
        return (
          record.min[0] <= seam.position + seamHalfWidth + 0.05 &&
          record.max[0] >= seam.position - seamHalfWidth - 0.05 &&
          record.max[1] - record.min[1] >= 2
        )
      }

      return (
        record.min[1] <= seam.position + seamHalfWidth + 0.05 &&
        record.max[1] >= seam.position - seamHalfWidth - 0.05 &&
        record.max[0] - record.min[0] >= 2
      )
    })

    if (belongsToRelief) count += 1
  }

  return count
}

export function countVerticalProfileFaces(
  shape: Shape3D,
  zMin: number,
  zMax: number,
  expectedSpan: number,
): number {
  const records = readFaceQualityRecords(shape)
  let count = 0
  for (const record of records) {
    if (record.surfaceType !== 'PLANE' || record.normal === null) continue
    const span = record.max[2] - record.min[2]
    const spanIsExpected =
      span >= expectedSpan * 0.7 && span <= expectedSpan * 1.3
    const zRangeIsExpected =
      record.min[2] >= zMin - 0.03 && record.max[2] <= zMax + 0.03
    const normalIsVertical = Math.abs(record.normal[2]) < 0.12
    if (spanIsExpected && zRangeIsExpected && normalIsVertical) count += 1
  }
  return count
}

export function countRoundedProfileContinuationFaces(
  shape: Shape3D,
  zMin: number,
  zMax: number,
): number {
  const records = readFaceQualityRecords(shape)
  return records.filter((record) => {
    const isRoundedSurface =
      record.surfaceType === 'CONE' || record.surfaceType === 'CYLINDRE'
    const overlapsProfile = record.min[2] < zMax && record.max[2] > zMin
    const spansCorner =
      record.max[0] - record.min[0] > 0.2 && record.max[1] - record.min[1] > 0.2
    return isRoundedSurface && overlapsProfile && spansCorner
  }).length
}

function cylinderRadiusFor(face: Face): number | null {
  const surface = face.surface
  try {
    if (surface.surfaceType !== 'CYLINDRE') return null
    const oc = getOC()
    const adaptor = new oc.BRepAdaptor_Surface_2(face.wrapped, false)
    try {
      const cylinder = adaptor.Cylinder()
      try {
        return cylinder.Radius()
      } finally {
        cylinder.delete()
      }
    } finally {
      adaptor.delete()
    }
  } finally {
    surface.delete()
  }
}

export function countRoundedProfileFacesWithRadius(
  shape: Shape3D,
  zMin: number,
  zMax: number,
  expectedRadius: number,
  tolerance = 0.05,
): number {
  let count = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [min, max] = boundingBox.bounds as Bounds
      const overlapsProfile = min[2] < zMax && max[2] > zMin
      const spansCorner = max[0] - min[0] > 0.2 && max[1] - min[1] > 0.2
      const radius = cylinderRadiusFor(face)
      if (
        overlapsProfile &&
        spansCorner &&
        radius !== null &&
        Math.abs(radius - expectedRadius) <= tolerance
      ) {
        count += 1
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return count
}

export function countHorizontalReliefClosureFaces(
  shape: Shape3D,
  seams: ReadonlyArray<ReliefSeam>,
  closureZ: number,
  closureHalfWidth: number,
): number {
  const records = readFaceQualityRecords(shape)
  let count = 0

  for (const record of records) {
    if (record.surfaceType !== 'PLANE' || record.normal === null) continue
    const zSpan = record.max[2] - record.min[2]
    const normalIsHorizontal = Math.abs(record.normal[2]) > 0.95
    const isClosurePlane =
      Math.abs(record.min[2] - closureZ) < 0.05 &&
      Math.abs(record.max[2] - closureZ) < 0.05
    if (!normalIsHorizontal || zSpan > 0.08 || !isClosurePlane) continue

    const belongsToRelief = seams.some((seam) => {
      if (seam.axis === 'x') {
        return (
          record.min[0] <= seam.position + closureHalfWidth + 0.05 &&
          record.max[0] >= seam.position - closureHalfWidth - 0.05 &&
          record.max[1] - record.min[1] >= 2
        )
      }

      return (
        record.min[1] <= seam.position + closureHalfWidth + 0.05 &&
        record.max[1] >= seam.position - closureHalfWidth - 0.05 &&
        record.max[0] - record.min[0] >= 2
      )
    })

    if (belongsToRelief) count += 1
  }

  return count
}
