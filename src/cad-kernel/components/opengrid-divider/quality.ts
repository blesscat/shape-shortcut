import {
  getOC,
  makeBox,
  makeCylinder,
  measureVolume,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridDivider,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  openGridDividerPlanBoundsFor,
  openGridDividerPegCentersFor,
  openGridDividerTransitionHeightFor,
  type ModelBounds,
  type OpenGridDividerParameters,
} from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'

export type OpenGridDividerQualityReport = {
  passed: boolean
  failures: string[]
  bounds: ModelBounds | null
  expectedBounds: ModelBounds
  volume: number | null
  solidCount: number | null
  bottomPegFaceCount: number
  bottomPegChamferCount: number
  expectedPegCount: number
  locatedPegCount: number
  topFilletFaceCount: number
  transitionFaceCount: number
  transitionFilletFaceCount: number
  baseProfileWidth: number | null
  transitionProfileWidth: number | null
  upperProfileWidth: number | null
  meshTriangleCount: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Quality cleanup must not hide the original diagnostic.
  }
}

function readMeshBounds(mesh: MeshData | MeshSnapshot): ModelBounds {
  const bounds = mesh.bounds
  return {
    min: [...bounds.min] as [number, number, number],
    max: [...bounds.max] as [number, number, number],
  }
}

function boundsMatch(actual: ModelBounds, expected: ModelBounds): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return Math.abs(coordinate - expectedCoordinate) <= 0.05
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

function faceCountInZBand(
  shape: Shape3D,
  predicate: (surfaceType: string, minZ: number, maxZ: number) => boolean,
): number {
  let count = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [[, , minZ], [, , maxZ]] = boundingBox.bounds as number[][]
      if (predicate(face.surface.surfaceType, minZ, maxZ)) count += 1
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return count
}

function transitionFilletFaceCountFor(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
): number {
  const transitionHeight = openGridDividerTransitionHeightFor(parameters)
  if (transitionHeight <= 0) return 0
  const transitionStart = OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight
  const transitionEnd = transitionStart + transitionHeight
  let count = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [[minX, minY, minZ], [maxX, maxY, maxZ]] =
        boundingBox.bounds as number[][]
      const shortPlanSpan = Math.min(maxX - minX, maxY - minY)
      if (
        face.surface.surfaceType === 'CYLINDRE' &&
        minZ <= transitionStart + 0.02 &&
        maxZ >= transitionStart + 0.02 &&
        maxZ <= transitionEnd + 1 &&
        shortPlanSpan < parameters.wallThickness
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

function rawPlanCenter(
  parameters: OpenGridDividerParameters,
): [number, number] {
  const plan = openGridDividerPlanBoundsFor(parameters)
  return [(plan.minX + plan.maxX) / 2, (plan.minY + plan.maxY) / 2]
}

function widthProbeFor(
  parameters: OpenGridDividerParameters,
  z: number,
): { probe: Shape3D; measureAxis: 'x' | 'y' } {
  const { gridPitch } = OPENGRID_DIVIDER_CONFIGURATION
  const [centerX, centerY] = rawPlanCenter(parameters)
  const hasHorizontalArm = parameters.left > 0 || parameters.right > 0
  let armCount: number
  let direction: number
  if (hasHorizontalArm) {
    const useRightArm = parameters.right > 0
    armCount = useRightArm ? parameters.right : parameters.left
    direction = useRightArm ? 1 : -1
  } else {
    const useUpperArm = parameters.up > 0
    armCount = useUpperArm ? parameters.up : parameters.down
    direction = useUpperArm ? 1 : -1
  }
  const offset = direction * Math.min((armCount * gridPitch) / 2, gridPitch / 2)

  if (hasHorizontalArm) {
    const x = offset - centerX
    return {
      probe: makeBox(
        [x - 0.05, -centerY - 20, z],
        [x + 0.05, -centerY + 20, z + 0.01],
      ),
      measureAxis: 'y',
    }
  }

  const y = offset - centerY
  return {
    probe: makeBox(
      [-centerX - 20, y - 0.05, z],
      [-centerX + 20, y + 0.05, z + 0.01],
    ),
    measureAxis: 'x',
  }
}

function profileWidthAt(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
  z: number,
): number {
  const { probe, measureAxis } = widthProbeFor(parameters, z)
  let section: Shape3D | null = null
  try {
    section = shape.intersect(probe)
    const boundingBox = section.boundingBox
    try {
      const [[minX, minY], [maxX, maxY]] = boundingBox.bounds as number[][]
      return measureAxis === 'x' ? maxX - minX : maxY - minY
    } finally {
      boundingBox.delete()
    }
  } finally {
    deleteShape(section)
    probe.delete()
  }
}

function locatedPegCountFor(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
): number {
  const [centerX, centerY] = rawPlanCenter(parameters)
  let located = 0
  for (const [rawX, rawY] of openGridDividerPegCentersFor(parameters)) {
    const probe = makeCylinder(
      OPENGRID_DIVIDER_CONFIGURATION.pegDiameter / 2 - 0.1,
      0.2,
      [
        rawX - centerX,
        rawY - centerY,
        -OPENGRID_DIVIDER_CONFIGURATION.pegLength +
          OPENGRID_DIVIDER_CONFIGURATION.pegBottomChamfer +
          0.01,
      ],
    )
    let intersection: Shape3D | null = null
    try {
      intersection = shape.intersect(probe)
      if (measureVolume(intersection) > 0) located += 1
    } finally {
      deleteShape(intersection)
      probe.delete()
    }
  }
  return located
}

function integratedPegChamferCountFor(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
): number {
  const configuration = OPENGRID_DIVIDER_CONFIGURATION
  const [centerX, centerY] = rawPlanCenter(parameters)
  let count = 0
  for (const [rawX, rawY] of openGridDividerPegCentersFor(parameters)) {
    const targetX = rawX - centerX
    const targetY = rawY - centerY
    let matched = false
    for (const face of shape.faces) {
      const boundingBox = face.boundingBox
      try {
        if (face.surface.surfaceType !== 'CONE') continue
        const [[minX, minY, minZ], [maxX, maxY, maxZ]] =
          boundingBox.bounds as number[][]
        const planSpan = Math.max(maxX - minX, maxY - minY)
        matched =
          Math.abs((minX + maxX) / 2 - targetX) <= 0.08 &&
          Math.abs((minY + maxY) / 2 - targetY) <= 0.08 &&
          Math.abs(planSpan - configuration.pegDiameter) <= 0.2 &&
          maxZ - minZ >= configuration.pegBottomChamfer * 0.7 &&
          minZ <= -configuration.pegLength + 0.03 &&
          maxZ <=
            -configuration.pegLength + configuration.pegBottomChamfer + 0.05
      } finally {
        boundingBox.delete()
        face.delete()
      }
      if (matched) break
    }
    if (matched) count += 1
  }
  return count
}

function isCloseTo(value: number, expected: number, tolerance = 0.05): boolean {
  return Math.abs(value - expected) <= tolerance
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

export function inspectOpenGridDividerShapeQuality(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
  mesh: MeshData | MeshSnapshot,
): OpenGridDividerQualityReport {
  const expectedBounds = boundsForOpenGridDivider(parameters)
  const failures: string[] = []
  let bounds: ModelBounds | null = null
  let volume: number | null = null
  let solidCount: number | null = null

  try {
    bounds = readMeshBounds(mesh)
    if (!boundsMatch(bounds, expectedBounds)) {
      failures.push('bounds:expected-envelope-or-placement')
    }
  } catch (error) {
    failures.push(
      `bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    volume = measureVolume(shape)
    if (!(volume > 0)) failures.push('volume:non-positive')
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

  const bottomPegFaceCount = faceCountInZBand(
    shape,
    (surfaceType, minZ, maxZ) =>
      (surfaceType === 'CYLINDRE' || surfaceType === 'CONE') &&
      minZ <=
        -OPENGRID_DIVIDER_CONFIGURATION.pegLength +
          OPENGRID_DIVIDER_CONFIGURATION.pegBottomChamfer +
          0.05 &&
      maxZ <= 0.1,
  )
  // OpenCascade may split a single peg's cylindrical face at wall intersections;
  // the integration fixture probes every expected center instead of treating
  // this diagnostic face count as an exact peg count.
  const expectedPegCount = openGridDividerPegCentersFor(parameters).length
  let bottomPegChamferCount = 0
  try {
    bottomPegChamferCount = integratedPegChamferCountFor(shape, parameters)
    if (bottomPegChamferCount !== expectedPegCount) {
      failures.push('peg:bottom-chamfer-missing')
    }
  } catch (error) {
    failures.push(
      `peg-chamfer:${error instanceof Error ? error.message : String(error)}`,
    )
  }
  let locatedPegCount = 0
  try {
    locatedPegCount = locatedPegCountFor(shape, parameters)
    if (locatedPegCount !== expectedPegCount) {
      failures.push('peg:missing-or-misplaced')
    }
  } catch (error) {
    failures.push(
      `peg:${error instanceof Error ? error.message : String(error)}`,
    )
  }
  const topFilletFaceCount = faceCountInZBand(
    shape,
    (surfaceType, minZ, maxZ) =>
      surfaceType === 'CYLINDRE' &&
      minZ >=
        parameters.height -
          OPENGRID_DIVIDER_CONFIGURATION.topFilletRadius -
          0.05 &&
      maxZ >= parameters.height - 0.05,
  )
  const transitionHeight = openGridDividerTransitionHeightFor(parameters)
  const transitionStartHeight =
    transitionHeight > 0
      ? OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight
      : 0
  const transitionEndHeight = transitionStartHeight + transitionHeight
  const upperStraightHeight = Math.max(
    0,
    parameters.height - transitionEndHeight,
  )
  const topFilletCanFit =
    Math.min(parameters.wallThickness / 2, upperStraightHeight / 2) >
    OPENGRID_DIVIDER_CONFIGURATION.geometrySafetyMargin
  if (topFilletCanFit && topFilletFaceCount < 1) {
    failures.push('fillet:top-edge-rounding-missing')
  }

  const transitionFaceCount =
    transitionHeight > 0
      ? faceCountInZBand(
          shape,
          (surfaceType, minZ, maxZ) =>
            surfaceType === 'PLANE' &&
            minZ <= transitionStartHeight + 0.05 &&
            maxZ >= transitionEndHeight - 0.05 &&
            maxZ < parameters.height - 0.05,
        )
      : 0
  if (transitionHeight > 0 && transitionFaceCount < 1) {
    failures.push('chamfer:45-degree-transition-missing')
  }
  const transitionFilletFaceCount = transitionFilletFaceCountFor(
    shape,
    parameters,
  )
  if (transitionHeight > 0 && transitionFilletFaceCount < 1) {
    failures.push('fillet:transition-edge-rounding-missing')
  }

  let baseProfileWidth: number | null = null
  let transitionProfileWidth: number | null = null
  let upperProfileWidth: number | null = null
  let profileStage = 'base'
  try {
    const transitionMidpoint = transitionStartHeight + transitionHeight / 2
    baseProfileWidth = profileWidthAt(
      shape,
      parameters,
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius + 0.01,
    )
    profileStage = 'upper'
    // Saving-mode voids live in the upper straight wall, so probe the solid
    // lower frame band instead of the cell-covered mid height. Short walls
    // below one framed row never get cells, so the band may not exist there;
    // clamp the probe back inside the model for those snapshots.
    const upperProbeZ = parameters.honeycombMode
      ? Math.min(
          transitionEndHeight + OPENGRID_HONEYCOMB_CONFIGURATION.lowerFrame / 2,
          parameters.height - 0.05,
        )
      : transitionEndHeight + upperStraightHeight / 2
    upperProfileWidth = profileWidthAt(shape, parameters, upperProbeZ)
    if (
      !isCloseTo(baseProfileWidth, OPENGRID_DIVIDER_CONFIGURATION.wallWidth)
    ) {
      failures.push('profile:base-width-mismatch')
    }
    if (!isCloseTo(upperProfileWidth, parameters.wallThickness)) {
      failures.push('profile:upper-width-mismatch')
    }
    if (transitionHeight > 0) {
      profileStage = 'transition'
      transitionProfileWidth = profileWidthAt(
        shape,
        parameters,
        transitionMidpoint,
      )
      if (
        !isCloseTo(
          transitionProfileWidth,
          (OPENGRID_DIVIDER_CONFIGURATION.wallWidth +
            parameters.wallThickness) /
            2,
        )
      ) {
        failures.push('chamfer:45-degree-slope-mismatch')
      }
    }
  } catch (error) {
    failures.push(
      `profile:${profileStage}:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (mesh.triangleCount <= 0 || !meshIsFinite(mesh)) {
    failures.push('mesh:empty-or-non-finite')
  }

  return {
    passed: failures.length === 0,
    failures,
    bounds,
    expectedBounds,
    volume,
    solidCount,
    bottomPegFaceCount,
    bottomPegChamferCount,
    expectedPegCount,
    locatedPegCount,
    topFilletFaceCount,
    transitionFaceCount,
    transitionFilletFaceCount,
    baseProfileWidth,
    transitionProfileWidth,
    upperProfileWidth,
    meshTriangleCount: mesh.triangleCount,
  }
}

export function assertOpenGridDividerShapeQuality(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
  mesh: MeshData | MeshSnapshot,
): OpenGridDividerQualityReport {
  const report = inspectOpenGridDividerShapeQuality(shape, parameters, mesh)
  if (!report.passed) {
    throw new Error(
      `OPENGRID_DIVIDER_QUALITY_INVALID:${report.failures.join(';')}`,
    )
  }
  return report
}
