import {
  deserializeShape,
  getOC,
  makeBox,
  makeCompound,
  makeCylinder,
  measureVolume,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridSnap,
  openGridSnapCanonicalAxesFor,
  OPENGRID_SNAP_CONFIGURATION,
  type OpenGridSnapCanonicalAxes,
  type ModelBounds,
  type OpenGridSnapParameters,
} from '../../../cad-contract/units'
import {
  openGridSnapLocatingHoleCentersFor,
  openGridSnapProfileFor,
} from './profile'
import {
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS,
  openGridSnapOpenConnectAnchorForXYTransform,
  openGridSnapOpenConnectCompositeBounds,
  openGridSnapOpenConnectHeadBoundsForAnchor,
  openGridSnapOpenConnectNotchSegmentsFor,
} from './openconnect'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'
import { OPENGRID_SNAP_BOUNDARY_PROFILE } from './boundary'
import { deleteShape } from '../../lifetime/dispose'
import { isBRepValid } from '../../shape-query/solids'

const QUALITY_TOLERANCE = 0.05
// Meshing an offset assembly can add a small OCC boundary epsilon to the
// extracted solid boxes; keep this separate from scaled-core volume checks.
export const OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE = 0.45
// Cloning and meshing the imported zero-offset compound can expand OCC's
// cached envelope by this deterministic amount without changing its solids.
const ZERO_OFFSET_ENVELOPE_TOLERANCE = 0.15

type Probe = {
  min: [number, number, number]
  max: [number, number, number]
}

export type OpenGridSnapQualityReport = {
  passed: boolean
  failures: string[]
  bounds: ModelBounds | null
  expectedBounds: ModelBounds
  solidCount: number | null
  centralBounds: ModelBounds | null
  centralVolume: number | null
  internalProbeVolumes: number[]
  optionalFeatureProbeVolumes: number[]
  magnetHoleProbeVolumes: number[]
  meshTriangleCount: number
}

function deleteDistinctShapes(shapes: Array<Shape3D | null | undefined>): void {
  const deleted = new Set<Shape3D>()
  for (const shape of shapes) {
    if (!shape || deleted.has(shape)) continue
    deleted.add(shape)
    deleteShape(shape)
  }
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

function readAssemblyBounds(shape: Shape3D): ModelBounds {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let bounds: ModelBounds | null = null
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        const solidBounds = readBounds(solid)
        if (!bounds) {
          bounds = solidBounds
        } else {
          bounds = {
            min: [
              Math.min(bounds.min[0], solidBounds.min[0]),
              Math.min(bounds.min[1], solidBounds.min[1]),
              Math.min(bounds.min[2], solidBounds.min[2]),
            ],
            max: [
              Math.max(bounds.max[0], solidBounds.max[0]),
              Math.max(bounds.max[1], solidBounds.max[1]),
              Math.max(bounds.max[2], solidBounds.max[2]),
            ],
          }
        }
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (!bounds) throw new Error('OPENGRID_SNAP_ASSEMBLY_EMPTY')
  return bounds
}

function isClose(
  first: number,
  second: number,
  tolerance = QUALITY_TOLERANCE,
): boolean {
  return Math.abs(first - second) <= tolerance
}

function boundsMatch(
  actual: ModelBounds,
  expected: ModelBounds,
  tolerance = QUALITY_TOLERANCE,
): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return isClose(coordinate, expectedCoordinate, tolerance)
  })
}

function boundsFitInsideEnvelope(
  actual: ModelBounds,
  expected: ModelBounds,
  tolerance: number,
): boolean {
  return (
    actual.min[0] >= expected.min[0] - tolerance &&
    actual.min[1] >= expected.min[1] - tolerance &&
    actual.min[2] >= expected.min[2] - tolerance &&
    actual.max[0] <= expected.max[0] + tolerance &&
    actual.max[1] <= expected.max[1] + tolerance &&
    actual.max[2] <= expected.max[2] + tolerance
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

function largestSolid(shape: Shape3D): Solid {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let selected: Solid | null = null
  let selectedVolume = -Infinity
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      const volume = measureVolume(solid)
      if (volume > selectedVolume) {
        deleteShape(selected)
        selected = solid
        selectedVolume = volume
      } else {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (!selected) throw new Error('OPENGRID_SNAP_CENTRAL_SOLID_MISSING')
  return selected
}

type SolidDescriptor = {
  bounds: ModelBounds
  volume: number
}

function sortedSolidDescriptors(shape: Shape3D): SolidDescriptor[] {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  const descriptors: SolidDescriptor[] = []
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        descriptors.push({
          bounds: readBounds(solid),
          volume: measureVolume(solid),
        })
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  return descriptors.sort((left, right) => {
    if (Math.abs(left.volume - right.volume) > 0.01) {
      return right.volume - left.volume
    }
    const xDifference = left.bounds.min[0] - right.bounds.min[0]
    if (Math.abs(xDifference) > 0.01) return xDifference
    return left.bounds.min[1] - right.bounds.min[1]
  })
}

function volumeInProbe(shape: Shape3D, probeBounds: Probe): number {
  const probe = makeBox(probeBounds.min, probeBounds.max)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteDistinctShapes([intersection !== shape ? intersection : null, probe])
  }
}

function volumeInCylinder(
  shape: Shape3D,
  center: [number, number],
  radius: number,
  bounds: ModelBounds,
): number {
  const cylinder = makeCylinder(radius, bounds.max[2] - bounds.min[2] + 0.4, [
    center[0],
    center[1],
    bounds.min[2] - 0.2,
  ])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(cylinder)
    return measureVolume(intersection)
  } finally {
    deleteDistinctShapes([
      intersection !== shape ? intersection : null,
      cylinder,
    ])
  }
}

function volumeInCylinderAtZ(
  shape: Shape3D,
  center: [number, number],
  radius: number,
  zMin: number,
  zMax: number,
): number {
  const cylinder = makeCylinder(radius, zMax - zMin, [
    center[0],
    center[1],
    zMin,
  ])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(cylinder)
    return measureVolume(intersection)
  } finally {
    deleteDistinctShapes([
      intersection !== shape ? intersection : null,
      cylinder,
    ])
  }
}

function volumeInCylindricalAnnulus(
  shape: Shape3D,
  center: [number, number],
  innerRadius: number,
  outerRadius: number,
  bounds: ModelBounds,
): number {
  const outer = makeCylinder(outerRadius, bounds.max[2] - bounds.min[2] + 0.4, [
    center[0],
    center[1],
    bounds.min[2] - 0.2,
  ])
  const inner = makeCylinder(innerRadius, bounds.max[2] - bounds.min[2] + 0.6, [
    center[0],
    center[1],
    bounds.min[2] - 0.3,
  ])
  let annulus: Shape3D | null = null
  let intersection: Shape3D | null = null
  try {
    annulus = outer.cut(inner)
    intersection = shape.intersect(annulus)
    return measureVolume(intersection)
  } finally {
    deleteDistinctShapes([
      intersection !== shape ? intersection : null,
      annulus !== outer && annulus !== inner ? annulus : null,
      outer,
      inner,
    ])
  }
}

function volumeInBoxProbe(shape: Shape3D, bounds: Probe): number {
  return volumeInProbe(shape, bounds)
}

function probeFitsInBounds(
  point: [number, number],
  radius: number,
  bounds: ModelBounds,
): boolean {
  return (
    point[0] >= bounds.min[0] + radius &&
    point[0] <= bounds.max[0] - radius &&
    point[1] >= bounds.min[1] + radius &&
    point[1] <= bounds.max[1] - radius
  )
}

function locatingHoleElasticSlotProbes(
  definition: ReturnType<typeof openGridSnapProfileFor>,
  translation: [number, number],
  zMin: number,
  zMax: number,
): Probe[] {
  const margin = 0.2
  const halfWidth = definition.locatingHoleSlotHalfWidth - margin
  const halfSpan = definition.locatingHoleSlotInnerHalfSpan - margin
  const center = definition.locatingHoleCenter
  const probes: Probe[] = []
  for (const sign of [-1, 1] as const) {
    const bandCenter = sign * center
    probes.push(
      {
        min: [
          -halfSpan + translation[0],
          bandCenter - halfWidth + translation[1],
          zMin,
        ],
        max: [
          halfSpan + translation[0],
          bandCenter + halfWidth + translation[1],
          zMax,
        ],
      },
      {
        min: [
          bandCenter - halfWidth + translation[0],
          -halfSpan + translation[1],
          zMin,
        ],
        max: [
          bandCenter + halfWidth + translation[0],
          halfSpan + translation[1],
          zMax,
        ],
      },
    )
  }
  return probes
}

function probeFitsInBoundsBox(probe: Probe, bounds: ModelBounds): boolean {
  return (
    probe.min[0] >= bounds.min[0] &&
    probe.min[1] >= bounds.min[1] &&
    probe.min[2] >= bounds.min[2] &&
    probe.max[0] <= bounds.max[0] &&
    probe.max[1] <= bounds.max[1] &&
    probe.max[2] <= bounds.max[2]
  )
}

function centerRemoverProbe(
  definition: ReturnType<typeof openGridSnapProfileFor>,
  center: [number, number],
  halfWidth: number,
  zMin: number,
  zMax: number,
): Probe {
  const margin = 0.1
  return {
    min: [
      center[0] - halfWidth + margin,
      center[1] - definition.centerRemoverHalfDepth + margin,
      zMin,
    ],
    max: [
      center[0] + halfWidth - margin,
      center[1] + definition.centerRemoverHalfDepth - margin,
      zMax,
    ],
  }
}

function centerRemoverLedgeProbe(
  definition: ReturnType<typeof openGridSnapProfileFor>,
  center: [number, number],
  bounds: ModelBounds,
): Probe {
  return {
    min: [
      center[0] + definition.centerRemoverUpperHalfWidth + 0.2,
      center[1] - definition.centerRemoverHalfDepth + 0.2,
      definition.centerRemoverStepZ + 0.1,
    ],
    max: [
      center[0] + definition.centerRemoverLowerHalfWidth - 0.2,
      center[1] + definition.centerRemoverHalfDepth - 0.2,
      Math.min(definition.centerRemoverStepZ + 0.4, bounds.max[2] - 0.1),
    ],
  }
}

function centerRemoverPassageBoundaryProbe(
  definition: ReturnType<typeof openGridSnapProfileFor>,
  center: [number, number],
  bounds: ModelBounds,
): Probe {
  const radius = definition.centerPassageRadius
  return {
    min: [
      center[0] + radius + 0.05,
      center[1] - 0.5,
      definition.centerRemoverStepZ + 0.1,
    ],
    max: [
      center[0] + radius + 0.3,
      center[1] + 0.5,
      Math.min(definition.centerRemoverStepZ + 0.6, bounds.max[2] - 0.1),
    ],
  }
}

function magnetHolePlanHalfExtents(
  parameters: OpenGridSnapParameters,
): [number, number] {
  if (parameters.magnetHoleShape === 'square') {
    return [parameters.magnetHoleLength / 2, parameters.magnetHoleWidth / 2]
  }
  const radius = parameters.magnetHoleDiameter / 2
  return [radius, radius]
}

function magnetHoleProbeZBounds(
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds,
): [number, number] | null {
  const minZ = Math.max(bounds.min[2] + 0.05, bounds.min[2])
  const maxZ = Math.min(
    bounds.max[2] - 0.05,
    bounds.min[2] + parameters.magnetHoleThickness - 0.05,
  )
  if (maxZ <= minZ) return null
  return [minZ, maxZ]
}

function magnetConnectorProbes(
  parameters: OpenGridSnapParameters,
  definition: ReturnType<typeof openGridSnapProfileFor>,
  zMin: number,
  zMax: number,
): Array<{ opening: Probe; tangent: Probe; retention: Probe }> {
  const [halfX, halfY] = magnetHolePlanHalfExtents(parameters)
  const halfOpeningWidth = definition.magnetHoleOpeningWidth / 2
  const reach = definition.magnetHoleConnectorReachByDirection
  const bounds = boundsForOpenGridSnap(parameters)
  const innerMargin = 0.2
  const tangentMin = halfOpeningWidth + 0.15
  const tangentMax = halfOpeningWidth + 0.55
  const probes: Array<{ opening: Probe; tangent: Probe; retention: Probe }> = []

  const retentionEndFor = (
    axis: 0 | 1,
    sign: -1 | 1,
    connectorReach: number,
  ): number => {
    const positiveOuter = bounds.max[axis]
    const negativeOuter = Math.abs(bounds.min[axis])
    const outerBoundary = sign > 0 ? positiveOuter : negativeOuter
    return Math.min(connectorReach + 0.9, outerBoundary - 0.2)
  }

  const addVertical = (sign: -1 | 1, connectorReach: number): void => {
    const start = sign > 0 ? halfY + innerMargin : -connectorReach + innerMargin
    const end = sign > 0 ? connectorReach - innerMargin : -halfY - innerMargin
    if (end <= start) return
    const retentionStart = connectorReach + 0.2
    const retentionEnd = retentionEndFor(1, sign, connectorReach)
    const retentionMin = sign > 0 ? retentionStart : -retentionEnd
    const retentionMax = sign > 0 ? retentionEnd : -retentionStart
    probes.push({
      opening: {
        min: [-halfOpeningWidth + innerMargin, start, zMin],
        max: [halfOpeningWidth - innerMargin, end, zMax],
      },
      tangent: {
        min: [tangentMin, (start + end) / 2 - 0.25, zMin],
        max: [tangentMax, (start + end) / 2 + 0.25, zMax],
      },
      retention: {
        min: [-0.4, retentionMin, zMin],
        max: [0.4, retentionMax, zMax],
      },
    })
  }

  const addHorizontal = (sign: -1 | 1, connectorReach: number): void => {
    const start = sign > 0 ? halfX + innerMargin : -connectorReach + innerMargin
    const end = sign > 0 ? connectorReach - innerMargin : -halfX - innerMargin
    if (end <= start) return
    const retentionStart = connectorReach + 0.2
    const retentionEnd = retentionEndFor(0, sign, connectorReach)
    const retentionMin = sign > 0 ? retentionStart : -retentionEnd
    const retentionMax = sign > 0 ? retentionEnd : -retentionStart
    probes.push({
      opening: {
        min: [start, -halfOpeningWidth + innerMargin, zMin],
        max: [end, halfOpeningWidth - innerMargin, zMax],
      },
      tangent: {
        min: [(start + end) / 2 - 0.25, tangentMin, zMin],
        max: [(start + end) / 2 + 0.25, tangentMax, zMax],
      },
      retention: {
        min: [retentionMin, -0.4, zMin],
        max: [retentionMax, 0.4, zMax],
      },
    })
  }

  addVertical(-1, reach.negativeY)
  addVertical(1, reach.positiveY)
  addHorizontal(-1, reach.negativeX)
  addHorizontal(1, reach.positiveX)
  return probes
}

function inspectMagnetHoleProbes(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  failures: string[],
): number[] {
  if (!bounds || parameters.magnetHoleShape === 'none') return []

  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  const zBounds = magnetHoleProbeZBounds(parameters, bounds)
  if (!zBounds) {
    failures.push('magnet:thickness-probe-empty')
    return []
  }
  const [zMin, zMax] = zBounds
  const topProbeMin = bounds.min[2] + parameters.magnetHoleThickness + 0.05
  const topProbeMax = Math.min(bounds.max[2] - 0.05, topProbeMin + 0.2)
  if (topProbeMax <= topProbeMin) {
    failures.push('magnet:thickness-support-probe-empty')
  }
  const central = largestSolid(shape)
  const probeVolumes: number[] = []
  try {
    const [halfX, halfY] = magnetHolePlanHalfExtents(parameters)
    if (parameters.magnetHoleShape === 'square') {
      const cavity = volumeInBoxProbe(central, {
        min: [-halfX + 0.2, -halfY + 0.2, zMin],
        max: [halfX - 0.2, halfY - 0.2, zMax],
      })
      const retainingCorner = volumeInBoxProbe(central, {
        min: [halfX + 0.2, halfY + 0.2, zMin],
        max: [halfX + 0.8, halfY + 0.8, zMax],
      })
      const topSupport =
        topProbeMax > topProbeMin
          ? volumeInBoxProbe(central, {
              min: [-halfX + 0.2, -halfY + 0.2, topProbeMin],
              max: [halfX - 0.2, halfY - 0.2, topProbeMax],
            })
          : 0
      probeVolumes.push(cavity, retainingCorner, topSupport)
      if (cavity > QUALITY_TOLERANCE) {
        failures.push('magnet:square-cavity-missing')
      }
      if (retainingCorner <= QUALITY_TOLERANCE) {
        failures.push('magnet:retention-material-missing')
      }
      if (topSupport <= QUALITY_TOLERANCE) {
        failures.push('magnet:thickness-exceeds-requested-depth')
      }
    } else {
      const radius = parameters.magnetHoleDiameter / 2
      const cavity = volumeInCylinderAtZ(
        central,
        [0, 0],
        Math.max(0.1, radius - 0.2),
        zMin,
        zMax,
      )
      const retainingOuter = makeCylinder(radius + 0.55, zMax - zMin, [
        0,
        0,
        zMin,
      ])
      const retainingInner = makeCylinder(radius + 0.15, zMax - zMin, [
        0,
        0,
        zMin,
      ])
      let retainingAnnulusShape: Shape3D | null = null
      let retainingIntersection: Shape3D | null = null
      let retainingAnnulus = 0
      try {
        retainingAnnulusShape = retainingOuter.cut(retainingInner)
        retainingIntersection = central.intersect(retainingAnnulusShape)
        retainingAnnulus = measureVolume(retainingIntersection)
      } finally {
        deleteDistinctShapes([
          retainingIntersection !== central ? retainingIntersection : null,
          retainingAnnulusShape,
          retainingOuter,
          retainingInner,
        ])
      }
      probeVolumes.push(cavity, retainingAnnulus)
      if (cavity > QUALITY_TOLERANCE) {
        failures.push('magnet:round-cavity-missing')
      }
      if (retainingAnnulus <= QUALITY_TOLERANCE) {
        failures.push('magnet:retention-material-missing')
      }
      const topSupport =
        topProbeMax > topProbeMin
          ? volumeInCylinderAtZ(
              central,
              [0, 0],
              Math.max(0.1, radius - 0.2),
              topProbeMin,
              topProbeMax,
            )
          : 0
      probeVolumes.push(topSupport)
      if (topSupport <= QUALITY_TOLERANCE) {
        failures.push('magnet:thickness-exceeds-requested-depth')
      }
    }

    const connectorProbes = magnetConnectorProbes(
      parameters,
      definition,
      zMin,
      zMax,
    )
    for (const { opening, tangent, retention } of connectorProbes) {
      const openingVolume = volumeInBoxProbe(shape, opening)
      const tangentVolume = volumeInBoxProbe(shape, tangent)
      const retentionVolume = volumeInBoxProbe(shape, retention)
      probeVolumes.push(openingVolume, tangentVolume, retentionVolume)
      if (openingVolume > QUALITY_TOLERANCE) {
        failures.push('magnet:connector-opening-missing')
      }
      if (tangentVolume <= QUALITY_TOLERANCE) {
        failures.push('magnet:connector-width-invalid')
      }
      if (retentionVolume <= QUALITY_TOLERANCE) {
        failures.push('magnet:connector-retention-missing')
      }
    }
  } finally {
    deleteShape(central)
  }
  return probeVolumes
}

function inspectOptionalFeatureProbes(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  failures: string[],
  reference: Shape3D,
): number[] {
  if (!bounds) return []

  if (parameters.magnetHoleShape !== 'none') {
    return inspectMagnetHoleProbes(shape, parameters, bounds, failures)
  }

  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  const central = largestSolid(shape)
  const referenceCentral = largestSolid(reference)
  const referenceBounds = readBounds(referenceCentral)
  const referenceAssemblyBounds = readBounds(reference)
  const probeVolumes: number[] = []
  try {
    if (parameters.fourCornerLocatingHoles) {
      const probeRadius = definition.locatingHoleRadius - 0.15
      const upperHoleBounds: ModelBounds = {
        min: [
          bounds.min[0],
          bounds.min[1],
          Math.max(bounds.min[2] + 0.1, definition.locatingHoleSlotStepZ + 0.1),
        ],
        max: [bounds.max[0], bounds.max[1], bounds.max[2] - 0.1],
      }
      for (const sourceCenter of openGridSnapLocatingHoleCentersFor(
        definition,
      )) {
        const center = sourceCenter
        if (
          !probeFitsInBounds(
            center,
            definition.locatingHoleRadius + 0.15,
            bounds,
          )
        ) {
          continue
        }
        const volume = volumeInCylinder(central, center, probeRadius, bounds)
        const annulusVolume = volumeInCylindricalAnnulus(
          central,
          center,
          definition.locatingHoleRadius - 0.15,
          definition.locatingHoleRadius + 0.15,
          bounds,
        )
        probeVolumes.push(volume)
        if (volume > QUALITY_TOLERANCE) {
          failures.push('features:locating-hole-missing')
        }
        if (annulusVolume <= QUALITY_TOLERANCE) {
          failures.push('features:locating-hole-diameter-or-center-invalid')
        }
        const upperHoleHeight = upperHoleBounds.max[2] - upperHoleBounds.min[2]
        if (
          upperHoleHeight > 0 &&
          probeFitsInBounds(
            center,
            definition.locatingHoleRadius + 0.15,
            upperHoleBounds,
          )
        ) {
          const outerAnnulusVolume = volumeInCylindricalAnnulus(
            central,
            center,
            definition.locatingHoleRadius,
            definition.locatingHoleRadius + 0.15,
            upperHoleBounds,
          )
          const referenceOuterAnnulusVolume = volumeInCylindricalAnnulus(
            referenceCentral,
            sourceCenter,
            definition.locatingHoleRadius,
            definition.locatingHoleRadius + 0.15,
            {
              min: [
                referenceBounds.min[0],
                referenceBounds.min[1],
                upperHoleBounds.min[2],
              ],
              max: [
                referenceBounds.max[0],
                referenceBounds.max[1],
                upperHoleBounds.max[2],
              ],
            },
          )
          const innerAnnulusVolume = volumeInCylindricalAnnulus(
            central,
            center,
            definition.locatingHoleRadius - 0.15,
            definition.locatingHoleRadius,
            upperHoleBounds,
          )
          if (
            Math.abs(outerAnnulusVolume - referenceOuterAnnulusVolume) >
              Math.max(0.15, referenceOuterAnnulusVolume * 0.08) ||
            innerAnnulusVolume > 0.15
          ) {
            failures.push('features:locating-hole-clearance-invalid')
          }
        }
      }
      if (parameters.footprint === 'full') {
        const lowerSlotProbes = locatingHoleElasticSlotProbes(
          definition,
          [0, 0],
          bounds.min[2] + 0.05,
          definition.locatingHoleSlotStepZ - 0.05,
        )
        const upperSlotProbes = locatingHoleElasticSlotProbes(
          definition,
          [0, 0],
          definition.locatingHoleSlotStepZ + 0.05,
          bounds.max[2] - 0.05,
        )
        for (let index = 0; index < lowerSlotProbes.length; index += 1) {
          const lowerProbe = lowerSlotProbes[index]
          const upperProbe = upperSlotProbes[index]
          if (!lowerProbe || !upperProbe) continue
          if (
            !probeFitsInBoundsBox(lowerProbe, bounds) ||
            !probeFitsInBoundsBox(upperProbe, bounds)
          ) {
            continue
          }
          const lowerSlotVolume = volumeInBoxProbe(central, lowerProbe)
          const upperSlotVolume = volumeInBoxProbe(central, upperProbe)
          probeVolumes.push(lowerSlotVolume, upperSlotVolume)
          if (
            lowerSlotVolume > QUALITY_TOLERANCE ||
            upperSlotVolume <= QUALITY_TOLERANCE
          ) {
            failures.push('features:locating-hole-elastic-slot-missing')
          }
        }
      }

      if (parameters.footprint !== 'full' && !parameters.centerRemoverHole) {
        for (const sourceCenter of openGridSnapLocatingHoleCentersFor(
          definition,
        )) {
          const translatedCenter = translatedPartialPointFor(
            sourceCenter,
            parameters,
            referenceAssemblyBounds,
          )
          if (!translatedCenter) continue
          if (!probeFitsInBounds(translatedCenter, 0.75, bounds)) continue
          const translatedHoleProbe = volumeInCylinder(
            central,
            translatedCenter,
            0.75,
            bounds,
          )
          if (translatedHoleProbe <= QUALITY_TOLERANCE) {
            failures.push('features:partial-locating-hole-translated')
          }
        }
      }
    } else {
      for (const sourceCenter of openGridSnapLocatingHoleCentersFor(
        definition,
      )) {
        const center = sourceCenter
        if (!probeFitsInBounds(center, 0.75, bounds)) continue
        const volume = volumeInCylinder(central, center, 0.75, bounds)
        probeVolumes.push(volume)
        if (volume <= QUALITY_TOLERANCE) {
          failures.push('features:locating-hole-unexpected')
        }
      }
    }

    if (parameters.centerRemoverHole) {
      const center: [number, number] = [0, 0]
      if (
        !probeFitsInBounds(
          center,
          definition.centerRemoverLowerHalfWidth + 0.2,
          bounds,
        )
      ) {
        return probeVolumes
      }
      const lowerProbeVolume = volumeInBoxProbe(
        central,
        centerRemoverProbe(
          definition,
          center,
          definition.centerRemoverLowerHalfWidth,
          bounds.min[2] - 0.2,
          definition.centerRemoverStepZ - 0.1,
        ),
      )
      const upperProbeVolume = volumeInBoxProbe(
        central,
        centerRemoverProbe(
          definition,
          center,
          definition.centerRemoverUpperHalfWidth,
          definition.centerRemoverStepZ + 0.1,
          bounds.max[2] + 0.2,
        ),
      )
      const ledgeProbeVolume = volumeInBoxProbe(
        central,
        centerRemoverLedgeProbe(definition, center, bounds),
      )
      const passageProbeVolume = volumeInCylinderAtZ(
        central,
        center,
        definition.centerPassageRadius - 0.1,
        bounds.min[2] - 0.2,
        bounds.max[2] + 0.2,
      )
      const passageBoundaryProbeVolume = volumeInBoxProbe(
        central,
        centerRemoverPassageBoundaryProbe(definition, center, bounds),
      )
      probeVolumes.push(
        lowerProbeVolume,
        upperProbeVolume,
        ledgeProbeVolume,
        passageProbeVolume,
        passageBoundaryProbeVolume,
      )
      if (
        lowerProbeVolume > QUALITY_TOLERANCE ||
        upperProbeVolume > QUALITY_TOLERANCE ||
        ledgeProbeVolume <= QUALITY_TOLERANCE
      ) {
        failures.push('features:center-remover-missing')
      }
      if (
        passageProbeVolume > QUALITY_TOLERANCE ||
        passageBoundaryProbeVolume <= QUALITY_TOLERANCE
      ) {
        failures.push('features:center-remover-passage-invalid')
      }
    } else {
      const center: [number, number] = [0, 0]
      if (!probeFitsInBounds(center, 0.75, bounds)) {
        return probeVolumes
      }
      const lowerBodyVolume = volumeInBoxProbe(
        central,
        centerRemoverProbe(
          definition,
          center,
          0.5,
          bounds.min[2] - 0.2,
          definition.centerRemoverStepZ - 0.1,
        ),
      )
      const upperBodyVolume = volumeInBoxProbe(
        central,
        centerRemoverProbe(
          definition,
          center,
          0.5,
          definition.centerRemoverStepZ + 0.1,
          bounds.max[2] + 0.2,
        ),
      )
      probeVolumes.push(lowerBodyVolume, upperBodyVolume)
      if (
        lowerBodyVolume <= QUALITY_TOLERANCE ||
        upperBodyVolume <= QUALITY_TOLERANCE
      ) {
        failures.push('features:center-remover-unexpected')
      }
    }
  } finally {
    deleteShape(central)
    deleteShape(referenceCentral)
  }
  return probeVolumes
}

function fixedInternalProbes(height: number): Probe[] {
  const probeHeight = height + 0.4
  return [
    { min: [-1, -1, -0.2], max: [1, 1, probeHeight] },
    { min: [-5, -1, -0.2], max: [-3, 1, probeHeight] },
    { min: [-1, -5, -0.2], max: [1, -3, probeHeight] },
  ]
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

function solidBoundsFor(shape: Shape3D): ModelBounds[] {
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

function isOpenConnectHeadSolid(bounds: ModelBounds): boolean {
  const sourceSpan = [
    OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS.max[0] -
      OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS.min[0],
    OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS.max[1] -
      OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS.min[1],
    OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS.max[2] -
      OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS.min[2],
  ]
  const actualSpan = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ]
  return actualSpan.every((span, index) => isClose(span, sourceSpan[index]!))
}

function baseAssemblyWithoutOpenConnectHead(shape: Shape3D): {
  base: Shape3D
  headBounds: ModelBounds
} {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  const solids: Solid[] = []
  let headBounds: ModelBounds | null = null
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      const bounds = readBounds(solid)
      if (isOpenConnectHeadSolid(bounds)) {
        if (headBounds) {
          deleteShape(solid)
          throw new Error('OPENGRID_SNAP_OPEN_CONNECT_HEAD_DUPLICATE')
        }
        headBounds = bounds
        deleteShape(solid)
      } else {
        solids.push(solid)
      }
      explorer.Next()
    }
  } catch (error) {
    for (const solid of solids) deleteShape(solid)
    throw error
  } finally {
    explorer.delete()
  }

  if (!headBounds || solids.length === 0) {
    for (const solid of solids) deleteShape(solid)
    throw new Error('OPENGRID_SNAP_OPEN_CONNECT_HEAD_MISSING')
  }

  const clonedSolids: Shape3D[] = []
  try {
    for (const solid of solids) {
      clonedSolids.push(deserializeShape(solid.serialize()).asShape3D())
    }
    const base =
      clonedSolids.length === 1
        ? clonedSolids[0]
        : makeCompound(clonedSolids).asShape3D()
    if (!base) throw new Error('OPENGRID_SNAP_BASE_ASSEMBLY_MISSING')
    return { base, headBounds }
  } catch (error) {
    for (const cloned of clonedSolids) deleteShape(cloned)
    throw error
  } finally {
    for (const solid of solids) deleteShape(solid)
  }
}

function openConnectExpectedBounds(
  parameters: OpenGridSnapParameters,
): ModelBounds {
  return openGridSnapOpenConnectCompositeBounds(
    boundsForOpenGridSnap(parameters),
    parameters.variant,
  )
}

function openConnectNotchProbesFor(
  parameters: OpenGridSnapParameters,
  reference: Shape3D,
): Probe[] {
  const transform = xyEnvelopeTransformFor(parameters, readBounds(reference))
  return openGridSnapOpenConnectNotchSegmentsFor(parameters.variant).map(
    ({ min, max }) =>
      transformProbeXY(
        {
          min: [min[0] + 0.5, min[1] + 0.1, min[2] + 0.1],
          max: [max[0] - 0.5, max[1] - 0.1, max[2] - 0.1],
        },
        transform,
      ),
  )
}

export function inspectOpenGridSnapOpenConnectShapeQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  mesh: MeshData | MeshSnapshot,
  reference: Shape3D,
): OpenGridSnapQualityReport {
  const failures: string[] = []
  const expectedBounds = openConnectExpectedBounds(parameters)
  let bounds: ModelBounds | null = null
  let solidCount: number | null = null
  let baseReport: OpenGridSnapQualityReport | null = null
  let baseAssembly: Shape3D | null = null

  try {
    const expectedAnchor = openGridSnapOpenConnectAnchorForXYTransform(
      xyEnvelopeTransformFor(parameters, readBounds(reference)),
      parameters.variant,
    )
    const extracted = baseAssemblyWithoutOpenConnectHead(shape)
    baseAssembly = extracted.base
    const expectedHeadBounds =
      openGridSnapOpenConnectHeadBoundsForAnchor(expectedAnchor)
    if (!boundsMatch(extracted.headBounds, expectedHeadBounds, 0.45)) {
      failures.push('openconnect:interface-placement')
    }
    baseReport = inspectOpenGridSnapShapeQuality(
      baseAssembly,
      { ...parameters, openConnect: true },
      mesh,
      reference,
    )
    failures.push(...baseReport.failures.map((failure) => `base:${failure}`))
  } catch (error) {
    failures.push(
      `base:${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    deleteShape(baseAssembly)
  }

  try {
    const notchVolumes = openConnectNotchProbesFor(parameters, reference).map(
      (probe) => volumeInProbe(shape, probe),
    )
    if (notchVolumes.some((volume) => volume > 0.02)) {
      failures.push('openconnect:underside-notch-missing')
    }
  } catch (error) {
    failures.push(
      `openconnect:notch:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    bounds = readAssemblyBounds(shape)
    if (
      !boundsMatch(
        bounds,
        expectedBounds,
        OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE,
      )
    ) {
      failures.push('openconnect:expected-envelope')
    }
  } catch (error) {
    failures.push(
      `openconnect:bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    solidCount = countSolids(shape)
    const expectedSolidCount =
      openGridSnapProfileFor(parameters.profile, parameters.variant)
        .expectedSolidCount + 1
    if (solidCount !== expectedSolidCount) {
      failures.push('openconnect:expected-solid-count')
    }
    if (!solidBoundsFor(shape).some(isOpenConnectHeadSolid)) {
      failures.push('openconnect:head-placement')
    }
  } catch (error) {
    failures.push(
      `openconnect:topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    if (!isBRepValid(shape)) failures.push('openconnect:brep-invalid')
  } catch (error) {
    failures.push(
      `openconnect:brep:${error instanceof Error ? error.message : String(error)}`,
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
    solidCount,
    centralBounds: baseReport?.centralBounds ?? null,
    centralVolume: baseReport?.centralVolume ?? null,
    internalProbeVolumes: baseReport?.internalProbeVolumes ?? [],
    optionalFeatureProbeVolumes: baseReport?.optionalFeatureProbeVolumes ?? [],
    magnetHoleProbeVolumes: baseReport?.magnetHoleProbeVolumes ?? [],
    meshTriangleCount: mesh.triangleCount,
  }
}

export function assertOpenGridSnapOpenConnectShapeQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  mesh: MeshData | MeshSnapshot,
  reference: Shape3D,
): OpenGridSnapQualityReport {
  const report = inspectOpenGridSnapOpenConnectShapeQuality(
    shape,
    parameters,
    mesh,
    reference,
  )
  if (!report.passed) {
    throw new Error(
      `OPENGRID_SNAP_QUALITY_INVALID:${report.failures.join(';')}`,
    )
  }
  return report
}

type XYEnvelopeTransform = {
  scaleX: number
  scaleY: number
  centerX: number
  centerY: number
}

function xyEnvelopeTransformFor(
  parameters: OpenGridSnapParameters,
  sourceBounds: ModelBounds,
  targetBounds = boundsForOpenGridSnap(parameters),
): XYEnvelopeTransform {
  const sourceSpanX = sourceBounds.max[0] - sourceBounds.min[0]
  const sourceSpanY = sourceBounds.max[1] - sourceBounds.min[1]
  return {
    scaleX: (targetBounds.max[0] - targetBounds.min[0]) / sourceSpanX,
    scaleY: (targetBounds.max[1] - targetBounds.min[1]) / sourceSpanY,
    centerX: (targetBounds.min[0] + targetBounds.max[0]) / 2,
    centerY: (targetBounds.min[1] + targetBounds.max[1]) / 2,
  }
}

function preFootprintBoundsFor(
  parameters: OpenGridSnapParameters,
): ModelBounds {
  const fullBounds = boundsForOpenGridSnap({
    variant: parameters.variant,
    profile: parameters.profile,
    offset: parameters.offset,
    footprint: 'full',
  })
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  const extraX = axes.halfCellX === 'none' ? 0 : parameters.offset / 2
  const extraY = axes.halfCellY === 'none' ? 0 : parameters.offset / 2
  return {
    min: [
      fullBounds.min[0] - extraX,
      fullBounds.min[1] - extraY,
      fullBounds.min[2],
    ],
    max: [
      fullBounds.max[0] + extraX,
      fullBounds.max[1] + extraY,
      fullBounds.max[2],
    ],
  }
}

function partialClipTranslationFor(
  parameters: OpenGridSnapParameters,
  sourceBounds: ModelBounds,
): [number, number] {
  let minX = sourceBounds.min[0]
  let maxX = sourceBounds.max[0]
  let minY = sourceBounds.min[1]
  let maxY = sourceBounds.max[1]
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  if (axes.halfCellX === 'left') maxX = 0
  if (axes.halfCellX === 'right') minX = 0
  if (axes.halfCellY === 'bottom') maxY = 0
  if (axes.halfCellY === 'top') minY = 0
  return [-(minX + maxX) / 2, -(minY + maxY) / 2]
}

function pointIsInsidePartialClip(
  point: [number, number],
  parameters: OpenGridSnapParameters,
): boolean {
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  if (axes.halfCellX === 'left' && point[0] > 0.05) return false
  if (axes.halfCellX === 'right' && point[0] < -0.05) return false
  if (axes.halfCellY === 'bottom' && point[1] > 0.05) return false
  if (axes.halfCellY === 'top' && point[1] < -0.05) return false
  return true
}

function translatedPartialPointFor(
  sourcePoint: [number, number],
  parameters: OpenGridSnapParameters,
  referenceBounds: ModelBounds,
): [number, number] | null {
  if (parameters.footprint === 'full') return null
  const targetBounds = preFootprintBoundsFor(parameters)
  const transform = xyEnvelopeTransformFor(
    parameters,
    referenceBounds,
    targetBounds,
  )
  const transformed: [number, number] = [
    transform.centerX + (sourcePoint[0] - transform.centerX) * transform.scaleX,
    transform.centerY + (sourcePoint[1] - transform.centerY) * transform.scaleY,
  ]
  if (!pointIsInsidePartialClip(transformed, parameters)) return null
  const translation = partialClipTranslationFor(parameters, targetBounds)
  return [transformed[0] + translation[0], transformed[1] + translation[1]]
}

function transformBoundsXY(
  bounds: ModelBounds,
  transform: XYEnvelopeTransform,
): ModelBounds {
  const minX =
    transform.centerX + (bounds.min[0] - transform.centerX) * transform.scaleX
  const maxX =
    transform.centerX + (bounds.max[0] - transform.centerX) * transform.scaleX
  const minY =
    transform.centerY + (bounds.min[1] - transform.centerY) * transform.scaleY
  const maxY =
    transform.centerY + (bounds.max[1] - transform.centerY) * transform.scaleY
  return {
    min: [minX, minY, bounds.min[2]],
    max: [maxX, maxY, bounds.max[2]],
  }
}

function transformProbeXY(probe: Probe, transform: XYEnvelopeTransform): Probe {
  const bounds = transformBoundsXY(
    {
      min: probe.min,
      max: probe.max,
    },
    transform,
  )
  return { min: bounds.min, max: bounds.max }
}

function compareTransformedCore(
  shape: Shape3D,
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
  height: number,
  failures: string[],
): {
  centralBounds: ModelBounds | null
  centralVolume: number | null
  internalProbeVolumes: number[]
} {
  let centralBounds: ModelBounds | null = null
  let centralVolume: number | null = null
  const internalProbeVolumes: number[] = []
  let central: Solid | null = null
  let referenceCentral: Solid | null = null
  try {
    central = largestSolid(shape)
    referenceCentral = largestSolid(reference)
    centralBounds = readBounds(central)
    const referenceBounds = readBounds(referenceCentral)
    const transform = xyEnvelopeTransformFor(parameters, readBounds(reference))
    const expectedBounds = transformBoundsXY(referenceBounds, transform)
    centralVolume = measureVolume(central)
    const referenceVolume = measureVolume(referenceCentral)
    if (!boundsMatch(centralBounds, expectedBounds)) {
      failures.push('transformed-core:central-bounds-mismatch')
    }
    if (
      !parameters.openConnect &&
      !isClose(
        centralVolume,
        referenceVolume * transform.scaleX * transform.scaleY,
      )
    ) {
      failures.push('transformed-core:central-volume-mismatch')
    }

    for (const sourceProbe of fixedInternalProbes(height)) {
      const actualProbe = transformProbeXY(sourceProbe, transform)
      const actual = volumeInProbe(shape, actualProbe)
      const expected =
        volumeInProbe(reference, sourceProbe) *
        transform.scaleX *
        transform.scaleY
      internalProbeVolumes.push(actual)
      if (!isClose(actual, expected)) {
        failures.push('transformed-core:internal-probe-mismatch')
      }
    }
  } catch (error) {
    failures.push(
      `transformed-core:${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    deleteShape(central)
    deleteShape(referenceCentral)
  }

  return { centralBounds, centralVolume, internalProbeVolumes }
}

function compareTransformedStandardAssembly(
  shape: Shape3D,
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
  failures: string[],
): void {
  if (parameters.profile !== 'Standard' || hasHalfCell(parameters)) return

  const referenceBounds = readBounds(reference)
  const transform = xyEnvelopeTransformFor(parameters, referenceBounds)
  const referenceMembers = sortedSolidDescriptors(reference)
  const generatedMembers = sortedSolidDescriptors(shape)
  if (generatedMembers.length !== referenceMembers.length) {
    failures.push('transformed-assembly:member-count-mismatch')
    return
  }
  if (parameters.openConnect) return

  for (let index = 0; index < referenceMembers.length; index += 1) {
    const referenceMember = referenceMembers[index]
    const generatedMember = generatedMembers[index]
    if (!referenceMember || !generatedMember) {
      failures.push('transformed-assembly:member-missing')
      continue
    }
    if (
      !boundsMatch(
        generatedMember.bounds,
        transformBoundsXY(referenceMember.bounds, transform),
        0.15,
      )
    ) {
      failures.push('transformed-assembly:member-bounds-mismatch')
    }
    const shouldCompareVolume =
      index > 0 ||
      (!parameters.fourCornerLocatingHoles &&
        !parameters.centerRemoverHole &&
        parameters.magnetHoleShape === 'none')
    if (shouldCompareVolume) {
      const expectedVolume =
        referenceMember.volume * transform.scaleX * transform.scaleY
      if (
        !isClose(
          generatedMember.volume,
          expectedVolume,
          Math.max(0.2, expectedVolume * 0.002),
        )
      ) {
        failures.push('transformed-assembly:member-volume-mismatch')
      }
    }
  }
}

function directionalProfileProbes(height: number): Probe[] {
  const zMin = Math.max(0.2, height - 0.8)
  const zMax = height - 0.1
  return [
    { min: [-11, -11, zMin], max: [-9, -9, zMax] },
    { min: [9, -11, zMin], max: [11, -9, zMax] },
    { min: [-11, 9, zMin], max: [-9, 11, zMax] },
    { min: [9, 10.5, zMin], max: [11, 12.5, zMax] },
    { min: [-11, -1, zMin], max: [-9, 1, zMax] },
    { min: [9, -1, zMin], max: [11, 1, zMax] },
  ]
}

function partialScaleProbeCandidates(
  parameters: OpenGridSnapParameters,
  height: number,
): Probe[] {
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  const negativeRange: [number, number] = [-8, -7]
  const positiveRange: [number, number] = [7, 8]
  let xRanges: Array<[number, number]>
  if (axes.halfCellX === 'left') {
    xRanges = [negativeRange]
  } else if (axes.halfCellX === 'right') {
    xRanges = [positiveRange]
  } else {
    xRanges = [negativeRange, positiveRange]
  }
  let yRanges: Array<[number, number]>
  if (axes.halfCellY === 'top') {
    yRanges = [[3, 5]]
  } else if (axes.halfCellY === 'bottom') {
    yRanges = [[-5, -3]]
  } else {
    yRanges = [
      [-5, -3],
      [3, 5],
    ]
  }
  const probes: Probe[] = []
  const zMin = 0.1
  const zMax = Math.max(zMin + 0.1, height - 0.1)
  for (const [minX, maxX] of xRanges) {
    for (const [minY, maxY] of yRanges) {
      probes.push({ min: [minX, minY, zMin], max: [maxX, maxY, zMax] })
    }
  }
  return probes
}

function translateProbe(probe: Probe, translation: [number, number]): Probe {
  return {
    min: [
      probe.min[0] + translation[0],
      probe.min[1] + translation[1],
      probe.min[2],
    ],
    max: [
      probe.max[0] + translation[0],
      probe.max[1] + translation[1],
      probe.max[2],
    ],
  }
}

function compareTransformedPartialAssembly(
  shape: Shape3D,
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  failures: string[],
): void {
  if (
    parameters.footprint === 'full' ||
    !bounds ||
    parameters.offset <= 0 ||
    parameters.fourCornerLocatingHoles ||
    parameters.centerRemoverHole
  ) {
    return
  }
  const referenceBounds = readBounds(reference)
  const targetBounds = preFootprintBoundsFor(parameters)
  const transform = xyEnvelopeTransformFor(
    parameters,
    referenceBounds,
    targetBounds,
  )
  const translation = partialClipTranslationFor(parameters, targetBounds)
  let comparedProbeCount = 0
  for (const sourceProbe of partialScaleProbeCandidates(
    parameters,
    OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant],
  )) {
    const expected = volumeInProbe(reference, sourceProbe)
    if (expected <= QUALITY_TOLERANCE) continue
    const transformedProbe = transformProbeXY(sourceProbe, transform)
    if (
      !pointIsInsidePartialClip(
        [
          (transformedProbe.min[0] + transformedProbe.max[0]) / 2,
          (transformedProbe.min[1] + transformedProbe.max[1]) / 2,
        ],
        parameters,
      )
    ) {
      continue
    }
    const actualProbe = translateProbe(transformedProbe, translation)
    if (!probeFitsInBoundsBox(actualProbe, bounds)) continue
    const actual = volumeInProbe(shape, actualProbe)
    comparedProbeCount += 1
    if (
      !isClose(
        actual,
        expected * transform.scaleX * transform.scaleY,
        Math.max(0.05, expected * 0.1),
      )
    ) {
      failures.push('transformed-partial:probe-mismatch')
    }
  }
  if (comparedProbeCount === 0) {
    failures.push('transformed-partial:probes-empty')
  }
}

function compareTransformedDirectionalProfile(
  shape: Shape3D,
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
  failures: string[],
): void {
  if (
    parameters.profile !== 'Directional' ||
    parameters.footprint !== 'full' ||
    parameters.offset <= 0
  ) {
    return
  }

  const transform = xyEnvelopeTransformFor(parameters, readBounds(reference))
  let comparedProbeCount = 0
  for (const sourceProbe of directionalProfileProbes(
    OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant],
  )) {
    const expected = volumeInProbe(reference, sourceProbe)
    if (expected <= QUALITY_TOLERANCE) continue
    const actual = volumeInProbe(
      shape,
      transformProbeXY(sourceProbe, transform),
    )
    comparedProbeCount += 1
    if (
      !isClose(
        actual,
        expected * transform.scaleX * transform.scaleY,
        Math.max(0.05, expected * 0.1),
      )
    ) {
      failures.push('transformed-profile:directional-probe-mismatch')
    }
  }
  if (comparedProbeCount === 0) {
    failures.push('transformed-profile:directional-probes-empty')
  }
}

function hasHalfCell(parameters: OpenGridSnapParameters): boolean {
  return parameters.footprint !== 'full'
}

function halfCellBoundaryProbes(
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds,
): Probe[] {
  const probeWidth = 1
  const orthogonalMargin = 0.2
  const height = bounds.max[2] + 0.2
  const probes: Probe[] = []
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  if (axes.halfCellX !== 'none') {
    const isLeft = axes.halfCellX === 'left'
    const x = isLeft ? bounds.min[0] : bounds.max[0]
    const minX = isLeft ? x : x - probeWidth
    const maxX = isLeft ? x + probeWidth : x
    probes.push({
      min: [minX, bounds.min[1] + orthogonalMargin, -0.1],
      max: [maxX, bounds.max[1] - orthogonalMargin, height],
    })
  }
  if (axes.halfCellY !== 'none') {
    const isBottom = axes.halfCellY === 'bottom'
    const y = isBottom ? bounds.min[1] : bounds.max[1]
    const minY = isBottom ? y : y - probeWidth
    const maxY = isBottom ? y + probeWidth : y
    probes.push({
      min: [bounds.min[0] + orthogonalMargin, minY, -0.1],
      max: [bounds.max[0] - orthogonalMargin, maxY, height],
    })
  }
  return probes
}

function boundaryTouches(min: number, max: number, boundary: number): boolean {
  return min <= boundary + 0.75 && max >= boundary - 0.75
}

function hasDiagonalBoundaryFace(
  shape: Shape3D,
  axis: 'x' | 'y',
  boundaries: readonly [number, number],
): boolean {
  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const normal = face.normalAt()
      const faceBounds = face.boundingBox
      try {
        const [min, max] = faceBounds.bounds as [
          [number, number, number],
          [number, number, number],
        ]
        const lowerBoundary = boundaries[0]
        const upperBoundary = boundaries[1]
        const touches =
          axis === 'x'
            ? boundaryTouches(min[0], max[0], lowerBoundary) ||
              boundaryTouches(min[0], max[0], upperBoundary)
            : boundaryTouches(min[1], max[1], lowerBoundary) ||
              boundaryTouches(min[1], max[1], upperBoundary)
        const hasZSpan = max[2] - min[2] > 0.05
        const hasSlopedZChamfer =
          Math.abs(normal.z) > 0.1 && Math.abs(normal.z) < 0.99
        const hasPlanarLockingCorner =
          Math.abs(normal.z) < 0.1 &&
          Math.abs(normal.x) > 0.1 &&
          Math.abs(normal.y) > 0.1
        if (
          touches &&
          hasZSpan &&
          (hasSlopedZChamfer || hasPlanarLockingCorner)
        ) {
          return true
        }
      } finally {
        faceBounds.delete()
        normal.delete()
      }
    } finally {
      face.delete()
    }
  }
  return false
}

function hasAllDiagonalBoundaryCorners(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds,
): boolean {
  const centerX = (bounds.min[0] + bounds.max[0]) / 2
  const centerY = (bounds.min[1] + bounds.max[1]) / 2
  const minimumZSpan = bounds.max[2] - bounds.min[2] - 1.2
  const expectedDiagonal =
    14 / 2 +
    (parameters.footprint === 'half' ? 28 : 14) / 2 -
    OPENGRID_SNAP_BOUNDARY_PROFILE.cornerWidth
  const corners = new Set<string>()

  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const normal = face.normalAt()
      const faceBounds = face.boundingBox
      try {
        const [min, max] = faceBounds.bounds as [
          [number, number, number],
          [number, number, number],
        ]
        const isFullHeightDiagonal =
          max[2] - min[2] >= minimumZSpan &&
          Math.abs(normal.z) < 0.1 &&
          Math.abs(normal.x) > 0.1 &&
          Math.abs(normal.y) > 0.1
        if (!isFullHeightDiagonal) continue

        const xSign = (min[0] + max[0]) / 2 >= centerX ? 1 : -1
        const ySign = (min[1] + max[1]) / 2 >= centerY ? 1 : -1
        const minU = xSign > 0 ? min[0] : -max[0]
        const maxU = xSign > 0 ? max[0] : -min[0]
        const minV = ySign > 0 ? min[1] : -max[1]
        const maxV = ySign > 0 ? max[1] : -min[1]
        const diagonal = (minU + maxV + maxU + minV) / 2
        if (
          Math.abs(diagonal - expectedDiagonal) > 0.15 ||
          Math.abs(Math.abs(normal.x) - Math.SQRT1_2) > 0.05 ||
          Math.abs(Math.abs(normal.y) - Math.SQRT1_2) > 0.05
        ) {
          continue
        }
        const touchesX =
          xSign > 0
            ? boundaryTouches(min[0], max[0], bounds.max[0])
            : boundaryTouches(min[0], max[0], bounds.min[0])
        const touchesY =
          ySign > 0
            ? boundaryTouches(min[1], max[1], bounds.max[1])
            : boundaryTouches(min[1], max[1], bounds.min[1])
        if (touchesX && touchesY) corners.add(`${xSign}:${ySign}`)
      } finally {
        faceBounds.delete()
        normal.delete()
      }
    } finally {
      face.delete()
    }
  }

  return corners.size === 4
}

function inspectProfileQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  reference: Shape3D,
  failures: string[],
): void {
  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  if (parameters.profile === 'Directional' && bounds) {
    if (definition.assemblyKind !== 'fused-directional') {
      failures.push('profile:directional-assembly-kind-invalid')
    }
    if (!hasHalfCell(parameters)) {
      const xSpan = bounds.max[0] - bounds.min[0]
      const ySpan = bounds.max[1] - bounds.min[1]
      const expectedAsymmetry =
        definition.expectedBounds.max[1] -
        definition.expectedBounds.min[1] -
        (definition.expectedBounds.max[0] - definition.expectedBounds.min[0])
      if (Math.abs(ySpan - xSpan - expectedAsymmetry) > 0.15) {
        failures.push('profile:directional-asymmetry-missing')
      }
      if (
        !parameters.openConnect &&
        !parameters.fourCornerLocatingHoles &&
        !parameters.centerRemoverHole &&
        parameters.magnetHoleShape === 'none' &&
        parameters.offset === 0 &&
        Math.abs(measureVolume(shape) - measureVolume(reference)) >
          QUALITY_TOLERANCE
      ) {
        failures.push('profile:directional-baseline-changed')
      }
    }
  }
}

function snapHalfCellSourceInterfaceX(
  direction: OpenGridSnapCanonicalAxes['halfCellX'],
): number {
  if (direction === 'left') return -4
  if (direction === 'right') return 4
  return 0
}

function snapHalfCellSourceInterfaceY(
  direction: OpenGridSnapCanonicalAxes['halfCellY'],
): number {
  if (direction === 'bottom') return -4
  if (direction === 'top') return 4
  return 0
}

function snapHalfCellTranslationX(
  direction: OpenGridSnapCanonicalAxes['halfCellX'],
): number {
  if (direction === 'left') return 6.4
  if (direction === 'right') return -6.4
  return 0
}

function snapHalfCellTranslationY(
  direction: OpenGridSnapCanonicalAxes['halfCellY'],
): number {
  if (direction === 'bottom') return 6.4
  if (direction === 'top') return -6.4
  return 0
}

function inspectHalfCellQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  failures: string[],
): number[] {
  if (!bounds) return []
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  const translatedInterfaceX =
    snapHalfCellSourceInterfaceX(axes.halfCellX) +
    snapHalfCellTranslationX(axes.halfCellX)
  const translatedInterfaceY =
    snapHalfCellSourceInterfaceY(axes.halfCellY) +
    snapHalfCellTranslationY(axes.halfCellY)
  const probeHalfSize = 0.8
  const centralProbe: Probe = {
    min: [
      translatedInterfaceX - probeHalfSize,
      translatedInterfaceY - probeHalfSize,
      -0.2,
    ],
    max: [
      translatedInterfaceX + probeHalfSize,
      translatedInterfaceY + probeHalfSize,
      bounds.max[2] + 0.2,
    ],
  }
  const centralVolume = volumeInProbe(shape, centralProbe)
  const internalProbeVolumes = [centralVolume]
  if (centralVolume <= 0.01) {
    failures.push('half-cell:central-interface-missing')
  }

  for (const probe of halfCellBoundaryProbes(parameters, bounds)) {
    if (volumeInProbe(shape, probe) <= 0.01) {
      failures.push('half-cell:outer-support-missing')
    }
  }
  if (axes.halfCellX === 'left') {
    if (!hasDiagonalBoundaryFace(shape, 'x', [bounds.min[0], bounds.max[0]])) {
      failures.push('half-cell:left-locking-profile-missing')
    }
  }
  if (axes.halfCellX === 'right') {
    if (!hasDiagonalBoundaryFace(shape, 'x', [bounds.min[0], bounds.max[0]])) {
      failures.push('half-cell:right-locking-profile-missing')
    }
  }
  if (axes.halfCellY === 'bottom') {
    if (!hasDiagonalBoundaryFace(shape, 'y', [bounds.min[1], bounds.max[1]])) {
      failures.push('half-cell:bottom-locking-profile-missing')
    }
  }
  if (axes.halfCellY === 'top') {
    if (!hasDiagonalBoundaryFace(shape, 'y', [bounds.min[1], bounds.max[1]])) {
      failures.push('half-cell:top-locking-profile-missing')
    }
  }
  return internalProbeVolumes
}

function inspectCanonicalBoundaryQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  failures: string[],
): void {
  if (parameters.footprint === 'full' || !bounds) return

  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  if (!hasAllDiagonalBoundaryCorners(shape, parameters, bounds)) {
    failures.push('half-cell:canonical-four-corner-profile-missing')
  }
  if (
    axes.halfCellX === 'left' &&
    !hasDiagonalBoundaryFace(shape, 'x', [bounds.min[0], bounds.max[0]])
  ) {
    failures.push('half-cell:canonical-left-boundary-profile-missing')
  }
  if (
    axes.halfCellY === 'top' &&
    !hasDiagonalBoundaryFace(shape, 'y', [bounds.min[1], bounds.max[1]])
  ) {
    failures.push('half-cell:canonical-top-boundary-profile-missing')
  }
}

export function inspectOpenGridSnapShapeQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  mesh: MeshData | MeshSnapshot,
  reference: Shape3D,
): OpenGridSnapQualityReport {
  const expectedBounds = boundsForOpenGridSnap(parameters)
  const failures: string[] = []
  let bounds: ModelBounds | null = null
  let solidCount: number | null = null
  let centralBounds: ModelBounds | null = null
  let centralVolume: number | null = null
  let internalProbeVolumes: number[] = []
  let optionalFeatureProbeVolumes: number[] = []
  let magnetHoleProbeVolumes: number[] = []

  try {
    let envelopeTolerance = OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE
    if (parameters.offset === 0 && !hasHalfCell(parameters)) {
      envelopeTolerance = ZERO_OFFSET_ENVELOPE_TOLERANCE
    }
    bounds = readAssemblyBounds(shape)
    const boundsAreValid = hasHalfCell(parameters)
      ? boundsFitInsideEnvelope(bounds, expectedBounds, envelopeTolerance)
      : boundsMatch(bounds, expectedBounds, envelopeTolerance)
    if (!boundsAreValid) {
      failures.push('bounds:expected-centered-envelope')
    }
    const expectedZMin = expectedBounds.min[2]
    const expectedZMax = expectedBounds.max[2]
    if (
      !isClose(bounds.min[2], expectedZMin, envelopeTolerance) ||
      !isClose(bounds.max[2], expectedZMax, envelopeTolerance)
    ) {
      failures.push('bounds:z-profile-changed')
    }
  } catch (error) {
    failures.push(
      `bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    solidCount = countSolids(shape)
    if (hasHalfCell(parameters)) {
      if (solidCount < 1) failures.push('topology:half-cell-empty')
    } else {
      const expectedSolidCount = openGridSnapProfileFor(
        parameters.profile,
        parameters.variant,
      ).expectedSolidCount
      if (solidCount !== expectedSolidCount) {
        failures.push('topology:expected-profile-solids')
      }
    }
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

  try {
    compareTransformedStandardAssembly(shape, reference, parameters, failures)
    compareTransformedDirectionalProfile(shape, reference, parameters, failures)
    compareTransformedPartialAssembly(
      shape,
      reference,
      parameters,
      bounds,
      failures,
    )
  } catch (error) {
    failures.push(
      `transformed-profile:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (hasHalfCell(parameters)) {
    internalProbeVolumes = inspectHalfCellQuality(
      shape,
      parameters,
      bounds,
      failures,
    )
    inspectCanonicalBoundaryQuality(shape, parameters, bounds, failures)
    try {
      const central = largestSolid(shape)
      centralBounds = readBounds(central)
      centralVolume = measureVolume(central)
      deleteShape(central)
    } catch (error) {
      failures.push(
        `half-cell:central-solid:${error instanceof Error ? error.message : String(error)}`,
      )
    }
  } else if (
    parameters.profile === 'Standard' &&
    !parameters.fourCornerLocatingHoles &&
    !parameters.centerRemoverHole &&
    parameters.magnetHoleShape === 'none'
  ) {
    const transformedCore = compareTransformedCore(
      shape,
      reference,
      parameters,
      OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant],
      failures,
    )
    centralBounds = transformedCore.centralBounds
    centralVolume = transformedCore.centralVolume
    internalProbeVolumes = transformedCore.internalProbeVolumes
  } else {
    try {
      const central = largestSolid(shape)
      centralBounds = readBounds(central)
      centralVolume = measureVolume(central)
      deleteShape(central)
    } catch (error) {
      failures.push(
        `profile:central-solid:${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  try {
    optionalFeatureProbeVolumes = inspectOptionalFeatureProbes(
      shape,
      parameters,
      bounds,
      failures,
      reference,
    )
    if (parameters.magnetHoleShape !== 'none') {
      magnetHoleProbeVolumes = optionalFeatureProbeVolumes
    }
  } catch (error) {
    failures.push(
      `features:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    inspectProfileQuality(shape, parameters, bounds, reference, failures)
  } catch (error) {
    failures.push(
      `profile:${error instanceof Error ? error.message : String(error)}`,
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
    solidCount,
    centralBounds,
    centralVolume,
    internalProbeVolumes,
    optionalFeatureProbeVolumes,
    magnetHoleProbeVolumes,
    meshTriangleCount: mesh.triangleCount,
  }
}

export function assertOpenGridSnapShapeQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  mesh: MeshData | MeshSnapshot,
  reference: Shape3D,
): OpenGridSnapQualityReport {
  const report = inspectOpenGridSnapShapeQuality(
    shape,
    parameters,
    mesh,
    reference,
  )
  if (!report.passed) {
    throw new Error(
      `OPENGRID_SNAP_QUALITY_INVALID:${report.failures.join(';')}`,
    )
  }
  return report
}
