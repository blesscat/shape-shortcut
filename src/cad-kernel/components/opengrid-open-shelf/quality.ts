import { measureVolume, type Shape3D } from 'replicad'
import {
  boundsForOpenGridOpenShelf,
  openGridOpenShelfFrontToRearElevationFor,
  openGridOpenShelfDepthFor,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfPegCentersFor,
  openGridOpenShelfTopOuterRearZFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  type OpenGridOpenShelfParameters,
} from '../../../cad-contract/units'
import { openGridOpenShelfHoneycombCellCountFor } from '../../lattice/opengrid-honeycomb'
import { closeEnough } from '../../shape-query/compare'
import { countSolids } from '../../shape-query/solids'

type MeshLike = {
  bounds: { min: number[]; max: number[] }
}

export type OpenGridOpenShelfQualityReport = {
  passed: boolean
  failures: string[]
  volume: number
  honeycombMode: boolean
  honeycombCellCount: number
}

type FaceBounds = {
  surfaceType: string
  min: [number, number, number]
  max: [number, number, number]
}

function faceBoundsFor(shape: Shape3D): FaceBounds[] {
  const result: FaceBounds[] = []
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [min, max] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      result.push({
        surfaceType: face.surface.surfaceType,
        min,
        max,
      })
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return result
}

function span(face: FaceBounds, axis: 0 | 1 | 2): number {
  return face.max[axis] - face.min[axis]
}

function hasPegChamferAt(
  faces: readonly FaceBounds[],
  center: readonly [number, number],
): boolean {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const locating = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  return faces.some((face) => {
    const planSpan = Math.max(span(face, 0), span(face, 1))
    const faceCenterX = (face.min[0] + face.max[0]) / 2
    const faceCenterY = (face.min[1] + face.max[1]) / 2
    return (
      face.surfaceType === 'CONE' &&
      Math.abs(faceCenterX - center[0]) <= 0.08 &&
      Math.abs(faceCenterY - center[1]) <= 0.08 &&
      closeEnough(planSpan, configuration.pegDiameter, 0.2) &&
      span(face, 2) >= locating.integratedSeatBottomChamfer * 0.7 &&
      face.min[2] <= -configuration.pegHeight + 0.05 &&
      face.max[2] <=
        -configuration.pegHeight + locating.integratedSeatBottomChamfer + 0.1
    )
  })
}

function inspectGeometryInterfaces(
  shape: Shape3D,
  parameters: OpenGridOpenShelfParameters,
  failures: string[],
): void {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  const yFront = -depth / 2
  const yRear = depth / 2
  const innerWidth = width - 2 * configuration.outerWallThickness
  const cellWidth = innerWidth / parameters.cellX

  const faces = faceBoundsFor(shape)
  const broadPlanarFaces = faces.filter(
    (face) =>
      face.surfaceType === 'PLANE' &&
      span(face, 0) >= cellWidth * 0.5 &&
      span(face, 1) >= depth * 0.65 &&
      face.min[1] <= yFront + 1 &&
      face.max[1] >= yRear - configuration.backboardThickness - 0.2,
  )
  const elevation = openGridOpenShelfFrontToRearElevationFor(parameters)
  if (broadPlanarFaces.length < parameters.cellZ) {
    failures.push('full-depth-plates')
  }
  if (
    parameters.angle > 0 &&
    !broadPlanarFaces.some((face) => span(face, 2) >= elevation * 0.5)
  ) {
    failures.push('common-inclination')
  }

  const frontWall = faces.some(
    (face) =>
      face.surfaceType === 'PLANE' &&
      span(face, 0) >= innerWidth * 0.7 &&
      span(face, 1) <= configuration.innerPlateThickness + 0.8 &&
      face.min[1] > yFront + 0.05 &&
      face.max[1] <= yFront + 1 &&
      span(face, 2) > 3,
  )
  if (frontWall) failures.push('front-opening')

  const backboard = faces.some(
    (face) =>
      face.surfaceType === 'PLANE' &&
      span(face, 0) >= width * 0.7 &&
      span(face, 1) <= configuration.backboardThickness + 0.4 &&
      span(face, 2) >= 2 &&
      face.max[1] >= yRear - configuration.backboardThickness - 0.2,
  )
  if (!backboard) failures.push('vertical-backboard')

  const rearFullDepthPlate = faces.some(
    (face) =>
      face.surfaceType === 'PLANE' &&
      span(face, 0) >= cellWidth * 0.6 &&
      face.max[1] >= yRear - 0.8 &&
      face.min[1] <= yRear + 0.1,
  )
  if (!rearFullDepthPlate) failures.push('rear-contact')

  const dividerFaces = faces.filter(
    (face) =>
      face.surfaceType === 'PLANE' &&
      span(face, 0) <= configuration.innerPlateThickness + 0.5 &&
      span(face, 1) >= depth * 0.65 &&
      span(face, 2) > 2,
  )
  if (dividerFaces.length < Math.max(0, parameters.cellX - 1)) {
    failures.push('vertical-divider-count')
  }

  const pegFaces = faces.filter(
    (face) =>
      face.surfaceType === 'CYLINDRE' &&
      face.min[2] <=
        -configuration.pegHeight +
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatBottomChamfer +
          0.1 &&
      face.max[2] >= -0.2,
  )
  if (pegFaces.length !== 4) failures.push('peg-count')
  const pegCenters = openGridOpenShelfPegCentersFor(parameters)
  if (
    pegCenters.filter((center) => hasPegChamferAt(faces, center)).length !==
    pegCenters.length
  ) {
    failures.push('peg-chamfer')
  }
  for (const [index, face] of pegFaces.entries()) {
    const diameter = Math.max(span(face, 0), span(face, 1))
    if (!closeEnough(diameter, configuration.pegDiameter, 0.25)) {
      failures.push(`peg-diameter:${index}`)
    }
    if (diameter > configuration.pegDiameter + 0.35) {
      failures.push(`peg-shoulder:${index}`)
    }
  }

  const outerCornerArcFaces = faces.filter(
    (face) =>
      face.surfaceType === 'CYLINDRE' &&
      face.min[2] >= -0.1 &&
      face.max[2] > 1 &&
      closeEnough(
        Math.max(span(face, 0), span(face, 1)),
        configuration.outerCornerRadius,
        0.25,
      ),
  )
  if (outerCornerArcFaces.length !== 4) {
    failures.push('outer-corner-arcs')
  }

  const rearZ = openGridOpenShelfTopOuterRearZFor(parameters)
  const topRearArcFaces = faces.filter(
    (face) =>
      face.surfaceType === 'CYLINDRE' &&
      span(face, 0) > width * 0.5 &&
      span(face, 1) > configuration.topOuterEdgeRadius * 0.5 &&
      span(face, 2) <= configuration.topOuterEdgeRadius + 0.2 &&
      face.min[2] >= rearZ - configuration.topOuterEdgeRadius - 0.2 &&
      face.max[2] <= rearZ + 0.2,
  )
  const topSideArcFaces = faces.filter(
    (face) =>
      face.surfaceType === 'CYLINDRE' &&
      span(face, 0) <= configuration.topOuterEdgeRadius + 0.2 &&
      span(face, 1) > depth * 0.5 &&
      span(face, 2) > 0.2 &&
      face.max[2] >= parameters.height - configuration.topOuterEdgeRadius - 0.2,
  )
  if (topRearArcFaces.length !== 1 || topSideArcFaces.length !== 2) {
    failures.push('top-outer-arcs')
  }
}

export function inspectOpenGridOpenShelfShapeQuality(
  shape: Shape3D,
  parameters: OpenGridOpenShelfParameters,
  mesh: MeshLike,
): OpenGridOpenShelfQualityReport {
  const expectedBounds = boundsForOpenGridOpenShelf(parameters)
  const failures: string[] = []
  const actualMin = mesh.bounds.min
  const actualMax = mesh.bounds.max
  const expectedMin = expectedBounds.min
  const expectedMax = expectedBounds.max

  for (let index = 0; index < 3; index += 1) {
    if (!closeEnough(actualMin[index] ?? NaN, expectedMin[index] ?? NaN)) {
      failures.push(`mesh.min[${index}]`)
    }
    if (!closeEnough(actualMax[index] ?? NaN, expectedMax[index] ?? NaN)) {
      failures.push(`mesh.max[${index}]`)
    }
  }

  if (countSolids(shape) !== 1) failures.push('single-solid')
  const volume = measureVolume(shape)
  if (volume <= 0) failures.push('positive-volume')
  const honeycombCellCount = openGridOpenShelfHoneycombCellCountFor(parameters)
  if (
    OPENGRID_OPEN_SHELF_CONFIGURATION.pegHeight <= 0 ||
    OPENGRID_OPEN_SHELF_CONFIGURATION.pegDiameter <= 0
  ) {
    failures.push('peg-configuration')
  }

  inspectGeometryInterfaces(shape, parameters, failures)

  return {
    passed: failures.length === 0,
    failures,
    volume,
    honeycombMode: parameters.honeycombMode,
    honeycombCellCount,
  }
}

export function assertOpenGridOpenShelfShapeQuality(
  shape: Shape3D,
  parameters: OpenGridOpenShelfParameters,
  mesh: MeshLike,
): void {
  const report = inspectOpenGridOpenShelfShapeQuality(shape, parameters, mesh)
  if (!report.passed) {
    throw new Error(
      `OPENGRID_OPEN_SHELF_QUALITY_FAILED:${report.failures.join(',')}`,
    )
  }
}
