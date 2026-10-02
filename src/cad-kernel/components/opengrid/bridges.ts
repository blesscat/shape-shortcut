import { makeBox, type Shape3D } from 'replicad'
import type {
  HalfCellX,
  HalfCellY,
  OpenGridParameters,
} from '../../../cad-contract/units'
import {
  cellCenterForOpenGrid,
  openGridProfileConstants,
  OPENGRID_CONFIGURATION,
} from './profile'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'
import { fuseBalanced, fuseByStrategy } from './assembly'
import {
  addHalfCellExtensions,
  buildHalfCellExtensionPieces,
  cloneRotated,
} from './tiles'
import {
  yieldAtSafeBoundary,
  type OpenGridAssemblyStrategy,
  type OpenGridBuildContext,
} from './builder'
function buildFlatBridgeTile(
  centerX: number,
  centerY: number,
  zOffset: number,
  reporter: BooleanOperationReporter | undefined,
): Shape3D[] {
  const tileSize = OPENGRID_CONFIGURATION.gridPitch
  const halfTile = tileSize / 2
  // The official Heavy middle layer uses projection(cut=true) at the
  // Full-profile mid-plane. At that section the rail reaches only the
  // outside extrusion; projecting the complete top capture would make the
  // bridge wider than the official OpenSCAD result.
  const railWidth = OPENGRID_CONFIGURATION.outsideExtrusion
  const height = OPENGRID_CONFIGURATION.heavyGap
  const parts: Shape3D[] = [
    makeBox(
      [centerX - halfTile, centerY - halfTile, zOffset],
      [centerX + halfTile, centerY - halfTile + railWidth, zOffset + height],
    ),
    makeBox(
      [centerX - halfTile, centerY + halfTile - railWidth, zOffset],
      [centerX + halfTile, centerY + halfTile, zOffset + height],
    ),
    makeBox(
      [centerX - halfTile, centerY - halfTile, zOffset],
      [centerX - halfTile + railWidth, centerY + halfTile, zOffset + height],
    ),
    makeBox(
      [centerX + halfTile - railWidth, centerY - halfTile, zOffset],
      [centerX + halfTile, centerY + halfTile, zOffset + height],
    ),
  ]

  const { cornerOffset, cornerChamfer } = openGridProfileConstants(
    tileSize,
    OPENGRID_CONFIGURATION.variants.Full.thickness,
  )
  const cornerWidth = cornerOffset - cornerChamfer
  const corner = makeBox(
    [0, -cornerOffset, zOffset],
    [cornerWidth, cornerOffset, zOffset + height],
  )
  const rotatedCorner = corner.rotate(45, [0, 0, 0], [0, 0, 1])
  if (rotatedCorner !== corner) deleteShape(corner)
  const localCorner = rotatedCorner.translate(-halfTile, -halfTile, 0)
  if (localCorner !== rotatedCorner) deleteShape(rotatedCorner)
  const tileClip = makeBox(
    [centerX - halfTile, centerY - halfTile, zOffset - 0.01],
    [centerX + halfTile, centerY + halfTile, zOffset + height + 0.01],
  )
  const intersectionScope = reporter?.createScope(4)
  try {
    for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
      const rotated = cloneRotated(localCorner, quarterTurns)
      const translated = rotated.translate(centerX, centerY, 0)
      if (translated !== rotated) deleteShape(rotated)
      const clipped = measureBooleanInScope(
        intersectionScope,
        'intersect',
        () => translated.intersect(tileClip),
      )
      if (clipped !== translated) deleteShape(translated)
      parts.push(clipped)
    }
  } finally {
    deleteShape(localCorner)
    deleteShape(tileClip)
  }

  return parts
}

function buildHalfFlatBridgeTile(
  centerX: number,
  centerY: number,
  zOffset: number,
  width: number,
  depth: number,
  interfaceX: HalfCellX | null,
  interfaceY: HalfCellY | null,
): Shape3D[] {
  const railWidth = OPENGRID_CONFIGURATION.outsideExtrusion
  const height = OPENGRID_CONFIGURATION.heavyGap
  const parts: Shape3D[] = [
    makeBox(
      [centerX - width / 2, centerY - depth / 2, zOffset],
      [centerX + width / 2, centerY - depth / 2 + railWidth, zOffset + height],
    ),
    makeBox(
      [centerX - width / 2, centerY + depth / 2 - railWidth, zOffset],
      [centerX + width / 2, centerY + depth / 2, zOffset + height],
    ),
    makeBox(
      [centerX - width / 2, centerY - depth / 2, zOffset],
      [centerX - width / 2 + railWidth, centerY + depth / 2, zOffset + height],
    ),
    makeBox(
      [centerX + width / 2 - railWidth, centerY - depth / 2, zOffset],
      [centerX + width / 2, centerY + depth / 2, zOffset + height],
    ),
  ]
  const seamOverlap = 0.2
  if (interfaceX === 'left') {
    parts.push(
      makeBox(
        [centerX + width / 2 - seamOverlap, centerY - depth / 2, zOffset],
        [
          centerX + width / 2 + seamOverlap,
          centerY + depth / 2,
          zOffset + height,
        ],
      ),
    )
  }
  if (interfaceX === 'right') {
    parts.push(
      makeBox(
        [centerX - width / 2 - seamOverlap, centerY - depth / 2, zOffset],
        [
          centerX - width / 2 + seamOverlap,
          centerY + depth / 2,
          zOffset + height,
        ],
      ),
    )
  }
  if (interfaceY === 'bottom') {
    parts.push(
      makeBox(
        [centerX - width / 2, centerY + depth / 2 - seamOverlap, zOffset],
        [
          centerX + width / 2,
          centerY + depth / 2 + seamOverlap,
          zOffset + height,
        ],
      ),
    )
  }
  if (interfaceY === 'top') {
    parts.push(
      makeBox(
        [centerX - width / 2, centerY - depth / 2 - seamOverlap, zOffset],
        [
          centerX + width / 2,
          centerY - depth / 2 + seamOverlap,
          zOffset + height,
        ],
      ),
    )
  }
  return parts
}

async function buildHeavyBridge(
  parameters: OpenGridParameters,
  zOffset: number,
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const rows: Shape3D[][] = []
  try {
    for (let row = 0; row < parameters.rows; row += 1) {
      const rowParts: Shape3D[] = []
      rows.push(rowParts)
      for (let column = 0; column < parameters.columns; column += 1) {
        const [centerX, centerY] = cellCenterForOpenGrid(
          parameters,
          row,
          column,
        )
        rowParts.push(
          ...buildFlatBridgeTile(
            centerX,
            centerY,
            zOffset,
            context.booleanOperations,
          ),
        )
        await yieldAtSafeBoundary(context)
      }
    }
    if (context.fuseHalfCellExtensionsIntoAssembly !== false) {
      const extensionPieces = await buildHalfCellExtensionPieces(
        parameters,
        (spec) =>
          fuseBalanced(
            buildHalfFlatBridgeTile(
              0,
              0,
              0,
              spec.width,
              spec.depth,
              spec.interfaceX,
              spec.interfaceY,
            ),
            context,
          ),
        'heavy-bridge',
        OPENGRID_CONFIGURATION.heavyGap,
        zOffset,
        false,
        context,
      )
      if (extensionPieces.length > 0) rows.push(extensionPieces)
    }
    const result = await fuseByStrategy(rows, strategy, context)
    if (context.fuseHalfCellExtensionsIntoAssembly !== false) return result
    return addHalfCellExtensions(
      result,
      parameters,
      async (spec) =>
        fuseBalanced(
          buildHalfFlatBridgeTile(
            0,
            0,
            0,
            spec.width,
            spec.depth,
            spec.interfaceX,
            spec.interfaceY,
          ),
          context,
        ),
      OPENGRID_CONFIGURATION.heavyGap,
      zOffset,
      false,
      context,
    )
  } catch (error) {
    for (const row of rows) {
      for (const part of row) deleteShape(part)
    }
    throw error
  }
}

export { buildFlatBridgeTile, buildHalfFlatBridgeTile, buildHeavyBridge }
