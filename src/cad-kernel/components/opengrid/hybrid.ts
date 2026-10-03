import type { Shape3D } from 'replicad'
import type { OpenGridParameters } from '../../../cad-contract/units'
import { cellCenterForOpenGrid, OPENGRID_CONFIGURATION } from './profile'
import { deleteShape } from '../../lifetime/dispose'
import {
  addSpatialAssemblyPiece,
  fuseBalanced,
  fuseByStrategy,
  fuseSpatialAssemblyRegionGroups,
  type SpatialAssemblyPiece,
} from './assembly'
import { buildFlatBridgeTile, buildHalfFlatBridgeTile } from './bridges'
import {
  buildHybridTransitionWedges,
  hybridAssemblyRegionForCell,
  hybridPerimeterCellCount,
  hybridSurfaceProfileForCell,
  isHybridPerimeterCell,
  type HybridSurfaceProfile,
} from './hybrid-transition'
import {
  addHalfCellExtensions,
  addOfficialHalfCellExtensions,
  buildCanonicalTile,
  buildHalfCellExtensionPieces,
  buildOfficialHalfCellExtensionPieces,
  halfExtensionTileSpecs,
  mirrorSurfaceWithinLayer,
} from './tiles'
import {
  applyBatchedCuts,
  applyHeavyBridgeFeatures,
  assertGenerationCurrent,
  reportProgress,
  yieldAtSafeBoundary,
  type OpenGridAssemblyStrategy,
  type OpenGridBuildContext,
} from './builder'
async function buildHybridSurface(
  parameters: OpenGridParameters,
  zOffset: number,
  mirrorWithinLayer: boolean,
  includeInterior: boolean,
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const canonicalByProfile = new Map<HybridSurfaceProfile, Shape3D>()
  const ownedCanonical = new Set<Shape3D>()
  const rows: Shape3D[][] = []
  const regionGroups = new Map<string, SpatialAssemblyPiece[]>()
  const totalCells = includeInterior
    ? parameters.rows * parameters.columns
    : hybridPerimeterCellCount(parameters)
  let completed = 0

  try {
    reportProgress(context, 0, totalCells)
    for (let row = 0; row < parameters.rows; row += 1) {
      const rowPieces: Shape3D[] = []
      for (let column = 0; column < parameters.columns; column += 1) {
        const isPerimeter = isHybridPerimeterCell(parameters, row, column)
        if (!includeInterior && !isPerimeter) continue

        assertGenerationCurrent(context)
        const profile = hybridSurfaceProfileForCell(parameters, row, column)
        const [centerX, centerY] = cellCenterForOpenGrid(
          parameters,
          row,
          column,
        )
        let canonical = canonicalByProfile.get(profile)
        if (!canonical) {
          canonical = context.getOpenGridCanonicalTile
            ? await context.getOpenGridCanonicalTile(
                profile,
                OPENGRID_CONFIGURATION.variants.Full.thickness,
              )
            : await buildCanonicalTile(
                profile,
                OPENGRID_CONFIGURATION.variants.Full.thickness,
                context,
              )
          canonicalByProfile.set(profile, canonical)
          if (!context.getOpenGridCanonicalTile) ownedCanonical.add(canonical)
        }

        let piece = canonical.clone()
        if (mirrorWithinLayer) {
          const mirrored = mirrorSurfaceWithinLayer(
            piece,
            OPENGRID_CONFIGURATION.variants.Full.thickness,
          )
          if (mirrored !== piece) deleteShape(piece)
          piece = mirrored
        }
        const translated = piece.translate(centerX, centerY, zOffset)
        if (translated !== piece) deleteShape(piece)
        if (includeInterior) {
          rowPieces.push(translated)
        } else {
          addSpatialAssemblyPiece(
            regionGroups,
            hybridAssemblyRegionForCell(parameters, row, column),
            { shape: translated, center: [centerX, centerY] },
          )
        }
        completed += 1
        reportProgress(context, completed, totalCells)
        await yieldAtSafeBoundary(context)
      }
      if (rowPieces.length > 0) rows.push(rowPieces)
    }

    if (context.fuseHalfCellExtensionsIntoAssembly !== false) {
      const extensionPieces = await buildOfficialHalfCellExtensionPieces(
        parameters,
        'Heavy',
        OPENGRID_CONFIGURATION.variants.Full.thickness,
        zOffset,
        mirrorWithinLayer,
        context,
      )
      const extensionCenters = halfExtensionTileSpecs(parameters).map(
        (spec) => spec.center,
      )
      if (extensionPieces.length !== extensionCenters.length) {
        throw new Error('OPENGRID_HALF_EXTENSION_REGION_MISMATCH')
      }
      extensionPieces.forEach((shape, index) => {
        const center = extensionCenters[index]
        if (!center) throw new Error('OPENGRID_HALF_EXTENSION_CENTER_MISSING')
        if (includeInterior) rows.push([shape])
        else
          addSpatialAssemblyPiece(regionGroups, 'half-cell', { shape, center })
      })
    }

    const result = includeInterior
      ? await fuseByStrategy(rows, strategy, context)
      : await fuseSpatialAssemblyRegionGroups(regionGroups.values(), context)
    for (const canonical of ownedCanonical) deleteShape(canonical)
    if (context.fuseHalfCellExtensionsIntoAssembly !== false) return result
    return addOfficialHalfCellExtensions(
      result,
      parameters,
      'Heavy',
      OPENGRID_CONFIGURATION.variants.Full.thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
  } catch (error) {
    for (const row of rows) {
      for (const piece of row) deleteShape(piece)
    }
    for (const pieces of regionGroups.values()) {
      for (const piece of pieces) deleteShape(piece.shape)
    }
    for (const canonical of ownedCanonical) deleteShape(canonical)
    throw error
  }
}

async function buildHybridBridge(
  parameters: OpenGridParameters,
  zOffset: number,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const regionGroups = new Map<string, SpatialAssemblyPiece[]>()
  try {
    for (let row = 0; row < parameters.rows; row += 1) {
      for (let column = 0; column < parameters.columns; column += 1) {
        if (!isHybridPerimeterCell(parameters, row, column)) continue
        const [centerX, centerY] = cellCenterForOpenGrid(
          parameters,
          row,
          column,
        )
        for (const shape of buildFlatBridgeTile(
          centerX,
          centerY,
          zOffset,
          context.booleanOperations,
        )) {
          addSpatialAssemblyPiece(
            regionGroups,
            hybridAssemblyRegionForCell(parameters, row, column),
            { shape, center: [centerX, centerY] },
          )
        }
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
      const extensionCenters = halfExtensionTileSpecs(parameters).map(
        (spec) => spec.center,
      )
      if (extensionPieces.length !== extensionCenters.length) {
        throw new Error('OPENGRID_HALF_EXTENSION_REGION_MISMATCH')
      }
      extensionPieces.forEach((shape, index) => {
        const center = extensionCenters[index]
        if (!center) throw new Error('OPENGRID_HALF_EXTENSION_CENTER_MISSING')
        addSpatialAssemblyPiece(regionGroups, 'half-cell', { shape, center })
      })
    }

    const result = await fuseSpatialAssemblyRegionGroups(
      regionGroups.values(),
      context,
    )
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
    for (const pieces of regionGroups.values()) {
      for (const piece of pieces) deleteShape(piece.shape)
    }
    throw error
  }
}

async function buildHybridProductBase(
  parameters: OpenGridParameters,
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const layerThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  let lower: Shape3D | null = null
  let upper: Shape3D | null = null
  let bridge: Shape3D | null = null
  let cutBridge: Shape3D | null = null
  let transition: Shape3D | null = null

  try {
    lower = await buildHybridSurface(
      parameters,
      0,
      true,
      true,
      strategy,
      context,
    )
    upper = await buildHybridSurface(
      parameters,
      layerThickness + OPENGRID_CONFIGURATION.heavyGap,
      false,
      false,
      strategy,
      context,
    )
    bridge = await buildHybridBridge(parameters, layerThickness, context)
    cutBridge = await applyHeavyBridgeFeatures(
      bridge,
      parameters,
      layerThickness,
      context,
    )
    bridge = null
    lower = await applyBatchedCuts(lower, parameters, context)
    upper = await applyBatchedCuts(upper, parameters, context)
    transition = await buildHybridTransitionWedges(parameters, context)
    if (!lower || !cutBridge || !upper) {
      throw new Error('OPENGRID_HYBRID_ASSEMBLY_EMPTY')
    }
    const parts = [lower, cutBridge, upper]
    if (transition) parts.push(transition)
    const result = await fuseBalanced(parts, context)
    lower = null
    cutBridge = null
    upper = null
    transition = null
    return result
  } catch (error) {
    deleteShape(lower)
    deleteShape(cutBridge ?? bridge)
    deleteShape(upper)
    deleteShape(transition)
    throw error
  }
}

export { buildHybridProductBase }
