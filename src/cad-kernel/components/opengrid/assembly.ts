import type { Shape3D } from 'replicad'
import type { OpenGridPoint2D } from '../../../cad-contract/units'
import { OPENGRID_CONFIGURATION } from './profile'
import {
  measureBooleanInScope,
  type BooleanOperationScope,
} from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'
import {
  assertGenerationCurrent,
  yieldAtSafeBoundary,
  type OpenGridAssemblyStrategy,
  type OpenGridBuildContext,
} from './builder'
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

export {
  addSpatialAssemblyPiece,
  fuseBalanced,
  fuseSequential,
  fuseByStrategy,
  fuseSpatialAssemblyRegionGroups,
}
export type { SpatialAssemblyPiece }
