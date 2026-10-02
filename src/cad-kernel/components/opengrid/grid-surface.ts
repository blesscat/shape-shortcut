import type { Shape3D } from 'replicad'
import type { OpenGridParameters } from '../../../cad-contract/units'
import {
  cellCenterForOpenGrid,
  openGridConnectorLocationsFor,
  openGridScrewCentersFor,
  OPENGRID_CONFIGURATION,
} from './profile'
import { deleteShape } from '../../lifetime/dispose'
import { fuseByStrategy, fuseSequential } from './assembly'
import {
  addOfficialHalfCellExtensions,
  buildCanonicalTile,
  buildOfficialHalfCellExtensionPieces,
  mirrorSurfaceWithinLayer,
} from './tiles'
import {
  assertGenerationCurrent,
  reportProgress,
  yieldAtSafeBoundary,
  type OpenGridAssemblyStrategy,
  type OpenGridBuildContext,
} from './builder'
async function buildGridSurface(
  parameters: OpenGridParameters,
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (
    strategy === 'row-block' &&
    (openGridScrewCentersFor(parameters).length > 0 ||
      openGridConnectorLocationsFor(parameters).length > 0)
  ) {
    const result = await buildGridSurfaceByRows(
      parameters,
      variant,
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
    return addOfficialHalfCellExtensions(
      result,
      parameters,
      variant,
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
  }
  const canonicalByPattern = new Map<string, Shape3D>()
  const ownedCanonical = new Set<Shape3D>()
  const rows: Shape3D[][] = []
  const totalCells = parameters.rows * parameters.columns
  let completed = 0
  try {
    reportProgress(context, 0, totalCells)
    for (let row = 0; row < parameters.rows; row += 1) {
      const rowPieces: Shape3D[] = []
      rows.push(rowPieces)
      for (let column = 0; column < parameters.columns; column += 1) {
        assertGenerationCurrent(context)
        const [centerX, centerY] = cellCenterForOpenGrid(
          parameters,
          row,
          column,
        )
        const patternKey = 'default'
        let canonical = canonicalByPattern.get(patternKey)
        if (!canonical) {
          canonical = context.getOpenGridCanonicalTile
            ? await context.getOpenGridCanonicalTile(
                variant,
                thickness,
                context.booleanOperations,
              )
            : await buildCanonicalTile(variant, thickness, context)
          canonicalByPattern.set(patternKey, canonical)
          if (!context.getOpenGridCanonicalTile) ownedCanonical.add(canonical)
        }
        let piece = canonical.clone()
        if (mirrorWithinLayer) {
          const mirrored = mirrorSurfaceWithinLayer(piece, thickness)
          if (mirrored !== piece) deleteShape(piece)
          piece = mirrored
        }
        const translated = piece.translate(centerX, centerY, zOffset)
        if (translated !== piece) deleteShape(piece)
        rowPieces.push(translated)
        completed += 1
        reportProgress(context, completed, totalCells)
        await yieldAtSafeBoundary(context)
      }
    }
    if (context.fuseHalfCellExtensionsIntoAssembly !== false) {
      const extensionPieces = await buildOfficialHalfCellExtensionPieces(
        parameters,
        variant,
        thickness,
        zOffset,
        mirrorWithinLayer,
        context,
      )
      if (extensionPieces.length > 0) rows.push(extensionPieces)
    }
    const result = await fuseByStrategy(rows, strategy, context)
    for (const canonical of ownedCanonical) deleteShape(canonical)
    if (context.fuseHalfCellExtensionsIntoAssembly !== false) return result
    return addOfficialHalfCellExtensions(
      result,
      parameters,
      variant,
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
  } catch (error) {
    for (const row of rows) {
      for (const piece of row) deleteShape(piece)
    }
    for (const canonical of ownedCanonical) deleteShape(canonical)
    throw error
  }
}

async function buildGridSurfaceByRows(
  parameters: OpenGridParameters,
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const canonicalByPattern = new Map<string, Shape3D>()
  const rowShapes: Shape3D[] = []
  const totalCells = parameters.rows * parameters.columns
  let completed = 0

  try {
    reportProgress(context, 0, totalCells)
    for (let row = 0; row < parameters.rows; row += 1) {
      const rowPieces: Shape3D[] = []
      try {
        for (let column = 0; column < parameters.columns; column += 1) {
          assertGenerationCurrent(context)
          const [centerX, centerY] = cellCenterForOpenGrid(
            parameters,
            row,
            column,
          )
          const patternKey = 'default'
          let canonical = canonicalByPattern.get(patternKey)
          if (!canonical) {
            canonical = await buildCanonicalTile(variant, thickness, context)
            canonicalByPattern.set(patternKey, canonical)
          }
          let piece = canonical.clone()
          const translated = piece.translate(centerX, centerY, zOffset)
          if (translated !== piece) deleteShape(piece)
          rowPieces.push(translated)
          completed += 1
          reportProgress(context, completed, totalCells)
          await yieldAtSafeBoundary(context)
        }

        let rowShape = await fuseSequential(rowPieces, context)
        if (mirrorWithinLayer) {
          const mirrored = mirrorSurfaceWithinLayer(rowShape, thickness)
          if (mirrored !== rowShape) deleteShape(rowShape)
          rowShape = mirrored
        }
        rowShapes.push(rowShape)
      } catch (error) {
        for (const piece of rowPieces) deleteShape(piece)
        throw error
      }
    }
    const result = await fuseSequential(rowShapes, context)
    for (const canonical of canonicalByPattern.values()) deleteShape(canonical)
    return result
  } catch (error) {
    for (const rowShape of rowShapes) deleteShape(rowShape)
    for (const canonical of canonicalByPattern.values()) deleteShape(canonical)
    throw error
  }
}

export { buildGridSurface }
