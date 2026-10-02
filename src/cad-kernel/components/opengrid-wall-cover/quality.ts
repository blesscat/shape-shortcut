import { getOC, measureVolume, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridWallCover,
  OPENGRID_WALL_COVER_CONFIGURATION,
  type ModelBounds,
  type OpenGridWallCoverParameters,
} from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'
import {
  OPENGRID_WALL_COVER_TEXT_CONFIGURATION,
  openGridWallCoverTextTopZ,
} from './flat-text'
import { deleteShape } from '../../lifetime/dispose'

const QUALITY_TOLERANCE = 0.05
const BODY_ENVELOPE_TOLERANCE = 0.45

export type OpenGridWallCoverQualityReport = {
  passed: true
  failures: readonly []
  bounds: ModelBounds
  referenceBounds: ModelBounds
  solidCount: number
  meshTriangleCount: number
}

function readBounds(shape: Shape3D): ModelBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return { min: [...min], max: [...max] }
  } finally {
    boundingBox.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= QUALITY_TOLERANCE
}

function boundsAreFinite(bounds: ModelBounds): boolean {
  return [...bounds.min, ...bounds.max].every(Number.isFinite)
}

function boundsMatch(
  first: ModelBounds,
  second: ModelBounds,
  tolerance = QUALITY_TOLERANCE,
): boolean {
  const firstCoordinates = [...first.min, ...first.max]
  const secondCoordinates = [...second.min, ...second.max]
  return firstCoordinates.every(
    (value, index) => Math.abs(value - secondCoordinates[index]!) <= tolerance,
  )
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
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

function solidBounds(shape: Shape3D): ModelBounds[] {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  const bounds: ModelBounds[] = []
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        bounds.push(readBounds(solid))
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
    return bounds
  } finally {
    explorer.delete()
  }
}

type CoverEnvelope = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function coverEnvelopesFor(
  parameters: OpenGridWallCoverParameters,
): CoverEnvelope[] {
  const coverCount = Array.from(parameters.text).length
  const coverWidth = OPENGRID_WALL_COVER_CONFIGURATION.coverWidth
  const coverStep = coverWidth + OPENGRID_WALL_COVER_CONFIGURATION.coverGap
  const coverBounds = boundsForOpenGridWallCover({ text: 'A' })
  const centerOffset = ((coverCount - 1) * coverStep) / 2
  return Array.from({ length: coverCount }, (_, index) => {
    const centerX = index * coverStep - centerOffset
    return {
      minX: centerX - coverWidth / 2,
      maxX: centerX + coverWidth / 2,
      minY: coverBounds.min[1],
      maxY: coverBounds.max[1],
    }
  })
}

function coverIndexFor(
  bounds: ModelBounds,
  envelopes: readonly CoverEnvelope[],
): number {
  const candidates = envelopes.flatMap((envelope, index) => {
    const contained =
      bounds.min[0] >= envelope.minX - BODY_ENVELOPE_TOLERANCE &&
      bounds.max[0] <= envelope.maxX + BODY_ENVELOPE_TOLERANCE &&
      bounds.min[1] >= envelope.minY - BODY_ENVELOPE_TOLERANCE &&
      bounds.max[1] <= envelope.maxY + BODY_ENVELOPE_TOLERANCE
    return contained ? [index] : []
  })
  return candidates.length === 1 ? candidates[0]! : -1
}

function perCoverQualityFailures(
  bodyShape: Shape3D,
  textShape: Shape3D,
  parameters: OpenGridWallCoverParameters,
  expectedTop: number,
): string[] {
  const envelopes = coverEnvelopesFor(parameters)
  const bodyCounts = envelopes.map(() => 0)
  const bodyTopSeen = envelopes.map(() => false)
  const textCounts = envelopes.map(() => 0)
  const failures: string[] = []

  for (const bounds of solidBounds(bodyShape)) {
    const coverIndex = coverIndexFor(bounds, envelopes)
    if (coverIndex < 0) {
      failures.push('cover-body-placement')
      continue
    }
    bodyCounts[coverIndex] = (bodyCounts[coverIndex] ?? 0) + 1
    if (isClose(bounds.max[2], expectedTop)) {
      bodyTopSeen[coverIndex] = true
    }
  }

  for (const bounds of solidBounds(textShape)) {
    const coverIndex = coverIndexFor(bounds, envelopes)
    if (coverIndex < 0) {
      failures.push('cover-text-placement')
      continue
    }
    textCounts[coverIndex] = (textCounts[coverIndex] ?? 0) + 1
  }

  if (bodyCounts.some((count) => count !== 9)) {
    failures.push('cover-body-solid-count')
  }
  if (bodyTopSeen.some((seen) => !seen)) {
    failures.push('cover-body-top')
  }
  if (textCounts.some((count) => count < 1)) {
    failures.push('cover-text-solid-count')
  }
  return failures
}

function meshIsFinite(mesh: MeshData | MeshSnapshot): boolean {
  const positions =
    mesh.positions instanceof ArrayBuffer
      ? new Float32Array(mesh.positions)
      : mesh.positions
  const normals =
    mesh.normals instanceof ArrayBuffer
      ? new Float32Array(mesh.normals)
      : mesh.normals
  const indices =
    mesh.indices instanceof ArrayBuffer
      ? new Uint32Array(mesh.indices)
      : mesh.indices
  return (
    positions.length > 0 &&
    normals.length === positions.length &&
    indices.length > 0 &&
    indices.length % 3 === 0 &&
    [...positions, ...normals].every(Number.isFinite) &&
    [...indices].every(Number.isSafeInteger)
  )
}

function meshZValuesStayWithinTextSlab(
  mesh: MeshData | MeshSnapshot,
  expectedBottom: number,
  expectedTop: number,
): boolean {
  const positions =
    mesh.positions instanceof ArrayBuffer
      ? new Float32Array(mesh.positions)
      : mesh.positions
  for (let index = 2; index < positions.length; index += 3) {
    const z = positions[index]
    if (
      z === undefined ||
      z < expectedBottom - QUALITY_TOLERANCE ||
      z > expectedTop + QUALITY_TOLERANCE
    ) {
      return false
    }
  }
  return true
}

function assertTextIsContained(bodyShape: Shape3D, textShape: Shape3D): void {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    textShape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let solidCount = 0
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      let intersection: Shape3D | null = null
      try {
        const solidVolume = measureVolume(solid)
        intersection = bodyShape.intersect(solid)
        const containedVolume = measureVolume(intersection)
        if (
          !Number.isFinite(solidVolume) ||
          solidVolume <= 0 ||
          !Number.isFinite(containedVolume) ||
          Math.abs(solidVolume - containedVolume) > QUALITY_TOLERANCE
        ) {
          throw new Error('OPENGRID_WALL_COVER_TEXT_NOT_CONTAINED')
        }
        solidCount += 1
      } finally {
        deleteShape(intersection)
        solid.delete()
      }
      explorer.Next()
    }
    if (solidCount === 0) {
      throw new Error('OPENGRID_WALL_COVER_TEXT_NOT_CONTAINED')
    }
  } finally {
    explorer.delete()
  }
}

function assertTextDoesNotIntersectBody(
  bodyShape: Shape3D,
  textShape: Shape3D,
): void {
  let intersection: Shape3D | null = null
  try {
    intersection = bodyShape.intersect(textShape)
    const overlapVolume = measureVolume(intersection)
    if (!Number.isFinite(overlapVolume) || overlapVolume > QUALITY_TOLERANCE) {
      throw new Error('OPENGRID_WALL_COVER_TEXT_CAVITY_INVALID')
    }
  } finally {
    deleteShape(intersection)
  }
}

export function assertOpenGridWallCoverShapeQuality(
  baseShape: Shape3D,
  bodyShape: Shape3D,
  textShape: Shape3D,
  baseMesh: MeshData | MeshSnapshot,
  textMesh: MeshData | MeshSnapshot,
  reference: Shape3D,
  parameters: OpenGridWallCoverParameters,
): OpenGridWallCoverQualityReport {
  const baseBounds = readBounds(baseShape)
  const referenceBounds = readBounds(reference)
  const bodyBounds = readBounds(bodyShape)
  const textBounds = readBounds(textShape)
  const expectedBounds = boundsForOpenGridWallCover(parameters)
  const expectedCoverCount = Array.from(parameters.text).length
  const expectedTop = openGridWallCoverTextTopZ()
  const expectedBottom =
    expectedTop - OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth
  const textCoordinates = [...textBounds.min, ...textBounds.max]
  const failures: string[] = []
  const baseSolidCount = countSolids(baseShape)
  if (
    !boundsAreFinite(baseBounds) ||
    !boundsAreFinite(referenceBounds) ||
    !boundsMatch(baseBounds, expectedBounds, BODY_ENVELOPE_TOLERANCE)
  ) {
    failures.push('reference-envelope')
  }
  if (
    !boundsAreFinite(referenceBounds) ||
    !boundsMatch(
      referenceBounds,
      boundsForOpenGridWallCover({ text: 'A' }),
      BODY_ENVELOPE_TOLERANCE,
    )
  ) {
    failures.push('reference-bounds')
  }
  if (
    baseSolidCount !== 9 * expectedCoverCount ||
    countSolids(reference) !== 9
  ) {
    failures.push('reference-solids')
  }
  if (countSolids(bodyShape) !== 9 * expectedCoverCount) {
    failures.push('body-solids')
  }
  if (countSolids(textShape) === 0) failures.push('text-solids')
  if (textCoordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    failures.push('text-coordinates')
  }
  if (
    Math.abs(bodyBounds.max[2] - baseBounds.max[2]) > BODY_ENVELOPE_TOLERANCE
  ) {
    failures.push('body-top')
  }
  if (
    textBounds.min[0] < baseBounds.min[0] - BODY_ENVELOPE_TOLERANCE ||
    textBounds.max[0] > baseBounds.max[0] + BODY_ENVELOPE_TOLERANCE ||
    textBounds.min[1] < baseBounds.min[1] - BODY_ENVELOPE_TOLERANCE ||
    textBounds.max[1] > baseBounds.max[1] + BODY_ENVELOPE_TOLERANCE
  ) {
    failures.push('text-envelope')
  }
  if (!meshIsFinite(baseMesh)) failures.push('base-mesh-values')
  if (baseMesh.triangleCount <= 0) failures.push('base-mesh-triangles')
  if (!isClose(textMesh.bounds.min[2], expectedBottom)) {
    failures.push('text-bottom')
  }
  if (!isClose(textMesh.bounds.max[2], expectedTop)) {
    failures.push('text-top')
  }
  if (!meshZValuesStayWithinTextSlab(textMesh, expectedBottom, expectedTop)) {
    failures.push('text-z-planes')
  }
  if (!meshIsFinite(textMesh)) failures.push('text-mesh-values')
  if (textMesh.triangleCount <= 0) failures.push('text-mesh-triangles')
  failures.push(
    ...perCoverQualityFailures(bodyShape, textShape, parameters, expectedTop),
  )
  if (failures.length > 0) {
    throw new Error(
      `OPENGRID_WALL_COVER_QUALITY_INVALID:flat-text-bounds:${failures.join(',')}`,
    )
  }

  assertTextDoesNotIntersectBody(bodyShape, textShape)
  assertTextIsContained(baseShape, textShape)
  return {
    passed: true,
    failures: [],
    bounds: baseBounds,
    referenceBounds,
    solidCount: baseSolidCount,
    meshTriangleCount: baseMesh.triangleCount,
  }
}
