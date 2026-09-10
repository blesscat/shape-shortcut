import { getOC, makeCylinder, measureVolume, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForPillar,
  pillarBodyDiameterForParameters,
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
  y = 0,
): void {
  try {
    const hasMaterial = volumeAt(shape, x, y, z) > PROBE_VOLUME_EPSILON
    if (hasMaterial !== expected) {
      failures.push(`profile:${label}`)
    }
  } catch (error) {
    failures.push(
      `profile:${label}:${error instanceof Error ? error.message : String(error)}`,
    )
  }
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
  parameters: Extract<PillarParameters, { mode: 'detachable-corner-seat' }>,
  failures: string[],
): void {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male
  const bodyRadius = pillarBodyDiameterForParameters(parameters) / 2
  const leadInProbeZ = 0.05
  const leadInProbeRadius =
    bodyRadius - configuration.leadInHeight + leadInProbeZ
  expectMaterial(
    shape,
    failures,
    'lead-in-bottom-inside',
    leadInProbeRadius - 0.1,
    leadInProbeZ,
    true,
  )
  expectMaterial(
    shape,
    failures,
    'lead-in-bottom-outside',
    leadInProbeRadius + 0.1,
    leadInProbeZ,
    false,
  )
  expectMaterial(
    shape,
    failures,
    'lead-in-upper-inside',
    bodyRadius - 0.1,
    configuration.leadInHeight + 0.05,
    true,
  )
  expectMaterial(
    shape,
    failures,
    'body-upper-inside',
    bodyRadius - 0.1,
    parameters.length - 0.05,
    true,
  )
  expectMaterial(
    shape,
    failures,
    'body-upper-outside',
    bodyRadius + 0.1,
    parameters.length - 0.05,
    false,
  )
  // Leaf retaining head: flares along X toward the wear cap while holding the
  // 1.96 mm key thickness in Y and staying inside the Ø7 mm envelope. The head
  // geometry is fixed and rides on the parametric locating section at Z=length.
  const headBaseZ = parameters.length
  const headMidZ =
    headBaseZ + (configuration.taperTopZ - configuration.bodyHeight) / 2
  const headTopZ =
    headBaseZ +
    (configuration.taperTopZ - configuration.bodyHeight) +
    (configuration.effectiveTotalHeight - configuration.taperTopZ) / 2
  expectMaterial(
    shape,
    failures,
    'head-start-inside',
    configuration.headStartLength / 2 - 0.15,
    headBaseZ + 0.1,
    true,
  )
  expectMaterial(
    shape,
    failures,
    'head-start-outside',
    configuration.headStartLength / 2 + 0.1,
    headBaseZ + 0.1,
    false,
  )
  expectMaterial(shape, failures, 'head-mid-inside', 2.55, headMidZ, true)
  expectMaterial(shape, failures, 'head-mid-outside', 2.95, headMidZ, false)
  expectMaterial(
    shape,
    failures,
    'head-top-inside',
    configuration.headMaxLength / 2 - 0.15,
    headTopZ,
    true,
  )
  expectMaterial(shape, failures, 'head-top-outside', 3.45, headTopZ, false)
  expectMaterial(shape, failures, 'head-key-inside', 2.3, headMidZ, true, 0.85)
  expectMaterial(
    shape,
    failures,
    'head-key-outside',
    2.3,
    headMidZ,
    false,
    1.15,
  )
  const wearCapMinZ =
    headBaseZ + (configuration.taperTopZ - configuration.bodyHeight)
  const wearCapMaxZ =
    headBaseZ + (configuration.effectiveTotalHeight - configuration.bodyHeight)
  if (!hasFaceSpanningZ(shape, wearCapMinZ, wearCapMaxZ)) {
    failures.push('profile:wear-cap')
  }
}

function inspectEndProfiles(
  shape: Shape3D,
  parameters: PillarParameters,
  failures: string[],
): void {
  if (parameters.mode === 'detachable-corner-seat') {
    inspectDetachableCornerSeatProfiles(shape, parameters, failures)
    return
  }
  if (parameters.mode === 'positioning') {
    inspectPositioningEndProfiles(shape, parameters, failures)
  }
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
