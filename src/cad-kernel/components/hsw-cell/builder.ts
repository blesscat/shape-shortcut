import {
  cast,
  getOC,
  importSTEP,
  isShape3D,
  Solid,
  type Shape3D,
} from 'replicad'
import type { BOPAlgo_GlueEnum, TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForHswCell,
  hswCellOffsetFor,
  HSW_CELL_CONFIGURATION,
  type HswCellParameters,
} from '../../../cad-contract/units'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
  type BooleanOperationScope,
} from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'

export const hswCellTemplateUrl = new URL('./hsw-cell.step', import.meta.url)

const EDGE_TOLERANCE = 0.01

export type HswCellBuildContext = {
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'cells' | 'batches' | 'steps'
  }) => void
  reportPhase?: (
    phase: 'clone-translate' | 'assembly-fuse',
    durationMs: number,
  ) => void
  booleanOperations?: BooleanOperationReporter
}

export type HswCellAssemblyStrategy = 'sequential' | 'column'

export const HSW_COLUMN_ASSEMBLY_MIN_CELLS = 100

type PointTuple = [number, number, number]
type BoundsTuple = [PointTuple, PointTuple]
type CellOffset = [number, number]
type AssemblyTimings = {
  cloneTranslateMs: number
  fuseMs: number
}

class OwnedShapeGroup {
  private readonly shapes = new Set<Shape3D>()

  add(shape: Shape3D): void {
    this.shapes.add(shape)
  }

  release(shape: Shape3D): void {
    if (!this.shapes.delete(shape)) return
    deleteShape(shape)
  }

  remove(shape: Shape3D): void {
    this.shapes.delete(shape)
  }

  dispose(): void {
    for (const shape of this.shapes) deleteShape(shape)
    this.shapes.clear()
  }
}

function assertGenerationCurrent(context: HswCellBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: HswCellBuildContext,
): Promise<void> {
  await context.yieldToEventLoop?.()
}

function reportCellProgress(
  context: HswCellBuildContext,
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

function fuseShapes(
  first: Shape3D,
  second: Shape3D,
  simplifyResult: boolean,
): Shape3D {
  if (simplifyResult) return first.fuse(second, { optimisation: 'sameFace' })
  return fusePairWithoutSimplifying(first, second)
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
      throw new Error('HSW_FUSE_NOT_3D')
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
  context: HswCellBuildContext,
  fuseScope: BooleanOperationScope | undefined,
  simplifyResult: boolean,
): Promise<Shape3D> {
  let fused: Shape3D | null = null

  try {
    assertGenerationCurrent(context)
    fused = measureBooleanInScope(fuseScope, 'fuse', () =>
      fuseShapes(first, second, simplifyResult),
    )
    assertGenerationCurrent(context)
    if (fused !== first) owned.release(first)
    if (fused !== second) owned.release(second)
    owned.add(fused)
    await yieldAtSafeBoundary(context)
    assertGenerationCurrent(context)
    return fused
  } catch (error) {
    if (fused && fused !== first && fused !== second) deleteShape(fused)
    throw error
  }
}

async function fuseBalanced(
  shapes: Shape3D[],
  owned: OwnedShapeGroup,
  context: HswCellBuildContext,
  timings: AssemblyTimings,
  simplifyResult: boolean,
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
      if (!first) throw new Error('HSW_TEMPLATE_EMPTY')
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
  if (!result) throw new Error('HSW_TEMPLATE_EMPTY')
  return result
}

async function createTranslatedCell(
  template: Shape3D,
  [x, y]: CellOffset,
  owned: OwnedShapeGroup,
  context: HswCellBuildContext,
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

async function createTranslatedColumn(
  column: Shape3D,
  x: number,
  y: number,
  owned: OwnedShapeGroup,
  context: HswCellBuildContext,
): Promise<Shape3D> {
  assertGenerationCurrent(context)
  const cloned = column.clone()
  owned.add(cloned)
  const translated = cloned.translate(x, y, 0)
  owned.release(cloned)
  owned.add(translated)
  assertGenerationCurrent(context)
  await yieldAtSafeBoundary(context)
  assertGenerationCurrent(context)
  return translated
}

function centeringOffsetYForColumns(columns: number): number {
  if (columns === 1) return 0
  return HSW_CELL_CONFIGURATION.staggerY / 2
}

function staggerYForColumn(column: number): number {
  if (column % 2 === 0) return 0
  return HSW_CELL_CONFIGURATION.staggerY
}

function baseColumnOffset(
  parameters: HswCellParameters,
  row: number,
): CellOffset {
  const centeringOffsetY = centeringOffsetYForColumns(parameters.columns)
  return [
    -((parameters.columns - 1) / 2) * HSW_CELL_CONFIGURATION.columnPitch,
    (row - (parameters.rows - 1) / 2) * HSW_CELL_CONFIGURATION.rowPitch -
      centeringOffsetY,
  ]
}

async function buildSequentialAssembly(
  parameters: HswCellParameters,
  template: Shape3D,
  context: HswCellBuildContext,
): Promise<Shape3D> {
  const owned = new OwnedShapeGroup()
  const offsets: CellOffset[] = []
  for (let row = 0; row < parameters.rows; row += 1) {
    for (let column = 0; column < parameters.columns; column += 1) {
      offsets.push(hswCellOffsetFor(parameters, row, column))
    }
  }
  const timings: AssemblyTimings = { cloneTranslateMs: 0, fuseMs: 0 }
  let combined: Shape3D | null = null
  let completedCells = 0
  const fuseScope =
    offsets.length > 1
      ? context.booleanOperations?.createScope(offsets.length - 1)
      : undefined

  try {
    reportCellProgress(context, 0, offsets.length)
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
        true,
      )
      timings.fuseMs += performance.now() - fuseStartedAt
    }

    if (!combined) throw new Error('HSW_TEMPLATE_EMPTY')
    context.reportPhase?.('clone-translate', timings.cloneTranslateMs)
    context.reportPhase?.('assembly-fuse', timings.fuseMs)
    owned.remove(combined)
    return combined
  } finally {
    owned.dispose()
  }
}

async function buildColumnAssembly(
  parameters: HswCellParameters,
  template: Shape3D,
  context: HswCellBuildContext,
): Promise<Shape3D> {
  const owned = new OwnedShapeGroup()
  const timings: AssemblyTimings = { cloneTranslateMs: 0, fuseMs: 0 }
  const totalCells = parameters.rows * parameters.columns
  const columns: Shape3D[] = []
  let completedCells = 0

  try {
    reportCellProgress(context, 0, totalCells)
    const columnCells: Shape3D[] = []
    for (let row = 0; row < parameters.rows; row += 1) {
      const cloneStartedAt = performance.now()
      const cell = await createTranslatedCell(
        template,
        baseColumnOffset(parameters, row),
        owned,
        context,
      )
      columnCells.push(cell)
      timings.cloneTranslateMs += performance.now() - cloneStartedAt
      completedCells += 1
      reportCellProgress(context, completedCells, totalCells)
    }

    const canonicalColumn = await fuseBalanced(
      columnCells,
      owned,
      context,
      timings,
      false,
    )
    columns.push(canonicalColumn)

    for (let column = 1; column < parameters.columns; column += 1) {
      const cloneStartedAt = performance.now()
      const translatedColumn = await createTranslatedColumn(
        canonicalColumn,
        column * HSW_CELL_CONFIGURATION.columnPitch,
        staggerYForColumn(column),
        owned,
        context,
      )
      timings.cloneTranslateMs += performance.now() - cloneStartedAt
      columns.push(translatedColumn)
      completedCells += parameters.rows
      reportCellProgress(context, completedCells, totalCells)
    }

    const combined = await fuseBalanced(columns, owned, context, timings, false)
    context.reportPhase?.('clone-translate', timings.cloneTranslateMs)
    context.reportPhase?.('assembly-fuse', timings.fuseMs)
    owned.remove(combined)
    return combined
  } finally {
    owned.dispose()
  }
}

export function selectHswCellAssemblyStrategy(
  parameters: HswCellParameters,
): HswCellAssemblyStrategy {
  const cellCount = parameters.rows * parameters.columns
  if (cellCount >= HSW_COLUMN_ASSEMBLY_MIN_CELLS) return 'column'
  return 'sequential'
}

export function buildHswCell(
  parameters: HswCellParameters,
  template: Shape3D,
  context: HswCellBuildContext = {},
): Promise<Shape3D> {
  return buildHswCellWithStrategy(
    parameters,
    template,
    selectHswCellAssemblyStrategy(parameters),
    context,
  )
}

export function buildHswCellSequential(
  parameters: HswCellParameters,
  template: Shape3D,
  context: HswCellBuildContext = {},
): Promise<Shape3D> {
  return buildHswCellWithStrategy(parameters, template, 'sequential', context)
}

export async function buildHswCellWithStrategy(
  parameters: HswCellParameters,
  template: Shape3D,
  strategy: HswCellAssemblyStrategy,
  context: HswCellBuildContext = {},
): Promise<Shape3D> {
  const combined = await buildHswCellAssembly(
    parameters,
    template,
    strategy,
    context,
  )
  return finalizeHswShape(combined, context)
}

export async function buildHswCellAssembly(
  parameters: HswCellParameters,
  template: Shape3D,
  strategy: HswCellAssemblyStrategy,
  context: HswCellBuildContext = {},
): Promise<Shape3D> {
  if (strategy === 'column') {
    return buildColumnAssembly(parameters, template, context)
  }
  return buildSequentialAssembly(parameters, template, context)
}

async function finalizeHswShape(
  combined: Shape3D,
  context: HswCellBuildContext,
): Promise<Shape3D> {
  let singleSolid: Solid | null = null
  try {
    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)
    assertGenerationCurrent(context)
    singleSolid = asSingleSolid(combined)
    assertGenerationCurrent(context)
    return singleSolid
  } catch (error) {
    deleteShape(singleSolid)
    throw error
  } finally {
    if (singleSolid !== combined) deleteShape(combined)
  }
}

function readShapeBounds(shape: Shape3D): BoundsTuple {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as BoundsTuple
  } finally {
    boundingBox.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= EDGE_TOLERANCE
}

function assertTemplateBounds(shape: Shape3D): void {
  const [actualMin, actualMax] = readShapeBounds(shape)
  const expected = boundsForHswCell({ rows: 1, columns: 1 })
  const matchesMin =
    isClose(actualMin[0], expected.min[0]) &&
    isClose(actualMin[1], expected.min[1]) &&
    isClose(actualMin[2], expected.min[2])
  const matchesMax =
    isClose(actualMax[0], expected.max[0]) &&
    isClose(actualMax[1], expected.max[1]) &&
    isClose(actualMax[2], expected.max[2])

  if (!matchesMin || !matchesMax) {
    throw new Error('HSW_CELL_ASSET_INVALID_BOUNDS')
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
    for (const solid of solids) deleteShape(solid)
    throw new Error('HSW_CELL_ASSET_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

export async function importHswCellTemplate(blob: Blob): Promise<Shape3D> {
  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('HSW_CELL_ASSET_INVALID')
  }

  let singleSolid: Solid | null = null
  try {
    singleSolid = asSingleSolid(imported)
    assertTemplateBounds(singleSolid)
    return singleSolid
  } catch (error) {
    deleteShape(singleSolid)
    throw error
  } finally {
    if (singleSolid !== imported) deleteShape(imported)
  }
}

export async function loadHswCellTemplate(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(hswCellTemplateUrl)
  if (!response.ok) throw new Error('HSW_CELL_ASSET_LOAD_FAILED')
  return importHswCellTemplate(await response.blob())
}
