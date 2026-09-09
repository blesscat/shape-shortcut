import {
  getOC,
  makeBox,
  makeCompound,
  sketchRoundedRectangle,
  Sketcher,
  Solid,
  type Shape3D,
} from 'replicad'
import type { Edge } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridOpenShelf,
  openGridOpenShelfClearCellHeightsFor,
  openGridOpenShelfDividerCentersFor,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfPegCentersFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  openGridOpenShelfShelfCountFor,
  openGridOpenShelfTopInnerFrontZFor,
  openGridOpenShelfTopInnerRearZFor,
  openGridOpenShelfTopOuterRearZFor,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  validateOpenGridOpenShelfParameters,
  type OpenGridOpenShelfParameters,
} from '../../../cad-contract/units'
import { filletEdgesAtZ } from '../../bottom-edge-fillet'
import {
  measureBooleanCountInScope,
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  makeOpenGridOpenShelfPlateHoneycombCutters,
  makeOpenGridOpenShelfWallHoneycombCutters,
  openGridOpenShelfHoneycombCellCountFor,
} from '../../lattice/opengrid-honeycomb'
import { makeOpenGridIntegratedSeat } from '../opengrid-locating-assembly/integrated'
import { toGeometryError } from '../../geometry-errors'

const HONEYCOMB_CUT_BATCH_SIZE = 128

export type OpenGridOpenShelfBuildContext = {
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'steps'
  }) => void
  booleanOperations?: BooleanOperationReporter
}

type Point2D = [number, number]
type Point3D = [number, number, number]

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function assertGenerationCurrent(context: OpenGridOpenShelfBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: OpenGridOpenShelfBuildContext,
): Promise<void> {
  await context.yieldToEventLoop?.()
}

function reportProgress(
  context: OpenGridOpenShelfBuildContext,
  completed: number,
  total: number,
): void {
  context.reportProgress?.({
    stage: 'building',
    completed,
    total,
    unit: 'steps',
  })
}

function fuseShapes(first: Shape3D, second: Shape3D): Shape3D {
  let fused: Shape3D | null = null
  try {
    fused = first.fuse(second)
    if (fused !== first) deleteShape(first)
    if (fused !== second) deleteShape(second)
    return fused
  } catch (error) {
    if (fused && fused !== first && fused !== second) deleteShape(fused)
    throw error
  }
}

async function cutHoneycombGroup(
  shape: Shape3D,
  cutters: Shape3D[],
  context: OpenGridOpenShelfBuildContext,
): Promise<Shape3D> {
  const scope = context.booleanOperations?.createScope(cutters.length, {
    unit: 'cells',
  })
  let result = shape
  try {
    while (cutters.length > 0) {
      assertGenerationCurrent(context)
      const batch = cutters.splice(0, HONEYCOMB_CUT_BATCH_SIZE)
      let compound: Shape3D | null = null
      try {
        compound =
          batch.length === 1
            ? (batch[0] ?? null)
            : makeCompound(batch).asShape3D()
        if (!compound) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
        const activeCompound = compound
        const cut = measureBooleanCountInScope(scope, 'cut', batch.length, () =>
          result.cut(activeCompound),
        )
        if (cut !== result) deleteShape(result)
        result = cut
      } finally {
        batch.forEach(deleteShape)
        if (compound !== batch[0]) deleteShape(compound)
      }
      await yieldAtSafeBoundary(context)
    }
    return result
  } catch (error) {
    if (result !== shape) deleteShape(result)
    throw error
  }
}

async function applyHoneycombMode(
  shape: Shape3D,
  parameters: OpenGridOpenShelfParameters,
  context: OpenGridOpenShelfBuildContext,
): Promise<Shape3D> {
  if (!parameters.honeycombMode) return shape
  let wallCutters: Shape3D[] = []
  let plateCutters: Shape3D[] = []
  try {
    wallCutters = makeOpenGridOpenShelfWallHoneycombCutters(parameters, context)
    shape = await cutHoneycombGroup(shape, wallCutters, context)
    wallCutters = []
    assertGenerationCurrent(context)
    plateCutters = makeOpenGridOpenShelfPlateHoneycombCutters(
      parameters,
      context,
    )
    shape = await cutHoneycombGroup(shape, plateCutters, context)
    plateCutters = []
    return shape
  } catch (error) {
    deleteShape(shape)
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      throw error
    }
    const message = toGeometryError(error).message
    throw new Error(`OPENGRID_OPEN_SHELF_HONEYCOMB_INVALID:${message}`)
  } finally {
    wallCutters.forEach(deleteShape)
    plateCutters.forEach(deleteShape)
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
    throw new Error('OPENGRID_OPEN_SHELF_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function makeProfileExtrusion(
  points: readonly Point2D[],
  xStart: number,
  distance: number,
): Shape3D {
  const sketcher = new Sketcher('YZ', [xStart, 0, 0])
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const firstPoint = points[0]
    if (!firstPoint) throw new Error('OPENGRID_OPEN_SHELF_PROFILE_EMPTY')
    sketcher.movePointerTo(firstPoint)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(distance, { extrusionDirection: [1, 0, 0] })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function readPoint(point: {
  toTuple: () => Point3D
  delete: () => void
}): Point3D {
  try {
    return point.toTuple()
  } finally {
    point.delete()
  }
}

function closeEnough(first: number, second: number, tolerance = 0.08): boolean {
  return Math.abs(first - second) <= tolerance
}

function isTopOuterPerimeterEdge(
  edge: Edge,
  parameters: OpenGridOpenShelfParameters,
): boolean {
  if (edge.geomType !== 'LINE') return false

  const start = readPoint(edge.startPoint)
  const end = readPoint(edge.endPoint)
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  const halfWidth = width / 2
  const yFront = -depth / 2
  const yRear = depth / 2
  const rearZ = openGridOpenShelfTopOuterRearZFor(parameters)
  const widthSpan = Math.abs(start[0] - end[0])
  const depthSpan = Math.abs(start[1] - end[1])

  const isTopRearEdge =
    closeEnough(start[1], yRear) &&
    closeEnough(end[1], yRear) &&
    closeEnough(start[2], rearZ) &&
    closeEnough(end[2], rearZ) &&
    widthSpan > width * 0.5
  const hasTopSideX =
    closeEnough(Math.abs(start[0]), halfWidth) && depthSpan > depth * 0.5

  const isTopSideEdgeForward =
    hasTopSideX &&
    closeEnough(start[0], end[0]) &&
    closeEnough(start[1], yFront) &&
    closeEnough(end[1], yRear) &&
    closeEnough(start[2], parameters.height) &&
    closeEnough(end[2], rearZ)
  const isTopSideEdgeReverse =
    hasTopSideX &&
    closeEnough(start[0], end[0]) &&
    closeEnough(start[1], yRear) &&
    closeEnough(end[1], yFront) &&
    closeEnough(start[2], rearZ) &&
    closeEnough(end[2], parameters.height)
  const isTopSideEdge = isTopSideEdgeForward || isTopSideEdgeReverse

  return isTopRearEdge || isTopSideEdge
}

function roundTopOuterEdges(
  shape: Shape3D,
  parameters: OpenGridOpenShelfParameters,
): Shape3D {
  const rounded = shape.fillet((edge) => {
    if (!isTopOuterPerimeterEdge(edge, parameters)) return null
    return OPENGRID_OPEN_SHELF_CONFIGURATION.topOuterEdgeRadius
  })
  if (rounded !== shape) deleteShape(shape)
  return rounded
}

function slopeNormalFor(angle: number): Point2D {
  const radians = (angle * Math.PI) / 180
  return [Math.sin(radians), Math.cos(radians)]
}

function makeSlopedPlateFromLowerSurface(
  yFront: number,
  yRear: number,
  lowerFrontZ: number,
  lowerRearZ: number,
  thickness: number,
  angle: number,
  xStart: number,
  xDistance: number,
): Shape3D {
  const [normalY, normalZ] = slopeNormalFor(angle)
  const points: Point2D[] = [
    [yFront, lowerFrontZ],
    [yRear, lowerRearZ],
    [yRear + normalY * thickness, lowerRearZ + normalZ * thickness],
    [yFront + normalY * thickness, lowerFrontZ + normalZ * thickness],
  ]
  return makeProfileExtrusion(points, xStart, xDistance)
}

function makeSlopedTopPanel(
  parameters: OpenGridOpenShelfParameters,
  yFront: number,
  yRear: number,
  xStart: number,
  xDistance: number,
): Shape3D {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [normalY, normalZ] = slopeNormalFor(parameters.angle)
  const outerRearZ = openGridOpenShelfTopOuterRearZFor(parameters)
  const lowerFrontY = yFront - normalY * configuration.outerWallThickness
  const lowerRearY = yRear - normalY * configuration.outerWallThickness
  const lowerFrontZ =
    parameters.height - normalZ * configuration.outerWallThickness
  const lowerRearZ = outerRearZ - normalZ * configuration.outerWallThickness
  const points: Point2D[] = [
    [lowerFrontY, lowerFrontZ],
    [lowerRearY, lowerRearZ],
    [yRear, outerRearZ],
    [yFront, parameters.height],
  ]
  return makeProfileExtrusion(points, xStart, xDistance)
}

function makeSideWall(
  parameters: OpenGridOpenShelfParameters,
  yFront: number,
  yRear: number,
  xStart: number,
): Shape3D {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const points: Point2D[] = [
    [yFront, configuration.bottomThickness],
    [yRear, configuration.bottomThickness],
    [yRear, openGridOpenShelfTopOuterRearZFor(parameters)],
    [yFront, parameters.height],
  ]
  return makeProfileExtrusion(points, xStart, configuration.outerWallThickness)
}

function makeVerticalDivider(
  parameters: OpenGridOpenShelfParameters,
  yFront: number,
  yRear: number,
  xStart: number,
): Shape3D {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const points: Point2D[] = [
    [yFront, configuration.bottomThickness],
    [yRear, configuration.bottomThickness],
    [yRear, openGridOpenShelfTopInnerRearZFor(parameters)],
    [yFront, openGridOpenShelfTopInnerFrontZFor(parameters)],
  ]
  return makeProfileExtrusion(points, xStart, configuration.innerPlateThickness)
}

function makeBackboard(
  parameters: OpenGridOpenShelfParameters,
  width: number,
  yRear: number,
): Shape3D {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  return makeBox(
    [
      -width / 2,
      yRear - configuration.backboardThickness,
      configuration.bottomThickness,
    ],
    [width / 2, yRear, openGridOpenShelfTopOuterRearZFor(parameters)],
  )
}

function makePeg(center: Point2D): Shape3D {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  return makeOpenGridIntegratedSeat(center, configuration.pegOverlap)
}

function makeBottomBase(width: number, yFront: number, yRear: number): Shape3D {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const base = makeBox(
    [-width / 2, yFront, 0],
    [width / 2, yRear, configuration.bottomThickness],
  )
  return filletEdgesAtZ(
    base,
    0,
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius,
  )
}

function makeShelf(
  parameters: OpenGridOpenShelfParameters,
  shelfIndex: number,
  yFront: number,
  yRear: number,
  xStart: number,
  xDistance: number,
): Shape3D {
  const [lowerFrontZ, lowerRearZ] = openGridOpenShelfShelfLowerSurfaceZFor(
    parameters,
    shelfIndex,
  )
  return makeSlopedPlateFromLowerSurface(
    yFront,
    yRear,
    lowerFrontZ,
    lowerRearZ,
    OPENGRID_OPEN_SHELF_CONFIGURATION.innerPlateThickness,
    parameters.angle,
    xStart,
    xDistance,
  )
}

function makeAssemblyPieces(
  parameters: OpenGridOpenShelfParameters,
): Shape3D[] {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  const yFront = -depth / 2
  const yRear = depth / 2
  const pieces: Shape3D[] = [
    makeBottomBase(width, yFront, yRear),
    makeSideWall(parameters, yFront, yRear, -width / 2),
    makeSideWall(
      parameters,
      yFront,
      yRear,
      width / 2 - configuration.outerWallThickness,
    ),
    makeBackboard(parameters, width, yRear),
    makeSlopedTopPanel(parameters, yFront, yRear, -width / 2, width),
  ]

  const innerWidth = width - 2 * configuration.outerWallThickness
  const shelfCount = openGridOpenShelfShelfCountFor(parameters)
  for (let shelfIndex = 1; shelfIndex <= shelfCount; shelfIndex += 1) {
    pieces.push(
      makeShelf(
        parameters,
        shelfIndex,
        yFront,
        yRear,
        -innerWidth / 2 - configuration.outerWallThickness,
        innerWidth + 2 * configuration.outerWallThickness,
      ),
    )
  }

  const clearHeights = openGridOpenShelfClearCellHeightsFor(parameters)
  if (clearHeights.regular.rear <= 0) {
    throw new Error('OPENGRID_OPEN_SHELF_REAR_CELL_DEGENERATE')
  }
  for (const dividerCenter of openGridOpenShelfDividerCentersFor(parameters)) {
    pieces.push(
      makeVerticalDivider(
        parameters,
        yFront,
        yRear,
        dividerCenter - configuration.innerPlateThickness / 2,
      ),
    )
  }

  for (const center of openGridOpenShelfPegCentersFor(parameters)) {
    pieces.push(makePeg(center))
  }
  return pieces
}

function clipToContractBounds(
  shape: Shape3D,
  parameters: OpenGridOpenShelfParameters,
): Shape3D {
  const bounds = boundsForOpenGridOpenShelf(parameters)
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  const envelopeSketch = sketchRoundedRectangle(
    width,
    depth,
    OPENGRID_OPEN_SHELF_CONFIGURATION.outerCornerRadius,
    { plane: 'XY', origin: [0, 0, bounds.min[2]] },
  )
  const envelope = envelopeSketch.extrude(bounds.max[2] - bounds.min[2] + 0.05)
  try {
    return shape.intersect(envelope)
  } finally {
    deleteShape(envelopeSketch)
    deleteShape(envelope)
  }
}

export async function buildOpenGridOpenShelf(
  parameters: OpenGridOpenShelfParameters,
  context: OpenGridOpenShelfBuildContext = {},
): Promise<Solid> {
  const validation = validateOpenGridOpenShelfParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  const normalizedParameters = validation.value
  assertGenerationCurrent(context)

  if (normalizedParameters.honeycombMode) {
    const estimatedCells =
      openGridOpenShelfHoneycombCellCountFor(normalizedParameters)
    if (estimatedCells > OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS) {
      throw new Error(
        `OPENGRID_HONEYCOMB_MEMORY_LIMIT:${estimatedCells}:${OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS}`,
      )
    }
  }

  const pieces = makeAssemblyPieces(normalizedParameters)
  const honeycombSteps = normalizedParameters.honeycombMode ? 2 : 0
  const totalSteps = pieces.length + honeycombSteps
  let completed = 0
  let current: Shape3D | null = pieces.shift() ?? null
  try {
    if (!current) throw new Error('OPENGRID_OPEN_SHELF_EMPTY')
    for (const piece of pieces) {
      assertGenerationCurrent(context)
      current = fuseShapes(current, piece)
      completed += 1
      reportProgress(context, completed, totalSteps)
      await yieldAtSafeBoundary(context)
    }
    assertGenerationCurrent(context)
    const rounded = roundTopOuterEdges(current, normalizedParameters)
    current = rounded
    const clipped = clipToContractBounds(current, normalizedParameters)
    if (clipped !== current) deleteShape(current)
    current = clipped
    current = await applyHoneycombMode(current, normalizedParameters, context)
    if (normalizedParameters.honeycombMode) {
      completed += honeycombSteps
      reportProgress(context, completed, totalSteps)
    }
    const result = asSingleSolid(current)
    deleteShape(current)
    current = null
    completed += 1
    reportProgress(context, completed, totalSteps)
    return result
  } finally {
    deleteShape(current)
    for (const piece of pieces) deleteShape(piece)
  }
}
