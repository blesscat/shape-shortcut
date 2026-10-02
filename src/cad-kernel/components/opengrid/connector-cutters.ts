import { makeBox, type Shape3D } from 'replicad'
import type {
  OpenGridConnectorLocation,
  OpenGridParameters,
  OpenGridPoint2D,
} from '../../../cad-contract/units'
import { isOpenGridLayeredVariant } from '../../../cad-contract/units'
import {
  openGridConnectorLocationsFor,
  OPENGRID_CONFIGURATION,
} from './profile'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'
import {
  disposeCutter,
  makePolygonalCylinder,
  OPENGRID_CONNECTOR_SIDES,
  type CutterGroup,
} from './cutters'
import type { OpenGridBuildContext } from './builder'
function connectorLevelForSurface(
  parameters: OpenGridParameters,
  layerHeight: number,
): number {
  if (parameters.variant === 'Lite') {
    const placementHeight = OPENGRID_CONFIGURATION.connector.cutoutHeight + 0.01
    return (
      layerHeight -
      placementHeight / 2 -
      OPENGRID_CONFIGURATION.connector.liteCutoutDistanceFromTop
    )
  }
  return layerHeight / 2
}

function connectorAxes(location: OpenGridConnectorLocation): {
  along: OpenGridPoint2D
  inward: OpenGridPoint2D
} {
  if (location.side === 'top' || location.side === 'bottom') {
    return {
      along: [1, 0],
      inward: [location.direction[0], location.direction[1]],
    }
  }
  return {
    along: [0, 1],
    inward: [location.direction[0], location.direction[1]],
  }
}

function connectorLocalPoint(
  location: OpenGridConnectorLocation,
  inwardDistance: number,
  alongDistance: number,
  z: number,
): [number, number, number] {
  const { along, inward } = connectorAxes(location)
  const [centerX, centerY] = location.center
  return [
    centerX + inward[0] * inwardDistance + along[0] * alongDistance,
    centerY + inward[1] * inwardDistance + along[1] * alongDistance,
    z,
  ]
}

function makeConnectorLocalBox(
  location: OpenGridConnectorLocation,
  inwardMin: number,
  inwardMax: number,
  alongMin: number,
  alongMax: number,
  zMin: number,
  zMax: number,
): Shape3D {
  const first = connectorLocalPoint(location, inwardMin, alongMin, zMin)
  const second = connectorLocalPoint(location, inwardMax, alongMax, zMax)
  return makeBox(
    [Math.min(first[0], second[0]), Math.min(first[1], second[1]), zMin],
    [Math.max(first[0], second[0]), Math.max(first[1], second[1]), zMax],
  )
}

function createConnectorCutterShape(
  location: OpenGridConnectorLocation,
  zCenter: number,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  const primaryRadius = OPENGRID_CONFIGURATION.connector.primaryRadius
  const dimpleRadius = OPENGRID_CONFIGURATION.connector.dimpleRadius
  const separation = OPENGRID_CONFIGURATION.connector.separation
  const height = OPENGRID_CONFIGURATION.connector.cutoutHeight
  const lowerZ = zCenter - height / 2
  let capsule: Shape3D | null = null
  const fuseScope = reporter?.createScope(3)
  const cutScope = reporter?.createScope(2)
  const intersectionScope = reporter?.createScope(1)
  try {
    // The official tool creates a hull of two X-copies, shifts it left by
    // 0.1 mm, then keeps the RIGHT half. X is therefore the inward axis;
    // Y runs along the board edge.
    const firstCenter = -primaryRadius - 0.1
    const secondCenter = primaryRadius - 0.1
    const box = makeConnectorLocalBox(
      location,
      firstCenter,
      secondCenter,
      -primaryRadius,
      primaryRadius,
      lowerZ,
      lowerZ + height,
    )
    const firstEnd = makePolygonalCylinder(
      primaryRadius * 2,
      height,
      connectorLocalPoint(location, firstCenter, 0, lowerZ),
      OPENGRID_CONNECTOR_SIDES,
    )
    capsule = measureBooleanInScope(fuseScope, 'fuse', () => box.fuse(firstEnd))
    if (capsule !== box) deleteShape(box)
    if (capsule !== firstEnd) deleteShape(firstEnd)
    const secondEnd = makePolygonalCylinder(
      primaryRadius * 2,
      height,
      connectorLocalPoint(location, secondCenter, 0, lowerZ),
      OPENGRID_CONNECTOR_SIDES,
    )
    const capsuleBeforeSecondFuse = capsule
    if (!capsuleBeforeSecondFuse)
      throw new Error('OPENGRID_CONNECTOR_CAPSULE_EMPTY')
    const expandedCapsule = measureBooleanInScope(fuseScope, 'fuse', () =>
      capsuleBeforeSecondFuse.fuse(secondEnd),
    )
    if (expandedCapsule !== capsule) deleteShape(capsule)
    if (expandedCapsule !== secondEnd) deleteShape(secondEnd)
    capsule = expandedCapsule

    const dimpleOffset = primaryRadius + separation
    for (const sign of [-1, 1]) {
      const dimple = makePolygonalCylinder(
        dimpleRadius * 2,
        height + 0.02,
        connectorLocalPoint(location, 0, sign * dimpleOffset, lowerZ - 0.01),
        OPENGRID_CONNECTOR_SIDES,
      )
      const currentCapsule: Shape3D | null = capsule
      if (!currentCapsule) throw new Error('OPENGRID_CONNECTOR_CAPSULE_EMPTY')
      const cut: Shape3D = measureBooleanInScope(cutScope, 'cut', () =>
        currentCapsule.cut(dimple),
      )
      if (cut !== currentCapsule) deleteShape(currentCapsule)
      deleteShape(dimple)
      capsule = cut
    }

    // The source's small outward-flare rectangle is part of the union
    // after the half-space operation. A box preserves its functional
    // 1 × 4.8 mm opening envelope while keeping the cutter native.
    const flare = makeConnectorLocalBox(
      location,
      -0.01,
      1,
      -(separation * 2 - (dimpleRadius - separation)) / 2,
      (separation * 2 - (dimpleRadius - separation)) / 2,
      lowerZ,
      lowerZ + height,
    )
    const currentCapsule = capsule
    if (!currentCapsule) throw new Error('OPENGRID_CONNECTOR_CAPSULE_EMPTY')
    const withFlare = measureBooleanInScope(fuseScope, 'fuse', () =>
      currentCapsule.fuse(flare),
    )
    if (withFlare !== currentCapsule) deleteShape(currentCapsule)
    if (withFlare !== flare) deleteShape(flare)
    capsule = withFlare

    const halfSpace = makeConnectorLocalBox(
      location,
      -0.01,
      primaryRadius * 4,
      -primaryRadius * 4,
      primaryRadius * 4,
      lowerZ - 0.01,
      lowerZ + height + 0.01,
    )
    const capsuleBeforeIntersection = capsule
    if (!capsuleBeforeIntersection)
      throw new Error('OPENGRID_CONNECTOR_CAPSULE_EMPTY')
    const clipped = measureBooleanInScope(intersectionScope, 'intersect', () =>
      capsuleBeforeIntersection.intersect(halfSpace),
    )
    if (clipped !== capsule) deleteShape(capsule)
    deleteShape(halfSpace)
    capsule = clipped
    return clipped
  } catch (error) {
    deleteShape(capsule)
    throw error
  }
}

function createConnectorCutterGroupsForLocations(
  parameters: OpenGridParameters,
  locations: readonly OpenGridConnectorLocation[],
  layerHeight: number,
  context: OpenGridBuildContext,
  zOffset = 0,
): CutterGroup[] {
  if (locations.length === 0) return []
  const zCenter = connectorLevelForSurface(parameters, layerHeight)
  const groups: CutterGroup[] = []
  try {
    for (const location of locations) {
      const shape = createConnectorCutterShape(
        location,
        zCenter + zOffset,
        context.booleanOperations,
      )
      groups.push({ shape, parts: [shape] })
    }
    return groups
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    throw error
  }
}

function createBoardConnectorCutterGroups(
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): CutterGroup[] {
  const locations = openGridConnectorLocationsFor(parameters)
  if (locations.length === 0) return []
  if (!isOpenGridLayeredVariant(parameters.variant)) {
    const layerHeight =
      parameters.variant === 'Lite'
        ? OPENGRID_CONFIGURATION.variants.Lite.thickness
        : OPENGRID_CONFIGURATION.variants.Full.thickness
    return createConnectorCutterGroupsForLocations(
      parameters,
      locations,
      layerHeight,
      context,
    )
  }

  const layerHeight = OPENGRID_CONFIGURATION.variants.Full.thickness
  const upperLayerOffset = layerHeight + OPENGRID_CONFIGURATION.heavyGap
  const groups: CutterGroup[] = []
  try {
    groups.push(
      ...createConnectorCutterGroupsForLocations(
        parameters,
        locations,
        layerHeight,
        context,
      ),
    )
    groups.push(
      ...createConnectorCutterGroupsForLocations(
        parameters,
        locations,
        layerHeight,
        context,
        upperLayerOffset,
      ),
    )
    return groups
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    throw error
  }
}

export { createBoardConnectorCutterGroups }
