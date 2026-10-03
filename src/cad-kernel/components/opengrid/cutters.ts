import { makeBox, makeCompound, Sketcher, type Shape3D } from 'replicad'
import type {
  OpenGridParameters,
  OpenGridPoint2D,
} from '../../../cad-contract/units'
import {
  fullGridCenterOffsetX,
  fullGridCenterOffsetY,
  isOpenGridLayeredVariant,
} from '../../../cad-contract/units'
import {
  openGridBoardConfiguration,
  openGridNominalBoardConfiguration,
  openGridScrewCentersFor,
  OPENGRID_CONFIGURATION,
} from './profile'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'
import type { OpenGridBuildContext } from './builder'
type CutterGroup = {
  shape: Shape3D
  parts: readonly Shape3D[]
}

function disposeCutter(group: CutterGroup | null): void {
  if (!group) return
  deleteShape(group.shape)
  for (const part of group.parts) {
    if (part !== group.shape) deleteShape(part)
  }
}

function combineCutterGroups(groups: CutterGroup[]): CutterGroup[] {
  if (groups.length <= 1) return groups

  try {
    // Let the final source cut process every solid together. Fusing separate
    // cutters first adds expensive cutter-to-cutter booleans without changing
    // the material removed from the board.
    // Flatten the owned parts before making the final cutter; nested
    // compounds are not reliably processed by the native boolean cut.
    const compoundParts = groups.flatMap((group) => group.parts)
    const compound = makeCompound(compoundParts).asShape3D()
    const ownedParts = [
      ...new Set(groups.flatMap((group) => [group.shape, ...group.parts])),
    ]
    return [
      {
        shape: compound,
        parts: ownedParts,
      },
    ]
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    throw error
  }
}

function chamferCenters(parameters: OpenGridParameters): OpenGridPoint2D[] {
  if (parameters.chamfers === 'none') return []
  const board = openGridBoardConfiguration(parameters)
  const nominalBoard = openGridNominalBoardConfiguration(parameters)
  const fullGridWidth = parameters.columns * OPENGRID_CONFIGURATION.gridPitch
  const fullGridDepth = parameters.rows * OPENGRID_CONFIGURATION.gridPitch
  const fullGridMinX =
    -fullGridWidth / 2 + fullGridCenterOffsetX(parameters.halfCellX)
  const fullGridMaxY =
    fullGridDepth / 2 + fullGridCenterOffsetY(parameters.halfCellY)
  const screwSuppressesInternalChamfers =
    parameters.screwMode === 'corners' || parameters.screwMode === 'everywhere'
  const useEverywhere =
    parameters.chamfers === 'everywhere' && !screwSuppressesInternalChamfers
  if (useEverywhere) {
    const centers: OpenGridPoint2D[] = []
    for (let row = 0; row <= parameters.rows; row += 1) {
      for (let column = 0; column <= parameters.columns; column += 1) {
        centers.push([
          fullGridMinX + column * OPENGRID_CONFIGURATION.gridPitch,
          fullGridMaxY - row * OPENGRID_CONFIGURATION.gridPitch,
        ])
      }
    }
    if (
      board.width !== nominalBoard.width ||
      board.depth !== nominalBoard.depth
    ) {
      centers.push(
        [-board.width / 2, board.depth / 2],
        [board.width / 2, board.depth / 2],
        [-board.width / 2, -board.depth / 2],
        [board.width / 2, -board.depth / 2],
      )
    }
    return centers
  }

  const corners = parameters.chamferCorners
  const centers: OpenGridPoint2D[] = []
  const addCorners = (width: number, depth: number): void => {
    if (corners.topLeft) centers.push([-width / 2, depth / 2])
    if (corners.topRight) centers.push([width / 2, depth / 2])
    if (corners.bottomLeft) centers.push([-width / 2, -depth / 2])
    if (corners.bottomRight) centers.push([width / 2, -depth / 2])
  }
  addCorners(nominalBoard.width, nominalBoard.depth)
  if (
    board.width !== nominalBoard.width ||
    board.depth !== nominalBoard.depth
  ) {
    addCorners(board.width, board.depth)
  }
  return centers
}

function createChamferCutters(
  parameters: OpenGridParameters,
  zOffset = 0,
  layerHeight = openGridBoardConfiguration(parameters).height,
): CutterGroup[] {
  if (parameters.fitToTarget) return []
  const side = Math.sqrt(OPENGRID_CONFIGURATION.intersectionDistance ** 2 * 2)
  const groups: CutterGroup[] = []
  for (const [x, y] of chamferCenters(parameters)) {
    const cutter = makeBox(
      [-side / 2, -side / 2, zOffset - 0.01],
      [side / 2, side / 2, zOffset + layerHeight + 0.01],
    )
    const rotated = cutter.rotate(45, [0, 0, 0], [0, 0, 1])
    if (rotated !== cutter) deleteShape(cutter)
    const translated = rotated.translate(x, y, 0)
    if (translated !== rotated) deleteShape(rotated)
    groups.push({ shape: translated, parts: [translated] })
  }
  return groups
}

function chamferCutterGroups(
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
  zOffset = 0,
  layerHeight = openGridBoardConfiguration(parameters).height,
): CutterGroup[] {
  const groups = createChamferCutters(parameters, zOffset, layerHeight)
  if (
    context.useCompoundChamferCutters === false ||
    parameters.chamfers === 'everywhere'
  )
    return groups
  return combineCutterGroups(groups)
}

const OPENGRID_SCREW_SIDES = 30
const OPENGRID_CONNECTOR_SIDES = 50

function makePolygonalFrustum(
  startDiameter: number,
  endDiameter: number,
  height: number,
  center: [number, number, number],
  sides: number,
): Shape3D {
  const sketcher = new Sketcher('XY', center)
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const radius = startDiameter / 2
    sketcher.movePointerTo([radius, 0])
    for (let side = 1; side < sides; side += 1) {
      const angle = (side * 2 * Math.PI) / sides
      sketcher.lineTo([radius * Math.cos(angle), radius * Math.sin(angle)])
    }
    sketch = sketcher.close()
    return sketch.extrude(height, {
      extrusionProfile: {
        profile: 'linear',
        endFactor: endDiameter / startDiameter,
      },
    })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function makePolygonalCylinder(
  diameter: number,
  height: number,
  center: [number, number, number],
  sides: number,
): Shape3D {
  return makePolygonalFrustum(diameter, diameter, height, center, sides)
}

function screwHeadCutters(
  x: number,
  y: number,
  layerHeight: number,
  dimensions: OpenGridParameters,
  outward: 'top' | 'bottom',
  zOffset = 0,
): Shape3D[] {
  const headDiameter = dimensions.screwHeadDiameter
  const screwDiameter = dimensions.screwDiameter
  const angle = dimensions.screwHeadCountersunkDegree
  const coneHeight = dimensions.screwHeadIsCountersunk
    ? Math.max(
        0.01,
        Math.tan(((180 - angle) * Math.PI) / 360) *
          (headDiameter / 2 - screwDiameter / 2) -
          0.01,
      )
    : 0.01
  const inset = Math.max(dimensions.screwHeadInset, 0.01)
  if (outward === 'top') {
    // openGrid.scad places the head cylinder at the top surface and attaches
    // the countersink below its bottom face. The through-hole therefore
    // reaches the small end of the cone before the top capture begins.
    const headBase = zOffset + layerHeight + 0.01 - inset
    return [
      makePolygonalFrustum(
        screwDiameter,
        headDiameter,
        coneHeight,
        [x, y, headBase - coneHeight],
        OPENGRID_SCREW_SIDES,
      ),
      makePolygonalCylinder(
        headDiameter,
        inset,
        [x, y, headBase],
        OPENGRID_SCREW_SIDES,
      ),
    ]
  }
  const headTop = zOffset + inset - 0.01
  return [
    makePolygonalFrustum(
      headDiameter,
      screwDiameter,
      coneHeight,
      [x, y, headTop],
      OPENGRID_SCREW_SIDES,
    ),
    makePolygonalCylinder(
      headDiameter,
      inset,
      [x, y, zOffset],
      OPENGRID_SCREW_SIDES,
    ),
  ]
}

function fuseCutterParts(
  parts: Shape3D[],
  reporter: BooleanOperationReporter | undefined,
): CutterGroup {
  const first = parts[0]
  if (!first) throw new Error('OPENGRID_CUTTER_EMPTY')
  const owned = new Set(parts)
  let combined = first
  const fuseScope = reporter?.createScope(parts.length - 1)
  try {
    for (const part of parts.slice(1)) {
      const fused = measureBooleanInScope(fuseScope, 'fuse', () =>
        combined.fuse(part),
      )
      if (fused !== combined) {
        owned.delete(combined)
        deleteShape(combined)
      }
      if (fused !== part) {
        owned.delete(part)
        deleteShape(part)
      }
      owned.add(fused)
      combined = fused
    }
    owned.delete(combined)
    return { shape: combined, parts: [combined] }
  } catch (error) {
    for (const part of owned) deleteShape(part)
    throw error
  }
}

function createScrewCutterGroupsForLayer(
  parameters: OpenGridParameters,
  centers: readonly OpenGridPoint2D[],
  layerHeight: number,
  outward: 'top' | 'bottom',
  context: OpenGridBuildContext,
  zOffset = 0,
): CutterGroup[] {
  if (centers.length === 0) return []
  const groups: CutterGroup[] = []
  try {
    for (const [x, y] of centers) {
      const parts = [
        makePolygonalCylinder(
          parameters.screwDiameter,
          layerHeight + 0.02,
          [x, y, zOffset - 0.01],
          OPENGRID_SCREW_SIDES,
        ),
        ...screwHeadCutters(x, y, layerHeight, parameters, outward, zOffset),
      ]
      // The shaft and head cutters overlap. They must be fused per screw
      // before any optional board-level compound is made; a native cut of a
      // compound containing overlapping solids can leave the hole material.
      groups.push(fuseCutterParts(parts, context.booleanOperations))
    }
    return groups
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    throw error
  }
}

function createBoardScrewCutterGroups(
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): CutterGroup[] {
  const centers = openGridScrewCentersFor(parameters)
  if (centers.length === 0) return []

  if (!isOpenGridLayeredVariant(parameters.variant)) {
    const layerHeight =
      parameters.variant === 'Lite'
        ? OPENGRID_CONFIGURATION.variants.Lite.thickness
        : OPENGRID_CONFIGURATION.variants.Full.thickness
    return createScrewCutterGroupsForLayer(
      parameters,
      centers,
      layerHeight,
      'top',
      context,
    )
  }

  const board = openGridBoardConfiguration(parameters)
  const groups: CutterGroup[] = []
  try {
    for (const [x, y] of centers) {
      const parts = [
        makePolygonalCylinder(
          parameters.screwDiameter,
          board.height + 0.02,
          [x, y, -0.01],
          OPENGRID_SCREW_SIDES,
        ),
        ...screwHeadCutters(x, y, board.height, parameters, 'top'),
        ...screwHeadCutters(x, y, board.height, parameters, 'bottom'),
      ]
      groups.push(fuseCutterParts(parts, context.booleanOperations))
    }
    return groups
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    throw error
  }
}

export {
  chamferCutterGroups,
  createBoardScrewCutterGroups,
  createChamferCutters,
}
export { combineCutterGroups, disposeCutter, makePolygonalCylinder }
export { OPENGRID_CONNECTOR_SIDES }
export type { CutterGroup }
