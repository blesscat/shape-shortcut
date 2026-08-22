import { getOC, makeCylinder, measureVolume, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForPillar,
  pillarBodyDiameterForParameters,
  pillarFlangeDiameterForParameters,
  pillarLengthForParameters,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  PILLAR_CONFIGURATION,
  type ModelBounds,
  type PillarParameters,
} from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'

const QUALITY_TOLERANCE = 0.05
const PROBE_VOLUME_EPSILON = 1e-8

export type PillarQualityReport = {
  passed: boolean
  failures: string[]
  bounds: ModelBounds | null
  expectedBounds: ModelBounds
  volume: number | null
  solidCount: number | null
  meshTriangleCount: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Quality cleanup must not hide the original diagnostic.
  }
}

function readBounds(shape: Shape3D): ModelBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return { min, max }
  } finally {
    boundingBox.delete()
  }
}

function boundsMatch(actual: ModelBounds, expected: ModelBounds): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return Math.abs(coordinate - expectedCoordinate) <= QUALITY_TOLERANCE
  })
}

function countSolids(shape: Shape3D): number {
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

function isBRepValid(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

function typedArray<T extends Float32Array | Uint32Array>(
  value: T | ArrayBuffer,
  Type: { new (buffer: ArrayBuffer): T },
): T {
  return value instanceof ArrayBuffer ? new Type(value) : value
}

function meshIsFinite(mesh: MeshData | MeshSnapshot): boolean {
  const positions = typedArray(mesh.positions, Float32Array)
  const normals = typedArray(mesh.normals, Float32Array)
  const indices = typedArray(mesh.indices, Uint32Array)
  return (
    positions.length > 0 &&
    normals.length === positions.length &&
    indices.length > 0 &&
    indices.length % 3 === 0 &&
    [...positions, ...normals].every(Number.isFinite) &&
    [...indices].every(Number.isSafeInteger)
  )
}

function volumeAt(shape: Shape3D, x: number, y: number, z: number): number {
  const probe = makeCylinder(0.05, 0.02, [x, y, z])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    deleteShape(probe)
  }
}

function expectMaterial(
  shape: Shape3D,
  failures: string[],
  label: string,
  x: number,
  z: number,
  expected: boolean,
): void {
  try {
    const hasMaterial = volumeAt(shape, x, 0, z) > PROBE_VOLUME_EPSILON
    if (hasMaterial !== expected) {
      failures.push(`profile:${label}`)
    }
  } catch (error) {
    failures.push(
      `profile:${label}:${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function inspectFixedEndProfiles(
  shape: Shape3D,
  parameters: PillarParameters,
  failures: string[],
): void {
  const totalLength = pillarLengthForParameters(parameters)
  const upperStraightZ = totalLength - PILLAR_CONFIGURATION.upperChamfer - 0.1
  const upperChamferZ = totalLength - PILLAR_CONFIGURATION.upperChamfer / 2
  const bodyRadius = pillarBodyDiameterForParameters(parameters) / 2
  const flangeRadius = pillarFlangeDiameterForParameters(parameters) / 2
  const upperChamferBoundaryRadius =
    bodyRadius - PILLAR_CONFIGURATION.upperChamfer / 2
  const upperChamferInsideRadius = upperChamferBoundaryRadius - 0.15
  const upperChamferOutsideRadius = upperChamferBoundaryRadius + 0.15

  const probe = (label: string, x: number, z: number, expected: boolean) =>
    expectMaterial(shape, failures, label, x, z, expected)

  probe('base-flange-inside', flangeRadius - 0.1, 0.4, true)
  probe('base-flange-outside', flangeRadius + 0.1, 0.4, false)
  probe(
    'shoulder-below-wide',
    flangeRadius - 0.1,
    PILLAR_CONFIGURATION.baseHeight - 0.02,
    true,
  )
  probe(
    'shoulder-above-wide',
    flangeRadius - 0.1,
    PILLAR_CONFIGURATION.baseHeight + 0.02,
    false,
  )
  probe(
    'shoulder-above-body',
    bodyRadius - 0.1,
    PILLAR_CONFIGURATION.baseHeight + 0.02,
    true,
  )

  probe(
    'body-straight-inside',
    bodyRadius - 0.1,
    PILLAR_CONFIGURATION.baseHeight + 0.1,
    true,
  )
  probe(
    'body-straight-outside',
    bodyRadius + 0.1,
    PILLAR_CONFIGURATION.baseHeight + 0.1,
    false,
  )
  probe('upper-straight-inside', bodyRadius - 0.1, upperStraightZ, true)
  probe('upper-straight-outside', bodyRadius + 0.1, upperStraightZ, false)
  probe('upper-chamfer-inside', upperChamferInsideRadius, upperChamferZ, true)
  probe(
    'upper-chamfer-outside',
    upperChamferOutsideRadius,
    upperChamferZ,
    false,
  )
}

function inspectPositioningEndProfiles(
  shape: Shape3D,
  parameters: Extract<PillarParameters, { mode: 'positioning' }>,
  failures: string[],
): void {
  const lowerChamferZ = PILLAR_CONFIGURATION.positioningLowerChamfer * 0.1
  const lowerStraightZ = PILLAR_CONFIGURATION.positioningLowerChamfer + 0.1
  const upperStraightZ =
    parameters.length - PILLAR_CONFIGURATION.positioningUpperChamfer - 0.1
  const upperChamferZ =
    parameters.length - PILLAR_CONFIGURATION.positioningUpperChamfer / 2
  const bodyRadius = pillarBodyDiameterForParameters(parameters) / 2
  const upperChamferBoundaryRadius =
    bodyRadius - PILLAR_CONFIGURATION.positioningUpperChamfer / 2
  const upperChamferInsideRadius = upperChamferBoundaryRadius - 0.15
  const upperChamferOutsideRadius = upperChamferBoundaryRadius + 0.15
  const lowerChamferRadius =
    bodyRadius - PILLAR_CONFIGURATION.positioningLowerChamfer + lowerChamferZ

  const probe = (label: string, x: number, z: number, expected: boolean) =>
    expectMaterial(shape, failures, label, x, z, expected)

  probe('lower-chamfer-inside', lowerChamferRadius - 0.1, lowerChamferZ, true)
  probe('lower-chamfer-outside', lowerChamferRadius + 0.1, lowerChamferZ, false)
  probe('lower-straight-inside', bodyRadius - 0.1, lowerStraightZ, true)
  probe('lower-straight-outside', bodyRadius + 0.1, lowerStraightZ, false)
  probe('upper-straight-inside', bodyRadius - 0.1, upperStraightZ, true)
  probe('upper-straight-outside', bodyRadius + 0.1, upperStraightZ, false)
  probe('upper-chamfer-inside', upperChamferInsideRadius, upperChamferZ, true)
  probe(
    'upper-chamfer-outside',
    upperChamferOutsideRadius,
    upperChamferZ,
    false,
  )
}

function hasFaceSpanningZ(
  shape: Shape3D,
  expectedMinZ: number,
  expectedMaxZ: number,
): boolean {
  let found = false
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [min, max] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      const hasPlanarExtent =
        max[0] - min[0] > QUALITY_TOLERANCE ||
        max[1] - min[1] > QUALITY_TOLERANCE
      if (
        hasPlanarExtent &&
        Math.abs(min[2] - expectedMinZ) <= QUALITY_TOLERANCE &&
        Math.abs(max[2] - expectedMaxZ) <= QUALITY_TOLERANCE
      ) {
        found = true
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return found
}

function inspectDetachableCornerSeatProfiles(
  shape: Shape3D,
  failures: string[],
): void {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male
  expectMaterial(shape, failures, 'lead-in-bottom-inside', 2.2, 0.05, true)
  expectMaterial(shape, failures, 'lead-in-bottom-outside', 2.45, 0.05, false)
  expectMaterial(
    shape,
    failures,
    'lead-in-upper-inside',
    2.4,
    configuration.leadInHeight + 0.05,
    true,
  )
  expectMaterial(
    shape,
    failures,
    'body-upper-inside',
    2.4,
    configuration.bodyHeight - 0.05,
    true,
  )
  expectMaterial(
    shape,
    failures,
    'body-upper-outside',
    2.6,
    configuration.bodyHeight - 0.05,
    false,
  )
  if (
    !hasFaceSpanningZ(shape, configuration.taperTopZ, configuration.totalHeight)
  ) {
    failures.push('profile:wear-cap')
  }
}

function inspectEndProfiles(
  shape: Shape3D,
  parameters: PillarParameters,
  failures: string[],
): void {
  if (parameters.mode === 'detachable-corner-seat') {
    inspectDetachableCornerSeatProfiles(shape, failures)
    return
  }
  if (parameters.mode === 'positioning') {
    inspectPositioningEndProfiles(shape, parameters, failures)
    return
  }
  inspectFixedEndProfiles(shape, parameters, failures)
}

export function inspectPillarShapeQuality(
  shape: Shape3D,
  parameters: PillarParameters,
  mesh: MeshData | MeshSnapshot,
): PillarQualityReport {
  const expectedBounds = boundsForPillar(parameters)
  const failures: string[] = []
  let bounds: ModelBounds | null = null
  let volume: number | null = null
  let solidCount: number | null = null

  try {
    bounds = readBounds(shape)
    if (!boundsMatch(bounds, expectedBounds)) {
      failures.push('bounds:expected-envelope')
    }
  } catch (error) {
    failures.push(
      `bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    volume = measureVolume(shape)
    if (!Number.isFinite(volume) || volume <= 0) {
      failures.push('volume:non-positive-or-non-finite')
    }
    if (
      parameters.mode === 'detachable-corner-seat' &&
      Math.abs(
        volume -
          OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male
            .markedNominalVolume,
      ) > OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.volumeTolerance
    ) {
      failures.push('volume:detachable-reference-mismatch')
    }
  } catch (error) {
    failures.push(
      `volume:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    solidCount = countSolids(shape)
    if (solidCount !== 1) failures.push('topology:not-single-solid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    if (!isBRepValid(shape)) failures.push('topology:brep-invalid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!meshIsFinite(mesh)) failures.push('mesh:not-finite-or-empty')
  inspectEndProfiles(shape, parameters, failures)

  return {
    passed: failures.length === 0,
    failures,
    bounds,
    expectedBounds,
    volume,
    solidCount,
    meshTriangleCount: mesh.triangleCount,
  }
}

export function assertPillarShapeQuality(
  shape: Shape3D,
  parameters: PillarParameters,
  mesh: MeshData | MeshSnapshot,
): PillarQualityReport {
  const report = inspectPillarShapeQuality(shape, parameters, mesh)
  if (!report.passed) {
    throw new Error(`PILLAR_QUALITY_INVALID:${report.failures.join('|')}`)
  }
  return report
}
