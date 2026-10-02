import {
  cast,
  getOC,
  importSTEP,
  isShape3D,
  Solid,
  type Edge,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import type { BOPAlgo_GlueEnum } from 'replicad-opencascadejs'
import {
  measureBooleanInScope,
  type BooleanOperationScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  boundsForModularGridBase,
  PROTOTYPE_CONFIGURATION,
  type ModularGridBaseParameters,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'

export const modularGridBaseTemplateUrl = new URL(
  './board-cell-template.step',
  import.meta.url,
)
const EDGE_TOLERANCE = 0.01

type PointTuple = [number, number, number]
type CellOffset = [number, number]

export type ModularGridBaseBuildContext = {
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'cells' | 'batches' | 'steps'
  }) => void
  reportPhase?: (
    phase: 'clone-translate' | 'assembly-fuse' | 'fillet',
    durationMs: number,
  ) => void
  booleanOperations?: BooleanOperationReporter
}

export type ModularGridAssemblyStrategy = 'sequential' | 'balanced'

export const BALANCED_ASSEMBLY_MIN_CELLS = 100
export const BALANCED_ASSEMBLY_BLOCK_SIZE = 4

class OwnedShapeGroup {
  private readonly shapes = new Set<Shape3D>()

  add(shape: Shape3D): void {
    this.shapes.add(shape)
  }

  remove(shape: Shape3D): void {
    this.shapes.delete(shape)
  }

  release(shape: Shape3D): void {
    if (!this.shapes.delete(shape)) return
    deleteShape(shape)
  }

  dispose(): void {
    for (const shape of this.shapes) deleteShape(shape)
    this.shapes.clear()
  }
}

type AssemblyTimings = {
  cloneTranslateMs: number
  fuseMs: number
}

function assertGenerationCurrent(context: ModularGridBaseBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: ModularGridBaseBuildContext,
): Promise<void> {
  await context.yieldToEventLoop?.()
}

function reportCellProgress(
  context: ModularGridBaseBuildContext,
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

function fusePairWithoutSimplifying(first: Shape3D, second: Shape3D): Shape3D {
  const oc = getOC()
  const progress = new oc.Message_ProgressRange_1()
  const operation = new oc.BRepAlgoAPI_Fuse_3(
    first.wrapped,
    second.wrapped,
    progress,
  )

  try {
    operation.SetGlue(
      oc.BOPAlgo_GlueEnum.BOPAlgo_GlueShift as unknown as BOPAlgo_GlueEnum,
    )
    operation.Build(progress)
    const result = cast(operation.Shape())
    if (!isShape3D(result)) {
      deleteShape(result)
      throw new Error('GRID_FUSE_NOT_3D')
    }
    return result
  } finally {
    operation.delete()
    progress.delete()
  }
}

async function fuseOwnedShapes(
  first: Shape3D,
  second: Shape3D,
  owned: OwnedShapeGroup,
  context: ModularGridBaseBuildContext,
  fuseScope: BooleanOperationScope | undefined,
  simplifyResult = true,
): Promise<Shape3D> {
  let fused: Shape3D | null = null

  try {
    assertGenerationCurrent(context)
    if (simplifyResult) {
      fused = measureBooleanInScope(fuseScope, 'fuse', () =>
        first.fuse(second, { optimisation: 'sameFace' }),
      )
    } else {
      fused = measureBooleanInScope(fuseScope, 'fuse', () =>
        fusePairWithoutSimplifying(first, second),
      )
    }
    assertGenerationCurrent(context)
    if (fused !== first) owned.release(first)
    if (fused !== second) owned.release(second)
    owned.add(fused)
    await yieldAtSafeBoundary(context)
    return fused
  } catch (error) {
    if (fused && fused !== first && fused !== second) deleteShape(fused)
    throw error
  }
}

async function fuseBalanced(
  shapes: Shape3D[],
  owned: OwnedShapeGroup,
  context: ModularGridBaseBuildContext,
  timings: AssemblyTimings,
  simplifyResult = true,
): Promise<Shape3D> {
  let current = shapes
  const fuseScope =
    shapes.length > 1
      ? context.booleanOperations?.createScope(shapes.length - 1)
      : undefined

  while (current.length > 1) {
    assertGenerationCurrent(context)
    const next: Shape3D[] = []
    for (let index = 0; index < current.length; index += 2) {
      const first = current[index]
      const second = current[index + 1]
      if (!second) {
        next.push(first)
        continue
      }

      const fuseStartedAt = performance.now()
      next.push(
        await fuseOwnedShapes(
          first,
          second,
          owned,
          context,
          fuseScope,
          simplifyResult,
        ),
      )
      timings.fuseMs += performance.now() - fuseStartedAt
    }
    current = next
  }

  const result = current[0]
  if (!result) throw new Error('GRID_TEMPLATE_EMPTY')
  return result
}

async function fuseSequential(
  shapes: Shape3D[],
  owned: OwnedShapeGroup,
  context: ModularGridBaseBuildContext,
  timings: AssemblyTimings,
): Promise<Shape3D> {
  const first = shapes[0]
  if (!first) throw new Error('GRID_TEMPLATE_EMPTY')
  let combined = first
  const fuseScope =
    shapes.length > 1
      ? context.booleanOperations?.createScope(shapes.length - 1)
      : undefined

  for (const shape of shapes.slice(1)) {
    const fuseStartedAt = performance.now()
    combined = await fuseOwnedShapes(combined, shape, owned, context, fuseScope)
    timings.fuseMs += performance.now() - fuseStartedAt
  }
  return combined
}

async function fuseMany(
  shapes: Shape3D[],
  owned: OwnedShapeGroup,
  context: ModularGridBaseBuildContext,
): Promise<Shape3D> {
  const first = shapes[0]
  if (!first) throw new Error('GRID_TEMPLATE_EMPTY')
  if (shapes.length === 1) return first

  const oc = getOC()
  const argumentsList = new oc.TopTools_ListOfShape_1()
  const toolsList = new oc.TopTools_ListOfShape_1()
  const progress = new oc.Message_ProgressRange_1()
  const builder = new oc.BRepAlgoAPI_Fuse_1()
  const fuseScope = context.booleanOperations?.createScope(1)
  let fused: Shape3D | null = null

  try {
    assertGenerationCurrent(context)
    argumentsList.Append_1(first.wrapped)
    for (const shape of shapes.slice(1)) toolsList.Append_1(shape.wrapped)
    builder.SetArguments(argumentsList)
    builder.SetTools(toolsList)
    builder.SetGlue(
      oc.BOPAlgo_GlueEnum.BOPAlgo_GlueShift as unknown as BOPAlgo_GlueEnum,
    )
    measureBooleanInScope(fuseScope, 'fuse', () => builder.Build(progress))
    const result = cast(builder.Shape())
    if (!isShape3D(result)) {
      deleteShape(result)
      throw new Error('GRID_FUSE_NOT_3D')
    }
    fused = result
    assertGenerationCurrent(context)
    for (const shape of shapes) {
      if (shape !== fused) owned.release(shape)
    }
    owned.add(fused)
    await yieldAtSafeBoundary(context)
    return fused
  } catch (error) {
    if (fused && !shapes.includes(fused)) deleteShape(fused)
    throw error
  } finally {
    builder.delete()
    progress.delete()
    argumentsList.delete()
    toolsList.delete()
  }
}

async function createTranslatedCell(
  template: Shape3D,
  [x, y]: CellOffset,
  owned: OwnedShapeGroup,
  context: ModularGridBaseBuildContext,
): Promise<Shape3D> {
  assertGenerationCurrent(context)
  const cell = template.clone()
  owned.add(cell)
  const translated = cell.translate(x, y, 0)
  owned.release(cell)
  owned.add(translated)
  assertGenerationCurrent(context)
  await yieldAtSafeBoundary(context)
  assertGenerationCurrent(context)
  return translated
}

async function createTranslatedRow(
  rowShape: Shape3D,
  y: number,
  owned: OwnedShapeGroup,
  context: ModularGridBaseBuildContext,
): Promise<Shape3D> {
  assertGenerationCurrent(context)
  const clonedRow = rowShape.clone()
  owned.add(clonedRow)
  const translatedRow = clonedRow.translate(0, y, 0)
  owned.release(clonedRow)
  owned.add(translatedRow)
  assertGenerationCurrent(context)
  await yieldAtSafeBoundary(context)
  assertGenerationCurrent(context)
  return translatedRow
}

async function buildSequentialAssembly(
  parameters: ModularGridBaseParameters,
  template: Shape3D,
  context: ModularGridBaseBuildContext,
): Promise<Shape3D> {
  const owned = new OwnedShapeGroup()
  const offsets = cellOffsetsForGrid(parameters)
  const timings: AssemblyTimings = { cloneTranslateMs: 0, fuseMs: 0 }
  let combined: Shape3D | null = null
  let completedCells = 0
  const fuseScope =
    offsets.length > 1
      ? context.booleanOperations?.createScope(offsets.length - 1)
      : undefined

  try {
    for (const offset of offsets) {
      const cloneStartedAt = performance.now()
      const cell = await createTranslatedCell(template, offset, owned, context)
      timings.cloneTranslateMs += performance.now() - cloneStartedAt
      completedCells += 1
      reportCellProgress(context, completedCells, offsets.length)

      if (!combined) {
        combined = cell
        continue
      }

      const fuseStartedAt = performance.now()
      combined = await fuseOwnedShapes(
        combined,
        cell,
        owned,
        context,
        fuseScope,
      )
      timings.fuseMs += performance.now() - fuseStartedAt
    }

    if (!combined) throw new Error('GRID_TEMPLATE_EMPTY')
    context.reportPhase?.('clone-translate', timings.cloneTranslateMs)
    context.reportPhase?.('assembly-fuse', timings.fuseMs)
    owned.remove(combined)
    return combined
  } finally {
    owned.dispose()
  }
}

async function buildBalancedAssembly(
  parameters: ModularGridBaseParameters,
  template: Shape3D,
  context: ModularGridBaseBuildContext,
): Promise<Shape3D> {
  const owned = new OwnedShapeGroup()
  const timings: AssemblyTimings = { cloneTranslateMs: 0, fuseMs: 0 }
  const rowShapes: Shape3D[] = []
  let completedCells = 0
  const totalCells = parameters.rows * parameters.columns

  try {
    const rowParameters = { rows: 1, columns: parameters.columns }
    const firstRowY =
      -((parameters.rows - 1) / 2) *
      PROTOTYPE_CONFIGURATION.modularGridBase.cellDepth
    const rowOffsets = cellOffsetsForGrid(rowParameters).map(
      ([x]) => [x, firstRowY] as CellOffset,
    )
    const rowBlocks: Shape3D[] = []
    for (
      let column = 0;
      column < parameters.columns;
      column += BALANCED_ASSEMBLY_BLOCK_SIZE
    ) {
      const blockCells: Shape3D[] = []
      const blockEnd = Math.min(
        parameters.columns,
        column + BALANCED_ASSEMBLY_BLOCK_SIZE,
      )
      for (let blockColumn = column; blockColumn < blockEnd; blockColumn += 1) {
        const cloneStartedAt = performance.now()
        const cell = await createTranslatedCell(
          template,
          rowOffsets[blockColumn],
          owned,
          context,
        )
        timings.cloneTranslateMs += performance.now() - cloneStartedAt
        blockCells.push(cell)
        completedCells += 1
        reportCellProgress(context, completedCells, totalCells)
      }
      rowBlocks.push(
        await fuseBalanced(blockCells, owned, context, timings, false),
      )
    }

    const rowShape = await fuseBalanced(
      rowBlocks,
      owned,
      context,
      timings,
      false,
    )
    rowShapes.push(rowShape)

    for (let row = 1; row < parameters.rows; row += 1) {
      const rowCloneStartedAt = performance.now()
      const translatedRow = await createTranslatedRow(
        rowShape,
        row * PROTOTYPE_CONFIGURATION.modularGridBase.cellDepth,
        owned,
        context,
      )
      timings.cloneTranslateMs += performance.now() - rowCloneStartedAt
      rowShapes.push(translatedRow)
      completedCells += parameters.columns
      reportCellProgress(context, completedCells, totalCells)
    }
    const fuseStartedAt = performance.now()
    const combined = await fuseMany(rowShapes, owned, context)
    timings.fuseMs += performance.now() - fuseStartedAt
    context.reportPhase?.('clone-translate', timings.cloneTranslateMs)
    context.reportPhase?.('assembly-fuse', timings.fuseMs)
    owned.remove(combined)
    return combined
  } finally {
    owned.dispose()
  }
}

async function finalizeGridShape(
  combined: Shape3D,
  parameters: ModularGridBaseParameters,
  context: ModularGridBaseBuildContext,
  simplifyResult: boolean,
): Promise<Shape3D> {
  let source = combined
  let rounded: Shape3D | null = null
  const filletStartedAt = performance.now()

  try {
    assertGenerationCurrent(context)
    if (simplifyResult) {
      const simplified = source.simplify()
      if (simplified !== source) {
        deleteShape(source)
        source = simplified
      }
      assertGenerationCurrent(context)
      await yieldAtSafeBoundary(context)
      assertGenerationCurrent(context)
    }
    rounded = source.fillet((edge) => {
      if (isExternalVerticalEdge(edge, parameters)) {
        return PROTOTYPE_CONFIGURATION.modularGridBase.outerCornerRadius
      }
      return null
    })
    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)
    assertGenerationCurrent(context)
  } catch (error) {
    deleteShape(rounded)
    deleteShape(source)
    throw error
  }

  context.reportPhase?.('fillet', performance.now() - filletStartedAt)
  deleteShape(source)
  let singleSolid: Solid | null = null
  try {
    singleSolid = asSingleSolid(rounded)
    return singleSolid
  } finally {
    if (singleSolid !== rounded) deleteShape(rounded)
  }
}

function asSingleSolid(shape: Shape3D): Solid {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  const solids: Solid[] = []
  try {
    while (explorer.More()) {
      solids.push(new Solid(oc.TopoDS.Solid_1(explorer.Current())))
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }

  if (solids.length !== 1) {
    for (const solid of solids) solid.delete()
    throw new Error('GRID_TEMPLATE_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function readPoint(point: {
  toTuple: () => PointTuple
  delete: () => void
}): PointTuple {
  try {
    return point.toTuple()
  } finally {
    point.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= EDGE_TOLERANCE
}

function isExternalVerticalEdge(
  edge: Edge,
  parameters: ModularGridBaseParameters,
): boolean {
  if (edge.geomType !== 'LINE') return false

  const start = readPoint(edge.startPoint)
  const end = readPoint(edge.endPoint)
  const bounds = boundsForModularGridBase(parameters)
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[1] - bounds.min[1]
  const height = bounds.max[2] - bounds.min[2]
  const hasVerticalSpan = isClose(Math.abs(start[2] - end[2]), height)
  const hasStableXY = isClose(start[0], end[0]) && isClose(start[1], end[1])
  const isAtExternalCorner =
    isClose(Math.abs(start[0]), width / 2) &&
    isClose(Math.abs(start[1]), depth / 2)

  return hasVerticalSpan && hasStableXY && isAtExternalCorner
}

function readShapeBounds(shape: Shape3D): PointTuple[] {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as PointTuple[]
  } finally {
    boundingBox.delete()
  }
}

function assertTemplateBounds(shape: Shape3D): void {
  const [[minX, minY, minZ], [maxX, maxY, maxZ]] = readShapeBounds(shape)
  const expected = boundsForModularGridBase({ rows: 1, columns: 1 })
  const matches = [
    [minX, expected.min[0]],
    [minY, expected.min[1]],
    [minZ, expected.min[2]],
    [maxX, expected.max[0]],
    [maxY, expected.max[1]],
    [maxZ, expected.max[2]],
  ].every(([actual, wanted]) => isClose(actual, wanted))

  if (!matches) throw new Error('GRID_TEMPLATE_INVALID_BOUNDS')
}

export function cellOffsetsForGrid(
  parameters: ModularGridBaseParameters,
): CellOffset[] {
  const grid = PROTOTYPE_CONFIGURATION.modularGridBase
  const offsets: CellOffset[] = []
  const centerRow = (parameters.rows - 1) / 2
  const centerColumn = (parameters.columns - 1) / 2

  for (let row = 0; row < parameters.rows; row += 1) {
    for (let column = 0; column < parameters.columns; column += 1) {
      offsets.push([
        (column - centerColumn) * grid.cellWidth,
        (row - centerRow) * grid.cellDepth,
      ])
    }
  }

  return offsets
}

export function externalCornerCoordinates(
  parameters: ModularGridBaseParameters,
): CellOffset[] {
  const bounds = boundsForModularGridBase(parameters)
  return [
    [bounds.min[0], bounds.min[1]],
    [bounds.max[0], bounds.min[1]],
    [bounds.min[0], bounds.max[1]],
    [bounds.max[0], bounds.max[1]],
  ]
}

export function buildModularGridBase(
  parameters: ModularGridBaseParameters,
  template: Shape3D,
  context: ModularGridBaseBuildContext = {},
): Promise<Shape3D> {
  const strategy = selectModularGridAssemblyStrategy(parameters)
  return buildModularGridBaseWithStrategy(
    parameters,
    template,
    strategy,
    context,
  )
}

export async function buildModularGridBaseWithStrategy(
  parameters: ModularGridBaseParameters,
  template: Shape3D,
  strategy: ModularGridAssemblyStrategy,
  context: ModularGridBaseBuildContext = {},
): Promise<Shape3D> {
  const combined =
    strategy === 'balanced'
      ? await buildBalancedAssembly(parameters, template, context)
      : await buildSequentialAssembly(parameters, template, context)

  return finalizeGridShape(
    combined,
    parameters,
    context,
    strategy === 'balanced' &&
      parameters.rows * parameters.columns < BALANCED_ASSEMBLY_MIN_CELLS,
  )
}

export async function buildModularGridBaseSequential(
  parameters: ModularGridBaseParameters,
  template: Shape3D,
  context: ModularGridBaseBuildContext = {},
): Promise<Shape3D> {
  return buildModularGridBaseWithStrategy(
    parameters,
    template,
    'sequential',
    context,
  )
}

export function selectModularGridAssemblyStrategy(
  parameters: ModularGridBaseParameters,
): ModularGridAssemblyStrategy {
  const cellCount = parameters.rows * parameters.columns
  return cellCount >= BALANCED_ASSEMBLY_MIN_CELLS ? 'balanced' : 'sequential'
}

export async function importModularGridBaseTemplate(
  blob: Blob,
): Promise<Shape3D> {
  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('GRID_TEMPLATE_INVALID')
  }

  let singleSolid: Solid | null = null
  try {
    singleSolid = asSingleSolid(imported)
    assertTemplateBounds(singleSolid)
    return singleSolid
  } catch (error) {
    if (singleSolid) deleteShape(singleSolid)
    throw error
  } finally {
    if (singleSolid !== imported) deleteShape(imported)
  }
}

export async function loadModularGridBaseTemplate(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(modularGridBaseTemplateUrl)
  if (!response.ok) throw new Error('GRID_TEMPLATE_LOAD_FAILED')
  return importModularGridBaseTemplate(await response.blob())
}
