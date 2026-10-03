import { makeBox, makePolygon, makeSolid, type Shape3D } from 'replicad'
import type {
  OpenGridParameters,
  OpenGridPoint2D,
} from '../../../cad-contract/units'
import {
  cellCenterForOpenGrid,
  openGridProfileConstants,
  OPENGRID_CONFIGURATION,
  type OpenGridProfilePoint,
} from './profile'
import { deleteShape } from '../../lifetime/dispose'
import {
  addSpatialAssemblyPiece,
  fuseSpatialAssemblyRegionGroups,
  type SpatialAssemblyPiece,
} from './assembly'
import { extrudeProfile } from './tiles'
import {
  assertGenerationCurrent,
  yieldAtSafeBoundary,
  type OpenGridBuildContext,
} from './builder'
type HybridSurfaceProfile = 'Full' | 'Heavy'
type HybridTransitionSide = 'top' | 'right' | 'bottom' | 'left'
type HybridTransitionCorner =
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
type HybridAssemblyRegion =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'corner-top-left'
  | 'corner-top-right'
  | 'corner-bottom-left'
  | 'corner-bottom-right'
  | 'half-cell'

function hybridAssemblyRegionForCell(
  parameters: OpenGridParameters,
  row: number,
  column: number,
): HybridAssemblyRegion {
  const isTop = row === 0
  const isRight = column === parameters.columns - 1
  const isBottom = row === parameters.rows - 1
  const isLeft = column === 0

  if (isTop && isLeft) return 'corner-top-left'
  if (isTop && isRight) return 'corner-top-right'
  if (isBottom && isLeft) return 'corner-bottom-left'
  if (isBottom && isRight) return 'corner-bottom-right'
  if (isTop) return 'top'
  if (isRight) return 'right'
  if (isBottom) return 'bottom'
  if (isLeft) return 'left'
  throw new Error('OPENGRID_HYBRID_INTERIOR_REGION')
}

function isHybridPerimeterCell(
  parameters: OpenGridParameters,
  row: number,
  column: number,
): boolean {
  return (
    row === 0 ||
    row === parameters.rows - 1 ||
    column === 0 ||
    column === parameters.columns - 1
  )
}

function hybridPerimeterCellCount(parameters: OpenGridParameters): number {
  let count = 0
  for (let row = 0; row < parameters.rows; row += 1) {
    for (let column = 0; column < parameters.columns; column += 1) {
      if (isHybridPerimeterCell(parameters, row, column)) count += 1
    }
  }
  return count
}

function hybridSurfaceProfileForCell(
  parameters: OpenGridParameters,
  row: number,
  column: number,
): HybridSurfaceProfile {
  return isHybridPerimeterCell(parameters, row, column) ? 'Heavy' : 'Full'
}

function hybridTransitionSpan(): number {
  return OPENGRID_CONFIGURATION.hybridTransitionSpan
}

function hybridTransitionCenter(
  parameters: OpenGridParameters,
  row: number,
  column: number,
  side: HybridTransitionSide,
): OpenGridPoint2D {
  const [centerX, centerY] = cellCenterForOpenGrid(parameters, row, column)
  const halfSpan = hybridTransitionSpan() / 2
  switch (side) {
    case 'top':
      return [
        centerX,
        centerY - OPENGRID_CONFIGURATION.gridPitch / 2 - halfSpan,
      ]
    case 'right':
      return [
        centerX - OPENGRID_CONFIGURATION.gridPitch / 2 - halfSpan,
        centerY,
      ]
    case 'bottom':
      return [
        centerX,
        centerY + OPENGRID_CONFIGURATION.gridPitch / 2 + halfSpan,
      ]
    case 'left':
      return [
        centerX + OPENGRID_CONFIGURATION.gridPitch / 2 + halfSpan,
        centerY,
      ]
  }
}

function hybridTransitionCellForSide(
  row: number,
  column: number,
  side: HybridTransitionSide,
): [number, number] {
  switch (side) {
    case 'top':
      return [row + 1, column]
    case 'right':
      return [row, column - 1]
    case 'bottom':
      return [row - 1, column]
    case 'left':
      return [row, column + 1]
  }
}

function hybridTransitionCornerForCell(
  parameters: OpenGridParameters,
  row: number,
  column: number,
): HybridTransitionCorner | null {
  const isTop = row === 0
  const isRight = column === parameters.columns - 1
  const isBottom = row === parameters.rows - 1
  const isLeft = column === 0

  if (isTop && isLeft) return 'top-left'
  if (isTop && isRight) return 'top-right'
  if (isBottom && isLeft) return 'bottom-left'
  if (isBottom && isRight) return 'bottom-right'
  return null
}

function hybridTransitionCornerDirections(corner: HybridTransitionCorner): {
  x: 1 | -1
  y: 1 | -1
} {
  switch (corner) {
    case 'top-left':
      return { x: 1, y: -1 }
    case 'top-right':
      return { x: -1, y: -1 }
    case 'bottom-left':
      return { x: 1, y: 1 }
    case 'bottom-right':
      return { x: -1, y: 1 }
  }
}

function hybridTransitionCornerLength(): number {
  return openGridProfileConstants(
    OPENGRID_CONFIGURATION.gridPitch,
    OPENGRID_CONFIGURATION.variants.Full.thickness,
  ).cornerOffset
}

function hybridTransitionCornerCoordinates(
  parameters: OpenGridParameters,
  row: number,
  column: number,
  corner: HybridTransitionCorner,
): { corner: OpenGridPoint2D; innerCell: OpenGridPoint2D } {
  const halfTile = OPENGRID_CONFIGURATION.gridPitch / 2
  const directions = hybridTransitionCornerDirections(corner)
  const innerRow = row - directions.y
  const innerColumn = column + directions.x
  const innerCell = cellCenterForOpenGrid(parameters, innerRow, innerColumn)
  const innerCorner: OpenGridPoint2D = [
    innerCell[0] - directions.x * halfTile,
    innerCell[1] - directions.y * halfTile,
  ]
  return { corner: innerCorner, innerCell }
}

function buildHybridTransitionCornerWedge(
  parameters: OpenGridParameters,
  row: number,
  column: number,
  corner: HybridTransitionCorner,
): Shape3D {
  const { corner: innerCorner, innerCell } = hybridTransitionCornerCoordinates(
    parameters,
    row,
    column,
    corner,
  )
  const directions = hybridTransitionCornerDirections(corner)
  const length = hybridTransitionCornerLength()
  const fullThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  const heavyThickness = OPENGRID_CONFIGURATION.variants.Heavy.thickness
  const seamOverlap = OPENGRID_CONFIGURATION.heavyGap
  const xSide: OpenGridPoint2D = [
    innerCorner[0] + directions.x * length,
    innerCorner[1],
  ]
  const ySide: OpenGridPoint2D = [
    innerCorner[0],
    innerCorner[1] + directions.y * length,
  ]
  const bottomZ = fullThickness - seamOverlap
  const lowTopZ = fullThickness + seamOverlap
  const bottom: [number, number, number][] = [
    [innerCorner[0], innerCorner[1], bottomZ],
    [xSide[0], xSide[1], bottomZ],
    [ySide[0], ySide[1], bottomZ],
  ]
  const top: [number, number, number][] = [
    [innerCorner[0], innerCorner[1], heavyThickness],
    [xSide[0], xSide[1], lowTopZ],
    [ySide[0], ySide[1], lowTopZ],
  ]
  const faces = [
    makePolygon([...bottom].reverse()),
    makePolygon([...top]),
    makePolygon([bottom[0], bottom[1], top[1], top[0]]),
    makePolygon([bottom[1], bottom[2], top[2], top[1]]),
    makePolygon([bottom[2], bottom[0], top[0], top[2]]),
  ]
  let wedge: Shape3D | null = null
  try {
    wedge = makeSolid(faces)
    return clipHybridTransitionToOpening(wedge, innerCell)
  } catch (error) {
    deleteShape(wedge)
    throw error
  } finally {
    for (const face of faces) deleteShape(face)
  }
}

function hybridTransitionCornerCenter(
  parameters: OpenGridParameters,
  row: number,
  column: number,
  corner: HybridTransitionCorner,
): OpenGridPoint2D {
  const { corner: innerCorner } = hybridTransitionCornerCoordinates(
    parameters,
    row,
    column,
    corner,
  )
  const directions = hybridTransitionCornerDirections(corner)
  const centerOffset = hybridTransitionCornerLength() / 3
  return [
    innerCorner[0] + directions.x * centerOffset,
    innerCorner[1] + directions.y * centerOffset,
  ]
}

function clipHybridTransitionToOpening(
  shape: Shape3D,
  openingCenter: OpenGridPoint2D,
): Shape3D {
  const openingHalfSize = OPENGRID_CONFIGURATION.tileInnerSize / 2
  const heavyThickness = OPENGRID_CONFIGURATION.variants.Heavy.thickness
  const opening = makeBox(
    [
      openingCenter[0] - openingHalfSize,
      openingCenter[1] - openingHalfSize,
      -0.01,
    ],
    [
      openingCenter[0] + openingHalfSize,
      openingCenter[1] + openingHalfSize,
      heavyThickness + 0.01,
    ],
  )
  try {
    const clipped = shape.cut(opening)
    if (clipped !== shape) deleteShape(shape)
    return clipped
  } finally {
    deleteShape(opening)
  }
}

function hybridTransitionSidesForCell(
  parameters: OpenGridParameters,
  row: number,
  column: number,
): HybridTransitionSide[] {
  if (parameters.rows < 3 || parameters.columns < 3) return []

  const sides: HybridTransitionSide[] = []
  const addSideWhenNeighborIsInterior = (side: HybridTransitionSide): void => {
    const [transitionRow, transitionColumn] = hybridTransitionCellForSide(
      row,
      column,
      side,
    )
    if (!isHybridPerimeterCell(parameters, transitionRow, transitionColumn)) {
      sides.push(side)
    }
  }

  if (row === 0) addSideWhenNeighborIsInterior('top')
  if (column === parameters.columns - 1) {
    addSideWhenNeighborIsInterior('right')
  }
  if (row === parameters.rows - 1) addSideWhenNeighborIsInterior('bottom')
  if (column === 0) addSideWhenNeighborIsInterior('left')
  return sides
}

function buildHybridTransitionWedge(
  parameters: OpenGridParameters,
  row: number,
  column: number,
  side: HybridTransitionSide,
): Shape3D {
  const [centerX, centerY] = cellCenterForOpenGrid(parameters, row, column)
  const halfTile = OPENGRID_CONFIGURATION.gridPitch / 2
  const span = hybridTransitionSpan()
  const fullThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  const heavyThickness = OPENGRID_CONFIGURATION.variants.Heavy.thickness
  const seamOverlap = OPENGRID_CONFIGURATION.heavyGap
  const signedSpan = side === 'top' || side === 'right' ? span : -span
  const profile: OpenGridProfilePoint[] = [
    [0, fullThickness - seamOverlap],
    [signedSpan, fullThickness - seamOverlap],
    [signedSpan, heavyThickness],
    [0, fullThickness + seamOverlap],
  ]

  if (side === 'top' || side === 'bottom') {
    const boundaryY = side === 'top' ? centerY - halfTile : centerY + halfTile
    const originY = side === 'top' ? boundaryY - span : boundaryY + span
    const wedge = extrudeProfile(
      'YZ',
      [centerX - halfTile, originY, 0],
      profile,
      OPENGRID_CONFIGURATION.gridPitch,
      [1, 0, 0],
    )
    const [transitionRow, transitionColumn] = hybridTransitionCellForSide(
      row,
      column,
      side,
    )
    return clipHybridTransitionToOpening(
      wedge,
      cellCenterForOpenGrid(parameters, transitionRow, transitionColumn),
    )
  }

  const boundaryX = side === 'right' ? centerX - halfTile : centerX + halfTile
  const originX = side === 'right' ? boundaryX - span : boundaryX + span
  const wedge = extrudeProfile(
    'XZ',
    [originX, centerY - halfTile, 0],
    profile,
    OPENGRID_CONFIGURATION.gridPitch,
    [0, 1, 0],
  )
  const [transitionRow, transitionColumn] = hybridTransitionCellForSide(
    row,
    column,
    side,
  )
  return clipHybridTransitionToOpening(
    wedge,
    cellCenterForOpenGrid(parameters, transitionRow, transitionColumn),
  )
}

async function buildHybridTransitionWedges(
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D | null> {
  const regionGroups = new Map<string, SpatialAssemblyPiece[]>()

  if (parameters.rows < 3 || parameters.columns < 3) return null

  try {
    for (let row = 0; row < parameters.rows; row += 1) {
      for (let column = 0; column < parameters.columns; column += 1) {
        for (const side of hybridTransitionSidesForCell(
          parameters,
          row,
          column,
        )) {
          assertGenerationCurrent(context)
          addSpatialAssemblyPiece(regionGroups, side, {
            shape: buildHybridTransitionWedge(parameters, row, column, side),
            center: hybridTransitionCenter(parameters, row, column, side),
          })
          await yieldAtSafeBoundary(context)
        }
        const corner = hybridTransitionCornerForCell(parameters, row, column)
        if (corner) {
          assertGenerationCurrent(context)
          addSpatialAssemblyPiece(regionGroups, `corner-${corner}`, {
            shape: buildHybridTransitionCornerWedge(
              parameters,
              row,
              column,
              corner,
            ),
            center: hybridTransitionCornerCenter(
              parameters,
              row,
              column,
              corner,
            ),
          })
          await yieldAtSafeBoundary(context)
        }
      }
    }

    if (regionGroups.size === 0) return null
    return await fuseSpatialAssemblyRegionGroups(regionGroups.values(), context)
  } catch (error) {
    for (const pieces of regionGroups.values()) {
      for (const piece of pieces) deleteShape(piece.shape)
    }
    throw error
  }
}

export {
  buildHybridTransitionWedges,
  hybridAssemblyRegionForCell,
  hybridPerimeterCellCount,
  hybridSurfaceProfileForCell,
  isHybridPerimeterCell,
}
export type { HybridSurfaceProfile }
