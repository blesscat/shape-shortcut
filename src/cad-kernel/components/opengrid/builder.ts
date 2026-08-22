import {
  importSTEP,
  makeBox,
  makeCylinder,
  makeCompound,
  makePolygon,
  makeSolid,
  Sketcher,
  type Shape3D,
} from 'replicad'
import type {
  HalfCellX,
  HalfCellY,
  OpenGridConnectorLocation,
  OpenGridParameters,
  OpenGridPoint2D,
  OpenGridScrewPosition,
  OpenGridVariant,
} from '../../../cad-contract/units'
import {
  HALF_CELL_CONFIGURATION,
  fullGridCenterOffsetX,
  fullGridCenterOffsetY,
  isOpenGridLayeredVariant,
} from '../../../cad-contract/units'
import {
  OPENGRID_CONFIGURATION,
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  openGridBoardConfiguration,
  openGridConnectorLocationsFor,
  openGridNominalBoardConfiguration,
  openGridScrewCentersFor,
  openGridScrewPositionsFor,
} from './profile'
import {
  openGridCornerProfile,
  openGridLiteCornerProfile,
  openGridLiteTileProfile,
  openGridTileProfile,
  openGridProfileConstants,
  type OpenGridProfilePoint,
} from './profile'
import {
  measureBoolean,
  measureBooleanInScope,
  type BooleanOperationScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'

export type OpenGridBuildContext = {
  getOpenGridPrototype?: (variant: OpenGridVariant) => Promise<Shape3D>
  getOpenGridCanonicalTile?: (
    variant: OpenGridVariant,
    thickness: number,
    booleanOperations?: BooleanOperationReporter,
  ) => Promise<Shape3D>
  getOpenGridHalfCellPrototype?: (
    key: string,
    factory: () => Promise<Shape3D> | Shape3D,
  ) => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  useCompoundChamferCutters?: boolean
  useCompoundScrewParts?: boolean
  fuseHalfCellExtensionsIntoAssembly?: boolean
  balancedFuseBatchSize?: number
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'cells' | 'batches'
  }) => void
  reportPhase?: (
    phase: 'assembly-fuse' | 'prototype-build',
    durationMs: number,
  ) => void
  booleanOperations?: BooleanOperationReporter
}

export type OpenGridAssemblyStrategy =
  'whole-profile' | 'row-block' | 'cell-balanced' | 'prototype-template'

export type OpenGridProductStrategy = 'cell-balanced'

export const OPENGRID_PRODUCT_STRATEGIES: Readonly<
  Record<OpenGridParameters['variant'], OpenGridProductStrategy>
> = {
  Full: 'cell-balanced',
  Lite: 'cell-balanced',
  Heavy: 'cell-balanced',
  Hybrid: 'cell-balanced',
}

export const OPENGRID_PROTOTYPE_TEMPLATE_URLS: Readonly<
  Record<OpenGridVariant, URL>
> = {
  Full: new URL('./opengrid-full-cell.step', import.meta.url),
  Lite: new URL('./opengrid-lite-cell.step', import.meta.url),
  Heavy: new URL('./opengrid-heavy-cell.step', import.meta.url),
  Hybrid: new URL('./opengrid-heavy-cell.step', import.meta.url),
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function assertGenerationCurrent(context: OpenGridBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: OpenGridBuildContext,
): Promise<void> {
  assertGenerationCurrent(context)
  await context.yieldToEventLoop?.()
  assertGenerationCurrent(context)
}

function reportProgress(
  context: OpenGridBuildContext,
  completed: number,
  total: number,
): void {
  context.reportProgress?.({
    stage: 'building',
    completed,
    total,
    unit: 'cells',
  })
}

function extrudeProfile(
  plane: 'YZ' | 'XZ',
  origin: [number, number, number],
  profile: readonly [number, number][],
  distance: number,
  direction: [number, number, number],
): Shape3D {
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = profile[0]
    if (!first) throw new Error('OPENGRID_PROFILE_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of profile.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(distance, { extrusionDirection: direction })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function buildRail(
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
): Shape3D {
  const tileSize = OPENGRID_CONFIGURATION.gridPitch
  const halfTile = tileSize / 2
  const profile =
    variant === 'Lite'
      ? openGridLiteTileProfile()
      : openGridTileProfile(variant, thickness)
  return extrudeProfile(
    'YZ',
    [-halfTile, -halfTile, 0],
    profile,
    tileSize,
    [1, 0, 0],
  )
}

function buildCornerNode(
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
): Shape3D {
  const constants = openGridProfileConstants(
    OPENGRID_CONFIGURATION.gridPitch,
    thickness,
  )
  const profile =
    variant === 'Lite'
      ? openGridLiteCornerProfile()
      : openGridCornerProfile(thickness)
  const shape = extrudeProfile(
    'XZ',
    [0, -constants.cornerOffset, 0],
    profile,
    constants.cornerOffset * 2,
    [0, 1, 0],
  )
  const rotated = shape.rotate(45, [0, 0, 0], [0, 0, 1])
  if (rotated !== shape) deleteShape(shape)
  const translated = rotated.translate(
    -OPENGRID_CONFIGURATION.gridPitch / 2,
    -OPENGRID_CONFIGURATION.gridPitch / 2,
    0,
  )
  if (translated !== rotated) deleteShape(rotated)
  return translated
}

function cloneRotated(
  shape: Shape3D,
  quarterTurns: number,
  center: [number, number, number] = [0, 0, 0],
): Shape3D {
  const clone = shape.clone()
  if (quarterTurns !== 0) {
    const rotated = clone.rotate(quarterTurns * 90, center, [0, 0, 1])
    if (rotated !== clone) deleteShape(clone)
    return rotated
  }
  return clone
}

async function fuseBalanced(
  input: Shape3D[],
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (input.length === 0) throw new Error('OPENGRID_SHAPE_EMPTY')
  const owned = new Set(input)
  let current = input
  const batchSize =
    context.balancedFuseBatchSize ??
    OPENGRID_CONFIGURATION.balancedFuseBatchSize
  if (!Number.isSafeInteger(batchSize) || batchSize < 2) {
    throw new Error('OPENGRID_FUSE_BATCH_SIZE_INVALID')
  }
  const fuseScope = context.booleanOperations?.createScope(input.length - 1)
  try {
    while (current.length > 1) {
      assertGenerationCurrent(context)
      const next: Shape3D[] = []
      for (let index = 0; index < current.length; index += batchSize) {
        const batch = current.slice(index, index + batchSize)
        let combined = batch[0]
        if (!combined) throw new Error('OPENGRID_SHAPE_EMPTY')
        for (const shape of batch.slice(1)) {
          assertGenerationCurrent(context)
          const startedAt = performance.now()
          const fused = measureBooleanInScope(fuseScope, 'fuse', () =>
            combined.fuse(shape),
          )
          context.reportPhase?.('assembly-fuse', performance.now() - startedAt)
          if (fused !== combined) {
            owned.delete(combined)
            deleteShape(combined)
          }
          if (fused !== shape) {
            owned.delete(shape)
            deleteShape(shape)
          }
          owned.add(fused)
          combined = fused
          await yieldAtSafeBoundary(context)
        }
        next.push(combined)
      }
      current = next
    }
    const result = current[0]
    if (!result) throw new Error('OPENGRID_SHAPE_EMPTY')
    owned.delete(result)
    return result
  } catch (error) {
    for (const shape of owned) deleteShape(shape)
    throw error
  }
}

async function fuseSequential(
  input: Shape3D[],
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (input.length === 0) throw new Error('OPENGRID_SHAPE_EMPTY')
  const owned = new Set(input)
  let combined = input[0]
  if (!combined) throw new Error('OPENGRID_SHAPE_EMPTY')
  const fuseScope = context.booleanOperations?.createScope(input.length - 1)
  try {
    for (const shape of input.slice(1)) {
      assertGenerationCurrent(context)
      const startedAt = performance.now()
      const fused = measureBooleanInScope(fuseScope, 'fuse', () =>
        combined.fuse(shape),
      )
      context.reportPhase?.('assembly-fuse', performance.now() - startedAt)
      if (fused !== combined) {
        owned.delete(combined)
        deleteShape(combined)
      }
      if (fused !== shape) {
        owned.delete(shape)
        deleteShape(shape)
      }
      owned.add(fused)
      combined = fused
      await yieldAtSafeBoundary(context)
    }
    owned.delete(combined)
    return combined
  } catch (error) {
    for (const shape of owned) deleteShape(shape)
    throw error
  }
}

async function fuseByStrategy(
  rows: Shape3D[][],
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (strategy === 'cell-balanced') {
    return fuseBalanced(rows.flat(), context)
  }
  if (strategy === 'whole-profile') {
    return fuseSequential(rows.flat(), context)
  }
  if (strategy === 'prototype-template') {
    return fuseBalanced(rows.flat(), context)
  }

  const rowShapes: Shape3D[] = []
  try {
    for (const row of rows) {
      rowShapes.push(await fuseSequential(row, context))
    }
    return await fuseSequential(rowShapes, context)
  } catch (error) {
    for (const row of rowShapes) deleteShape(row)
    for (const row of rows) {
      for (const piece of row) deleteShape(piece)
    }
    throw error
  }
}

type SpatialAssemblyPiece = {
  shape: Shape3D
  center: OpenGridPoint2D
}

type SpatialAssemblyBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type SpatialAssemblyRegion = SpatialAssemblyBounds & {
  shape: Shape3D
}

type SpatialAssemblyAxis = 'x' | 'y'

function spatialAssemblyPieceKey(center: OpenGridPoint2D): string {
  return `${center[0]}:${center[1]}`
}

function spatialAssemblyRegionFromPiece(
  piece: SpatialAssemblyPiece,
): SpatialAssemblyRegion {
  return {
    shape: piece.shape,
    minX: piece.center[0],
    maxX: piece.center[0],
    minY: piece.center[1],
    maxY: piece.center[1],
  }
}

function spatialAssemblyRegionFromPieces(
  pieces: readonly SpatialAssemblyPiece[],
  shape: Shape3D,
): SpatialAssemblyRegion {
  return {
    ...spatialAssemblyBoundsFromPieces(pieces),
    shape,
  }
}

function spatialAssemblyBoundsFromPieces(
  pieces: readonly SpatialAssemblyPiece[],
): SpatialAssemblyBounds {
  const first = pieces[0]
  if (!first) throw new Error('OPENGRID_SHAPE_EMPTY')

  let minX = first.center[0]
  let maxX = first.center[0]
  let minY = first.center[1]
  let maxY = first.center[1]
  for (const piece of pieces.slice(1)) {
    minX = Math.min(minX, piece.center[0])
    maxX = Math.max(maxX, piece.center[0])
    minY = Math.min(minY, piece.center[1])
    maxY = Math.max(maxY, piece.center[1])
  }
  return { minX, maxX, minY, maxY }
}

function spatialAssemblyRegionCenter(
  region: SpatialAssemblyBounds,
  axis: SpatialAssemblyAxis,
): number {
  if (axis === 'x') return (region.minX + region.maxX) / 2
  return (region.minY + region.maxY) / 2
}

function spatialAssemblyRegionSpan(
  regions: readonly SpatialAssemblyBounds[],
  axis: SpatialAssemblyAxis,
): number {
  if (regions.length === 0) return 0
  if (axis === 'x') {
    return (
      Math.max(...regions.map((region) => region.maxX)) -
      Math.min(...regions.map((region) => region.minX))
    )
  }
  return (
    Math.max(...regions.map((region) => region.maxY)) -
    Math.min(...regions.map((region) => region.minY))
  )
}

function splitSpatialAssemblyRegions<T extends SpatialAssemblyBounds>(
  regions: readonly T[],
): [T[], T[]] {
  const xSpan = spatialAssemblyRegionSpan(regions, 'x')
  const ySpan = spatialAssemblyRegionSpan(regions, 'y')
  const primaryAxis: SpatialAssemblyAxis = xSpan >= ySpan ? 'x' : 'y'
  const secondaryAxis: SpatialAssemblyAxis = primaryAxis === 'x' ? 'y' : 'x'
  const sorted = [...regions].sort((first, second) => {
    const primaryDifference =
      spatialAssemblyRegionCenter(first, primaryAxis) -
      spatialAssemblyRegionCenter(second, primaryAxis)
    if (primaryDifference !== 0) return primaryDifference
    return (
      spatialAssemblyRegionCenter(first, secondaryAxis) -
      spatialAssemblyRegionCenter(second, secondaryAxis)
    )
  })
  const midpoint = Math.ceil(sorted.length / 2)
  return [sorted.slice(0, midpoint), sorted.slice(midpoint)]
}

function mergeSpatialAssemblyRegions(
  left: SpatialAssemblyRegion,
  right: SpatialAssemblyRegion,
  shape: Shape3D,
): SpatialAssemblyRegion {
  return {
    shape,
    minX: Math.min(left.minX, right.minX),
    maxX: Math.max(left.maxX, right.maxX),
    minY: Math.min(left.minY, right.minY),
    maxY: Math.max(left.maxY, right.maxY),
  }
}

async function fuseSpatialAssemblyRegions(
  regions: readonly SpatialAssemblyRegion[],
  context: OpenGridBuildContext,
  sharedFuseScope?: BooleanOperationScope,
): Promise<Shape3D> {
  if (regions.length === 0) throw new Error('OPENGRID_SHAPE_EMPTY')

  const batchSize =
    context.balancedFuseBatchSize ??
    OPENGRID_CONFIGURATION.balancedFuseBatchSize
  if (!Number.isSafeInteger(batchSize) || batchSize < 2) {
    throw new Error('OPENGRID_FUSE_BATCH_SIZE_INVALID')
  }

  const owned = new Set(regions.map((region) => region.shape))
  const fuseScope =
    sharedFuseScope ??
    (regions.length > 1
      ? context.booleanOperations?.createScope(regions.length - 1)
      : undefined)

  const fusePair = async (
    left: SpatialAssemblyRegion,
    right: SpatialAssemblyRegion,
  ): Promise<SpatialAssemblyRegion> => {
    assertGenerationCurrent(context)
    const startedAt = performance.now()
    const fused = measureBooleanInScope(fuseScope, 'fuse', () =>
      left.shape.fuse(right.shape),
    )
    context.reportPhase?.('assembly-fuse', performance.now() - startedAt)
    if (fused !== left.shape) {
      owned.delete(left.shape)
      deleteShape(left.shape)
    }
    if (fused !== right.shape) {
      owned.delete(right.shape)
      deleteShape(right.shape)
    }
    owned.add(fused)
    await yieldAtSafeBoundary(context)
    return mergeSpatialAssemblyRegions(left, right, fused)
  }

  const retainRegion = (
    region: SpatialAssemblyRegion,
  ): SpatialAssemblyRegion => {
    // Recursive branches can outlive their caller while the other branch is
    // still fusing. Keep every returned intermediate in the shared cleanup
    // set until the final result is handed to the caller.
    owned.add(region.shape)
    return region
  }

  const fuseRegionList = async (
    regions: readonly SpatialAssemblyRegion[],
  ): Promise<SpatialAssemblyRegion> => {
    const first = regions[0]
    if (!first) throw new Error('OPENGRID_SHAPE_EMPTY')
    let combined = first
    for (const region of regions.slice(1)) {
      combined = retainRegion(await fusePair(combined, region))
    }
    return retainRegion(combined)
  }

  const fuseRegionTree = async (
    regions: readonly SpatialAssemblyRegion[],
  ): Promise<SpatialAssemblyRegion> => {
    const first = regions[0]
    if (!first) throw new Error('OPENGRID_SHAPE_EMPTY')
    if (regions.length === 1) return retainRegion(first)
    if (regions.length <= batchSize) {
      return retainRegion(await fuseRegionList(regions))
    }

    const [leftRegions, rightRegions] = splitSpatialAssemblyRegions(regions)
    const left = retainRegion(await fuseRegionTree(leftRegions))
    const right = retainRegion(await fuseRegionTree(rightRegions))
    return retainRegion(await fusePair(left, right))
  }

  try {
    const result = await fuseRegionTree(regions)
    owned.delete(result.shape)
    return result.shape
  } catch (error) {
    for (const shape of owned) deleteShape(shape)
    throw error
  }
}

async function fuseSpatialAssemblyPieces(
  pieces: readonly SpatialAssemblyPiece[],
  context: OpenGridBuildContext,
  sharedFuseScope?: BooleanOperationScope,
): Promise<Shape3D> {
  if (pieces.length === 0) throw new Error('OPENGRID_SHAPE_EMPTY')

  const cellRegions: SpatialAssemblyRegion[] = []
  try {
    const piecesByCenter = new Map<string, SpatialAssemblyPiece[]>()
    for (const piece of pieces) {
      const key = spatialAssemblyPieceKey(piece.center)
      const group = piecesByCenter.get(key)
      if (group) group.push(piece)
      else piecesByCenter.set(key, [piece])
    }

    for (const group of piecesByCenter.values()) {
      const shape = await fuseSpatialAssemblyRegions(
        group.map(spatialAssemblyRegionFromPiece),
        context,
        sharedFuseScope,
      )
      cellRegions.push(spatialAssemblyRegionFromPieces(group, shape))
    }

    return await fuseSpatialAssemblyRegions(
      cellRegions,
      context,
      sharedFuseScope,
    )
  } catch (error) {
    for (const region of cellRegions) deleteShape(region.shape)
    throw error
  }
}

function addSpatialAssemblyPiece(
  groups: Map<string, SpatialAssemblyPiece[]>,
  key: string,
  piece: SpatialAssemblyPiece,
): void {
  const group = groups.get(key)
  if (group) group.push(piece)
  else groups.set(key, [piece])
}

async function fuseSpatialAssemblyRegionGroups(
  groups: Iterable<readonly SpatialAssemblyPiece[]>,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const pieceGroups = [...groups].filter((pieces) => pieces.length > 0)
  if (pieceGroups.length === 0) throw new Error('OPENGRID_SHAPE_EMPTY')
  const totalPieces = pieceGroups.reduce(
    (total, pieces) => total + pieces.length,
    0,
  )
  const sharedFuseScope =
    totalPieces > 1
      ? context.booleanOperations?.createScope(totalPieces - 1)
      : undefined
  const regions: SpatialAssemblyRegion[] = []
  try {
    for (const pieces of pieceGroups) {
      const shape = await fuseSpatialAssemblyPieces(
        pieces,
        context,
        sharedFuseScope,
      )
      regions.push(spatialAssemblyRegionFromPieces(pieces, shape))
    }
    return await fuseSpatialAssemblyRegions(regions, context, sharedFuseScope)
  } catch (error) {
    for (const region of regions) deleteShape(region.shape)
    throw error
  }
}

async function buildCanonicalTile(
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const rail = buildRail(variant, thickness)
  const parts: Shape3D[] = [rail]
  for (let quarterTurns = 1; quarterTurns < 4; quarterTurns += 1) {
    parts.push(cloneRotated(rail, quarterTurns))
  }
  const clip = makeBox(
    [
      -OPENGRID_CONFIGURATION.gridPitch / 2,
      -OPENGRID_CONFIGURATION.gridPitch / 2,
      -0.01,
    ],
    [
      OPENGRID_CONFIGURATION.gridPitch / 2,
      OPENGRID_CONFIGURATION.gridPitch / 2,
      thickness + 0.01,
    ],
  )
  try {
    const corner = buildCornerNode(variant, thickness)
    const intersectionScope = context.booleanOperations?.createScope(4)
    for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
      const rotated = cloneRotated(corner, quarterTurns)
      const clipped = measureBooleanInScope(
        intersectionScope,
        'intersect',
        () => rotated.intersect(clip),
      )
      if (clipped !== rotated) deleteShape(rotated)
      parts.push(clipped)
    }
    deleteShape(corner)
  } finally {
    deleteShape(clip)
  }
  const canonical = await fuseBalanced(parts, context)
  return canonical
}

export function buildOpenGridCanonicalTile(
  variant: OpenGridVariant,
  context: OpenGridBuildContext = {},
): Promise<Shape3D> {
  const surfaceVariant = variant === 'Hybrid' ? 'Heavy' : variant
  const thickness =
    surfaceVariant === 'Lite'
      ? OPENGRID_CONFIGURATION.variants.Lite.thickness
      : OPENGRID_CONFIGURATION.variants.Full.thickness
  return buildCanonicalTile(surfaceVariant, thickness, context)
}

type HalfExtensionTileSpec = {
  center: OpenGridPoint2D
  width: number
  depth: number
  interfaceX: HalfCellX | null
  interfaceY: HalfCellY | null
}

type HalfExtensionTileFactory = (
  spec: HalfExtensionTileSpec,
) => Promise<Shape3D>

function hasOpenGridHalfCell(parameters: OpenGridParameters): boolean {
  return parameters.halfCellX !== 'none' || parameters.halfCellY !== 'none'
}

function halfExtensionTileSpecs(
  parameters: OpenGridParameters,
): HalfExtensionTileSpec[] {
  const board = openGridNominalBoardConfiguration(parameters)
  const specs: HalfExtensionTileSpec[] = []
  const fullXCenters: number[] = []
  const fullYCenters: number[] = []

  for (let column = 0; column < parameters.columns; column += 1) {
    fullXCenters.push(cellCenterForOpenGrid(parameters, 0, column)[0])
  }
  for (let row = 0; row < parameters.rows; row += 1) {
    fullYCenters.push(cellCenterForOpenGrid(parameters, row, 0)[1])
  }

  if (parameters.halfCellX !== 'none') {
    const centerX =
      parameters.halfCellX === 'left'
        ? -board.width / 2 + HALF_CELL_CONFIGURATION.halfPitch / 2
        : board.width / 2 - HALF_CELL_CONFIGURATION.halfPitch / 2
    for (const centerY of fullYCenters) {
      specs.push({
        center: [centerX, centerY],
        width: HALF_CELL_CONFIGURATION.halfPitch,
        depth: HALF_CELL_CONFIGURATION.fullPitch,
        interfaceX: parameters.halfCellX,
        interfaceY: null,
      })
    }
  }

  if (parameters.halfCellY !== 'none') {
    const centerY =
      parameters.halfCellY === 'top'
        ? board.depth / 2 - HALF_CELL_CONFIGURATION.halfPitch / 2
        : -board.depth / 2 + HALF_CELL_CONFIGURATION.halfPitch / 2
    for (const centerX of fullXCenters) {
      specs.push({
        center: [centerX, centerY],
        width: HALF_CELL_CONFIGURATION.fullPitch,
        depth: HALF_CELL_CONFIGURATION.halfPitch,
        interfaceX: null,
        interfaceY: parameters.halfCellY,
      })
    }
  }

  if (parameters.halfCellX !== 'none' && parameters.halfCellY !== 'none') {
    const centerX =
      parameters.halfCellX === 'left'
        ? -board.width / 2 + HALF_CELL_CONFIGURATION.halfPitch / 2
        : board.width / 2 - HALF_CELL_CONFIGURATION.halfPitch / 2
    const centerY =
      parameters.halfCellY === 'top'
        ? board.depth / 2 - HALF_CELL_CONFIGURATION.halfPitch / 2
        : -board.depth / 2 + HALF_CELL_CONFIGURATION.halfPitch / 2
    specs.push({
      center: [centerX, centerY],
      width: HALF_CELL_CONFIGURATION.halfPitch,
      depth: HALF_CELL_CONFIGURATION.halfPitch,
      interfaceX: parameters.halfCellX,
      interfaceY: parameters.halfCellY,
    })
  }

  return specs
}

function translateShape(shape: Shape3D, x: number, y: number, z = 0): Shape3D {
  const translated = shape.translate(x, y, z)
  if (translated !== shape) deleteShape(shape)
  return translated
}

function clipShapeToBox(
  shape: Shape3D,
  clip: Shape3D,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  const clipped = measureBooleanInScope(scope, 'intersect', () =>
    shape.intersect(clip),
  )
  if (clipped !== shape) deleteShape(shape)
  return clipped
}

type HalfBoundaryTileSource = {
  rail: Shape3D
  corner: Shape3D
}

async function buildHalfBoundaryTile(
  source: HalfBoundaryTileSource,
  thickness: number,
  width: number,
  depth: number,
  interfaceX: HalfCellX | null,
  interfaceY: HalfCellY | null,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const halfTile = OPENGRID_CONFIGURATION.gridPitch / 2
  const parts: Shape3D[] = []
  let clip: Shape3D | null = null

  try {
    const railPlacements: Array<[number, number, number]> = [
      [0, -depth / 2 + halfTile, 0],
      [0, depth / 2 - halfTile, 2],
      [width / 2 - halfTile, 0, 1],
      [-width / 2 + halfTile, 0, 3],
    ]
    for (const [x, y, quarterTurns] of railPlacements) {
      const placed = cloneRotated(source.rail, quarterTurns)
      parts.push(translateShape(placed, x, y))
    }

    const currentAnchors: OpenGridPoint2D[] = [
      [-halfTile, -halfTile],
      [halfTile, -halfTile],
      [halfTile, halfTile],
      [-halfTile, halfTile],
    ]
    const targetAnchors: OpenGridPoint2D[] = [
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
      [width / 2, depth / 2],
      [-width / 2, depth / 2],
    ]
    for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
      const placed = cloneRotated(source.corner, quarterTurns)
      const currentAnchor = currentAnchors[quarterTurns]
      const targetAnchor = targetAnchors[quarterTurns]
      if (!currentAnchor || !targetAnchor) {
        throw new Error('OPENGRID_HALF_CORNER_MISSING')
      }
      parts.push(
        translateShape(
          placed,
          targetAnchor[0] - currentAnchor[0],
          targetAnchor[1] - currentAnchor[1],
        ),
      )
    }

    clip = makeBox(
      [-width / 2, -depth / 2, -0.01],
      [width / 2, depth / 2, thickness + 0.01],
    )
    const intersectionScope = context.booleanOperations?.createScope(
      parts.length,
    )
    const clippedParts = parts.map((part) =>
      clipShapeToBox(part, clip!, intersectionScope),
    )
    parts.length = 0
    parts.push(...clippedParts)
    const seamOverlap = 0.2
    if (interfaceX === 'left') {
      parts.push(
        makeBox(
          [width / 2 - seamOverlap, -depth / 2, 0],
          [width / 2 + seamOverlap, depth / 2, thickness],
        ),
      )
    }
    if (interfaceX === 'right') {
      parts.push(
        makeBox(
          [-width / 2 - seamOverlap, -depth / 2, 0],
          [-width / 2 + seamOverlap, depth / 2, thickness],
        ),
      )
    }
    if (interfaceY === 'bottom') {
      parts.push(
        makeBox(
          [-width / 2, depth / 2 - seamOverlap, 0],
          [width / 2, depth / 2 + seamOverlap, thickness],
        ),
      )
    }
    if (interfaceY === 'top') {
      parts.push(
        makeBox(
          [-width / 2, -depth / 2 - seamOverlap, 0],
          [width / 2, -depth / 2 + seamOverlap, thickness],
        ),
      )
    }
    return await fuseBalanced(parts, context)
  } catch (error) {
    for (const part of parts) deleteShape(part)
    throw error
  } finally {
    deleteShape(clip)
  }
}

async function addOfficialHalfCellExtensions(
  source: Shape3D,
  parameters: OpenGridParameters,
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (!hasOpenGridHalfCell(parameters)) return source
  try {
    const extensionPieces = await buildOfficialHalfCellExtensionPieces(
      parameters,
      variant,
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
    return await fuseBalanced([source, ...extensionPieces], context)
  } catch (error) {
    deleteShape(source)
    throw error
  }
}

async function buildOfficialHalfCellExtensionPieces(
  parameters: OpenGridParameters,
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D[]> {
  let rail: Shape3D | null = null
  let corner: Shape3D | null = null
  const cachePrototype = context.getOpenGridHalfCellPrototype
  try {
    rail = cachePrototype
      ? await cachePrototype(`rail:${variant}:${thickness}`, () =>
          buildRail(variant, thickness),
        )
      : buildRail(variant, thickness)
    corner = cachePrototype
      ? await cachePrototype(`corner:${variant}:${thickness}`, () =>
          buildCornerNode(variant, thickness),
        )
      : buildCornerNode(variant, thickness)
    const tileSource: HalfBoundaryTileSource = { rail, corner }
    return await buildHalfCellExtensionPieces(
      parameters,
      (spec) =>
        buildHalfBoundaryTile(
          tileSource,
          thickness,
          spec.width,
          spec.depth,
          spec.interfaceX,
          spec.interfaceY,
          context,
        ),
      `boundary:${variant}:${thickness}`,
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
  } finally {
    if (!cachePrototype) {
      deleteShape(rail)
      deleteShape(corner)
    }
  }
}

async function buildHalfCellExtensionPieces(
  parameters: OpenGridParameters,
  tileFactory: HalfExtensionTileFactory,
  prototypeKeyPrefix: string,
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D[]> {
  if (!hasOpenGridHalfCell(parameters)) return []

  const pieces: Shape3D[] = []
  const prototypes = new Map<string, Shape3D>()
  try {
    for (const spec of halfExtensionTileSpecs(parameters)) {
      assertGenerationCurrent(context)
      const prototypeKey = `${prototypeKeyPrefix}:${spec.width}:${spec.depth}:${spec.interfaceX ?? 'none'}:${spec.interfaceY ?? 'none'}`
      let prototype = prototypes.get(prototypeKey)
      if (!prototype) {
        prototype = context.getOpenGridHalfCellPrototype
          ? await context.getOpenGridHalfCellPrototype(prototypeKey, () =>
              tileFactory(spec),
            )
          : await tileFactory(spec)
        prototypes.set(prototypeKey, prototype)
      }
      let piece = prototype.clone()
      if (mirrorWithinLayer) {
        const mirrored = mirrorSurfaceWithinLayer(piece, thickness)
        if (mirrored !== piece) deleteShape(piece)
        piece = mirrored
      }
      pieces.push(
        translateShape(piece, spec.center[0], spec.center[1], zOffset),
      )
      await yieldAtSafeBoundary(context)
    }
    return pieces
  } catch (error) {
    for (const piece of pieces) deleteShape(piece)
    throw error
  } finally {
    if (!context.getOpenGridHalfCellPrototype) {
      for (const prototype of prototypes.values()) deleteShape(prototype)
    }
  }
}

async function addHalfCellExtensions(
  source: Shape3D,
  parameters: OpenGridParameters,
  tileFactory: HalfExtensionTileFactory,
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (!hasOpenGridHalfCell(parameters)) return source
  try {
    const extensionPieces = await buildHalfCellExtensionPieces(
      parameters,
      tileFactory,
      'heavy-bridge',
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
    return await fuseBalanced([source, ...extensionPieces], context)
  } catch (error) {
    deleteShape(source)
    throw error
  }
}

function mirrorSurfaceWithinLayer(shape: Shape3D, thickness: number): Shape3D {
  return shape.mirror([0, 0, 1], [0, 0, thickness / 2])
}

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

async function buildOpenGridPrototypeShape(
  variant: OpenGridVariant,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const parameters: OpenGridParameters = {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    variant,
    rows: 1,
    columns: 1,
    chamfers: 'none',
    connectorHoles: 'none',
    screwMode: 'none',
    customScrewPositions: [],
  }
  const startedAt = performance.now()

  if (variant === 'Full' || variant === 'Lite') {
    const thickness = OPENGRID_CONFIGURATION.variants[variant].thickness
    const prototype = await buildCanonicalTile(variant, thickness, context)
    context.reportPhase?.('prototype-build', performance.now() - startedAt)
    return prototype
  }

  const layerThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  let lower: Shape3D | null = null
  let upper: Shape3D | null = null
  let bridge: Shape3D | null = null
  try {
    lower = await buildCanonicalTile('Heavy', layerThickness, context)
    const mirroredLower = mirrorSurfaceWithinLayer(lower, layerThickness)
    if (mirroredLower !== lower) deleteShape(lower)
    lower = mirroredLower

    upper = await buildCanonicalTile('Heavy', layerThickness, context)
    const translatedUpper = upper.translate(
      0,
      0,
      layerThickness + OPENGRID_CONFIGURATION.heavyGap,
    )
    if (translatedUpper !== upper) deleteShape(upper)
    upper = translatedUpper

    bridge = await fuseBalanced(
      buildFlatBridgeTile(0, 0, layerThickness, context.booleanOperations),
      context,
    )
    const prototype = await fuseBalanced([lower, bridge, upper], context)
    lower = null
    bridge = null
    upper = null
    context.reportPhase?.('prototype-build', performance.now() - startedAt)
    return prototype
  } catch (error) {
    deleteShape(lower)
    deleteShape(bridge)
    deleteShape(upper)
    throw error
  }
}

export function buildOpenGridPrototype(
  variant: OpenGridVariant,
  context: OpenGridBuildContext = {},
): Promise<Shape3D> {
  return buildOpenGridPrototypeShape(variant, context)
}

function assertPrototypeTemplateBounds(
  shape: Shape3D,
  variant: OpenGridVariant,
): void {
  const actual = shape.boundingBox
  try {
    const [actualMin, actualMax] = actual.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    const expected = boundsForOpenGrid({ variant, rows: 1, columns: 1 })
    const matches = [...actualMin, ...actualMax].every((value, index) => {
      const expectedValue = [...expected.min, ...expected.max][index]
      return Math.abs(value - expectedValue) <= 0.05
    })
    if (!matches) throw new Error('OPENGRID_TEMPLATE_INVALID_BOUNDS')
  } finally {
    actual.delete()
  }
}

export async function importOpenGridPrototypeTemplate(
  blob: Blob,
  variant: OpenGridVariant,
): Promise<Shape3D> {
  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('OPENGRID_TEMPLATE_INVALID')
  }

  try {
    assertPrototypeTemplateBounds(imported, variant)
    return imported
  } catch (error) {
    deleteShape(imported)
    throw error
  }
}

export async function loadOpenGridPrototypeTemplate(
  variant: OpenGridVariant,
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPENGRID_PROTOTYPE_TEMPLATE_URLS[variant])
  if (!response.ok) throw new Error('OPENGRID_TEMPLATE_LOAD_FAILED')
  return importOpenGridPrototypeTemplate(await response.blob(), variant)
}

async function buildPrototypeTemplateAssembly(
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  let prototype: Shape3D | null = null
  let ownsPrototype = false
  const rows: Shape3D[][] = []
  const totalCells = parameters.rows * parameters.columns
  let completed = 0

  try {
    if (context.getOpenGridPrototype) {
      prototype = await context.getOpenGridPrototype(parameters.variant)
    } else {
      prototype = await buildOpenGridPrototypeShape(parameters.variant, context)
      ownsPrototype = true
    }

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
        const cloned = prototype.clone()
        const translated = cloned.translate(centerX, centerY, 0)
        if (translated !== cloned) deleteShape(cloned)
        rowPieces.push(translated)
        completed += 1
        reportProgress(context, completed, totalCells)
        await yieldAtSafeBoundary(context)
      }
    }

    const result = await fuseByStrategy(rows, 'prototype-template', context)
    rows.length = 0
    return result
  } catch (error) {
    for (const row of rows) {
      for (const piece of row) deleteShape(piece)
    }
    throw error
  } finally {
    if (ownsPrototype) deleteShape(prototype)
  }
}

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

async function buildProductBase(
  parameters: OpenGridParameters,
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (
    strategy === 'prototype-template' &&
    parameters.variant === 'Hybrid' &&
    (parameters.rows > 1 || parameters.columns > 1)
  ) {
    throw new Error('OPENGRID_HYBRID_TEMPLATE_UNAVAILABLE')
  }
  if (strategy === 'prototype-template' && !hasOpenGridHalfCell(parameters)) {
    return buildPrototypeTemplateAssembly(parameters, context)
  }

  if (parameters.variant === 'Hybrid') {
    return buildHybridProductBase(parameters, strategy, context)
  }

  if (!isOpenGridLayeredVariant(parameters.variant)) {
    return buildGridSurface(
      parameters,
      parameters.variant,
      parameters.variant === 'Lite'
        ? OPENGRID_CONFIGURATION.variants.Lite.thickness
        : OPENGRID_CONFIGURATION.variants.Full.thickness,
      0,
      false,
      strategy,
      context,
    )
  }

  const layerThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  let lower = await buildGridSurface(
    parameters,
    'Heavy',
    layerThickness,
    0,
    true,
    strategy,
    context,
  )
  let upper = await buildGridSurface(
    parameters,
    'Heavy',
    layerThickness,
    layerThickness + OPENGRID_CONFIGURATION.heavyGap,
    false,
    strategy,
    context,
  )
  const bridge = await buildHeavyBridge(
    parameters,
    layerThickness,
    strategy,
    context,
  )
  let cutBridge: Shape3D | null = null
  try {
    cutBridge = await applyHeavyBridgeFeatures(
      bridge,
      parameters,
      layerThickness,
      context,
    )
    const cutLower = await applyBatchedCuts(lower, parameters, context)
    lower = cutLower
    const cutUpper = await applyBatchedCuts(upper, parameters, context)
    upper = cutUpper
    return await fuseBalanced([lower, cutBridge, upper], context)
  } catch (error) {
    deleteShape(lower)
    deleteShape(cutBridge ?? bridge)
    deleteShape(upper)
    throw error
  }
}

const TARGET_FRAME_EPSILON = 0.000001
const TARGET_FRAME_OVERLAP = 0.2

function targetFramePartsFor(parameters: OpenGridParameters): Shape3D[] {
  if (!parameters.fitToTarget) return []

  const nominal = openGridNominalBoardConfiguration(parameters)
  const target = openGridBoardConfiguration(parameters)
  const hasXFrame = target.width - nominal.width > TARGET_FRAME_EPSILON
  const hasYFrame = target.depth - nominal.depth > TARGET_FRAME_EPSILON
  if (!hasXFrame && !hasYFrame) return []

  const nominalMinX = -nominal.width / 2
  const nominalMaxX = nominal.width / 2
  const nominalMinY = -nominal.depth / 2
  const nominalMaxY = nominal.depth / 2
  const targetMinX = -target.width / 2
  const targetMaxX = target.width / 2
  const targetMinY = -target.depth / 2
  const targetMaxY = target.depth / 2
  const frameMinY = hasYFrame ? targetMinY : nominalMinY
  const frameMaxY = hasYFrame ? targetMaxY : nominalMaxY
  const frameMinX = hasXFrame ? targetMinX : nominalMinX
  const frameMaxX = hasXFrame ? targetMaxX : nominalMaxX
  const parts: Shape3D[] = []

  try {
    if (hasXFrame) {
      parts.push(
        makeBox(
          [targetMinX, frameMinY, 0],
          [nominalMinX + TARGET_FRAME_OVERLAP, frameMaxY, target.height],
        ),
        makeBox(
          [nominalMaxX - TARGET_FRAME_OVERLAP, frameMinY, 0],
          [targetMaxX, frameMaxY, target.height],
        ),
      )
    }

    if (hasYFrame) {
      parts.push(
        makeBox(
          [frameMinX, targetMinY, 0],
          [frameMaxX, nominalMinY + TARGET_FRAME_OVERLAP, target.height],
        ),
        makeBox(
          [frameMinX, nominalMaxY - TARGET_FRAME_OVERLAP, 0],
          [frameMaxX, targetMaxY, target.height],
        ),
      )
    }

    return parts
  } catch (error) {
    for (const part of parts) deleteShape(part)
    throw error
  }
}

async function addTargetFrame(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const frameParts = targetFramePartsFor(parameters)
  if (frameParts.length === 0) return source
  return fuseBalanced([source, ...frameParts], context)
}

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

async function applyBoardFeatures(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  return applyBoardFeatureCuts(source, parameters, context, true)
}

async function applyBoardFeatureCuts(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
  includeChamfers: boolean,
): Promise<Shape3D> {
  const chamferGroups: CutterGroup[] = []
  const connectorGroups: CutterGroup[] = []
  const screwGroups: CutterGroup[] = []
  try {
    if (includeChamfers) chamferGroups.push(...createChamferCutters(parameters))
    connectorGroups.push(
      ...createBoardConnectorCutterGroups(parameters, context),
    )
    screwGroups.push(...createBoardScrewCutterGroups(parameters, context))
    const useCompoundScrewParts = context.useCompoundScrewParts !== false
    const useCompoundChamfers =
      context.useCompoundChamferCutters !== false &&
      parameters.chamfers !== 'everywhere'
    let combinedGroups: CutterGroup[]
    if (useCompoundChamfers && useCompoundScrewParts) {
      combinedGroups = combineCutterGroups([
        ...chamferGroups,
        ...connectorGroups,
        ...screwGroups,
      ])
    } else if (useCompoundChamfers) {
      combinedGroups = [
        ...combineCutterGroups([...chamferGroups, ...connectorGroups]),
        ...screwGroups,
      ]
    } else {
      let combinedScrewGroups: CutterGroup[]
      if (useCompoundScrewParts) {
        combinedScrewGroups = combineCutterGroups(screwGroups)
      } else {
        combinedScrewGroups = screwGroups
      }
      combinedGroups = [
        ...chamferGroups,
        ...combineCutterGroups(connectorGroups),
        ...combinedScrewGroups,
      ]
    }
    return await applyCutterGroups(source, combinedGroups, context)
  } catch (error) {
    for (const group of [...chamferGroups, ...connectorGroups, ...screwGroups])
      disposeCutter(group)
    throw error
  }
}

async function applyBoardScrewCuts(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const screwGroups = createBoardScrewCutterGroups(parameters, context)
  let groups: CutterGroup[]
  if (context.useCompoundScrewParts === false) {
    groups = screwGroups
  } else {
    groups = combineCutterGroups(screwGroups)
  }
  return applyCutterGroups(source, groups, context)
}

async function applyBoardConnectorCuts(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const groups = combineCutterGroups(
    createBoardConnectorCutterGroups(parameters, context),
  )
  return applyCutterGroups(source, groups, context)
}

function cutShape(source: Shape3D, cutter: Shape3D): Shape3D {
  const result = source.cut(cutter, { optimisation: 'none' })
  if (result !== source) deleteShape(source)
  return result
}

async function applyCutterGroups(
  source: Shape3D,
  groups: CutterGroup[],
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  let current = source
  const cutScope = context.booleanOperations?.createScope(groups.length)
  try {
    while (groups.length > 0) {
      assertGenerationCurrent(context)
      const group = groups.shift()
      if (!group) continue
      try {
        current = measureBooleanInScope(cutScope, 'cut', () =>
          cutShape(current, group.shape),
        )
      } finally {
        disposeCutter(group)
      }
      await yieldAtSafeBoundary(context)
    }
    return current
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    deleteShape(current)
    throw error
  }
}

async function applyBatchedCuts(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const groups = chamferCutterGroups(parameters, context)
  return applyCutterGroups(source, groups, context)
}

async function applyHeavyBridgeFeatures(
  source: Shape3D,
  parameters: OpenGridParameters,
  zOffset: number,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const groups = chamferCutterGroups(
    parameters,
    context,
    zOffset,
    OPENGRID_CONFIGURATION.heavyGap,
  )
  return applyCutterGroups(source, groups, context)
}

export async function buildOpenGridBRepWithStrategy(
  parameters: OpenGridParameters,
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext = {},
): Promise<Shape3D> {
  if (
    strategy !== 'whole-profile' &&
    strategy !== 'row-block' &&
    strategy !== 'cell-balanced' &&
    strategy !== 'prototype-template'
  ) {
    throw new Error('OPENGRID_STRATEGY_MISSING')
  }
  let base: Shape3D | null = null
  try {
    assertGenerationCurrent(context)
    base = await buildProductBase(parameters, strategy, context)
    if (strategy === 'prototype-template') {
      base = await applyBoardFeatures(base, parameters, context)
    } else {
      base = await applyBoardFeatureCuts(
        base,
        parameters,
        context,
        !isOpenGridLayeredVariant(parameters.variant),
      )
    }
    // Keep cutters on the nominal grid geometry. A narrow target-frame overlap
    // can otherwise be severed by edge features and fail the single-solid gate.
    base = await addTargetFrame(base, parameters, context)
    assertGenerationCurrent(context)
    return base
  } catch (error) {
    deleteShape(base)
    throw error
  }
}

export async function buildOpenGridBRep(
  parameters: OpenGridParameters,
  context: OpenGridBuildContext = {},
): Promise<Shape3D> {
  const strategy = OPENGRID_PRODUCT_STRATEGIES[parameters.variant]
  return buildOpenGridBRepWithStrategy(parameters, strategy, context)
}

export function effectiveScrewPositionsForOpenGrid(
  parameters: OpenGridParameters,
): OpenGridScrewPosition[] {
  return openGridScrewPositionsFor(parameters)
}
