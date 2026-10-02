import { getOC, makeCompound, Sketcher, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  openGridOpenConnectShelfAngleRadiansFor,
  openGridOpenConnectShelfDepthFor,
  openGridOpenConnectShelfFrontHeightFor,
  openGridOpenConnectShelfRearHeightFor,
  openGridOpenConnectShelfSlotOriginsFor,
  openGridOpenConnectShelfWidthFor,
  OPENGRID_CONFIGURATION,
  OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  validateOpenGridOpenConnectShelfParameters,
  type OpenGridOpenConnectShelfParameters,
  type OpenGridParameters,
} from '../../../cad-contract/units'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  buildOpenGridBRep,
  type OpenGridBuildContext,
} from '../opengrid/builder'
import {
  loadOpenGridOpenConnectShelfLockedSlot,
  placeOpenGridOpenConnectShelfLockedSlot,
} from './slot'
import { deleteShape } from '../../lifetime/dispose'

type Point2D = [number, number]

export type OpenGridOpenConnectShelfBuildContext = Omit<
  OpenGridBuildContext,
  'reportProgress'
> & {
  getLockedSlot?: () => Promise<Shape3D>
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'steps'
  }) => void
}

const FUSION_OVERLAP = 0.05

function assertGenerationCurrent(
  context: OpenGridOpenConnectShelfBuildContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: OpenGridOpenConnectShelfBuildContext,
): Promise<void> {
  assertGenerationCurrent(context)
  await context.yieldToEventLoop?.()
  assertGenerationCurrent(context)
}

function reportProgress(
  context: OpenGridOpenConnectShelfBuildContext,
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

export function openGridParametersForOpenConnectShelf(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'columns' | 'rows'>,
): OpenGridParameters {
  const defaults = OPENGRID_CONFIGURATION.defaultParameters
  return {
    ...defaults,
    variant: 'Full',
    rows: parameters.rows,
    columns: parameters.columns,
    halfCellX: 'none',
    halfCellY: 'none',
    targetWidth: 0,
    targetDepth: 0,
    fitToTarget: false,
    targetFrameShape: 'none',
    targetFrameSides: { ...defaults.targetFrameSides },
    chamfers: 'none',
    chamferCorners: { ...defaults.chamferCorners },
    connectorHoles: 'none',
    connectorSides: { ...defaults.connectorSides },
    screwKind: 'official-default',
    screwMode: 'none',
    screwCenter: false,
  }
}

function openGridContextForShelf(
  context: OpenGridOpenConnectShelfBuildContext,
): OpenGridBuildContext {
  const {
    getLockedSlot: _getLockedSlot,
    reportProgress: _progress,
    ...shared
  } = context
  return shared
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
    if (!firstPoint) {
      throw new Error('OPENGRID_OPENCONNECT_SHELF_PROFILE_EMPTY')
    }
    sketcher.movePointerTo(firstPoint)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(distance, { extrusionDirection: [1, 0, 0] })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function makeRearPlate(
  parameters: OpenGridOpenConnectShelfParameters,
): Shape3D {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const width = openGridOpenConnectShelfWidthFor(parameters)
  const rearHeight = openGridOpenConnectShelfRearHeightFor(parameters)
  const overlapBottomZ =
    FUSION_OVERLAP *
    Math.tan(openGridOpenConnectShelfAngleRadiansFor(parameters.angle))
  return makeProfileExtrusion(
    [
      [-FUSION_OVERLAP, overlapBottomZ],
      [0, 0],
      [configuration.rearThickness, 0],
      [configuration.rearThickness, rearHeight],
      [-FUSION_OVERLAP, rearHeight],
    ],
    -width / 2,
    width,
  )
}

function makeLongitudinalRib(
  parameters: OpenGridOpenConnectShelfParameters,
  xStart: number,
): Shape3D {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  const rearHeight = openGridOpenConnectShelfRearHeightFor(parameters)
  const boardBottom = rearHeight - configuration.fullThickness
  const frontUndersideZ =
    rearHeight - openGridOpenConnectShelfFrontHeightFor(parameters)
  return makeProfileExtrusion(
    [
      [-depth, frontUndersideZ],
      [0, 0],
      [0, boardBottom + FUSION_OVERLAP],
      [-depth, boardBottom + FUSION_OVERLAP],
    ],
    xStart,
    configuration.supportThickness,
  )
}

function makeTransverseRib(
  parameters: OpenGridOpenConnectShelfParameters,
  boundaryY: number,
): Shape3D {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const width = openGridOpenConnectShelfWidthFor(parameters)
  const halfThickness = configuration.supportThickness / 2
  const yStart = boundaryY - halfThickness
  const yEnd = boundaryY + halfThickness
  const slope = Math.tan(
    openGridOpenConnectShelfAngleRadiansFor(parameters.angle),
  )
  const rearHeight = openGridOpenConnectShelfRearHeightFor(parameters)
  const boardBottom = rearHeight - configuration.fullThickness
  const bottomZFor = (y: number): number => -y * slope
  return makeProfileExtrusion(
    [
      [yStart, bottomZFor(yStart)],
      [yEnd, bottomZFor(yEnd)],
      [yEnd, boardBottom + FUSION_OVERLAP],
      [yStart, boardBottom + FUSION_OVERLAP],
    ],
    -width / 2,
    width,
  )
}

function makeSupportPieces(
  parameters: OpenGridOpenConnectShelfParameters,
): Shape3D[] {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const width = openGridOpenConnectShelfWidthFor(parameters)
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  const pieces: Shape3D[] = [makeRearPlate(parameters)]
  const longitudinalRibStarts = [
    -width / 2,
    ...Array.from(
      { length: Math.max(0, parameters.columns - 1) },
      (_, index) =>
        -width / 2 +
        (index + 1) * configuration.gridPitch -
        configuration.supportThickness / 2,
    ),
    width / 2 - configuration.supportThickness,
  ]
  for (const xStart of longitudinalRibStarts) {
    pieces.push(makeLongitudinalRib(parameters, xStart))
  }
  for (let rowBoundary = 1; rowBoundary < parameters.rows; rowBoundary += 1) {
    pieces.push(
      makeTransverseRib(parameters, -rowBoundary * configuration.gridPitch),
    )
  }
  pieces.push(
    makeTransverseRib(parameters, -depth + configuration.supportThickness / 2),
  )
  return pieces
}

function fuseOwnedShapes(
  first: Shape3D,
  second: Shape3D,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  let result: Shape3D | null = null
  try {
    result = measureBooleanInScope(reporter?.createScope(1), 'fuse', () =>
      first.fuse(second),
    )
    if (result !== first) deleteShape(first)
    if (result !== second) deleteShape(second)
    return result
  } catch (error) {
    if (result && result !== first && result !== second) deleteShape(result)
    throw error
  }
}

async function cutLockedSlots(
  body: Shape3D,
  parameters: OpenGridOpenConnectShelfParameters,
  context: OpenGridOpenConnectShelfBuildContext,
): Promise<Shape3D> {
  const ownsSource = !context.getLockedSlot
  const source = context.getLockedSlot
    ? await context.getLockedSlot()
    : await loadOpenGridOpenConnectShelfLockedSlot()
  const cutters: Shape3D[] = []
  let compound: Shape3D | null = null
  let result: Shape3D | null = null
  try {
    for (const origin of openGridOpenConnectShelfSlotOriginsFor(parameters)) {
      assertGenerationCurrent(context)
      cutters.push(placeOpenGridOpenConnectShelfLockedSlot(source, origin))
    }
    compound =
      cutters.length === 1 ? cutters[0]! : makeCompound(cutters).asShape3D()
    result = measureBooleanInScope(
      context.booleanOperations?.createScope(1),
      'cut',
      () => body.cut(compound!),
    )
    if (result !== body) deleteShape(body)
    return result
  } catch (error) {
    if (result && result !== body) deleteShape(result)
    throw error
  } finally {
    if (compound && compound !== cutters[0]) deleteShape(compound)
    cutters.forEach(deleteShape)
    if (ownsSource) deleteShape(source)
  }
}

function orientForPrint(shape: Shape3D, angle: number): Shape3D {
  const oriented = shape.rotate(angle, [0, 0, 0], [1, 0, 0])
  if (oriented !== shape) deleteShape(shape)
  return oriented
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
    solids.forEach(deleteShape)
    throw new Error('OPENGRID_OPENCONNECT_SHELF_NOT_SINGLE_SOLID')
  }
  return solids[0]!
}

export async function buildOpenGridOpenConnectShelf(
  parameters: OpenGridOpenConnectShelfParameters,
  context: OpenGridOpenConnectShelfBuildContext = {},
): Promise<Solid> {
  const validation = validateOpenGridOpenConnectShelfParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  const normalized = validation.value
  assertGenerationCurrent(context)

  const supportPieces = makeSupportPieces(normalized)
  const totalSteps = supportPieces.length + 4
  let completed = 0
  let current: Shape3D | null = null
  let nextPieceIndex = 0
  try {
    current = await buildOpenGridBRep(
      openGridParametersForOpenConnectShelf(normalized),
      openGridContextForShelf(context),
    )
    const depth = openGridOpenConnectShelfDepthFor(normalized)
    const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    const rearHeight = openGridOpenConnectShelfRearHeightFor(normalized)
    const placedBoard = current.translate(
      0,
      -depth / 2,
      rearHeight - configuration.fullThickness,
    )
    if (placedBoard !== current) deleteShape(current)
    current = placedBoard
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    for (; nextPieceIndex < supportPieces.length; nextPieceIndex += 1) {
      assertGenerationCurrent(context)
      const piece = supportPieces[nextPieceIndex]!
      current = fuseOwnedShapes(current, piece, context.booleanOperations)
      completed += 1
      reportProgress(context, completed, totalSteps)
      await yieldAtSafeBoundary(context)
    }

    current = await cutLockedSlots(current, normalized, context)
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    current = orientForPrint(current, normalized.angle)
    completed += 1
    reportProgress(context, completed, totalSteps)
    assertGenerationCurrent(context)

    const result = asSingleSolid(current)
    deleteShape(current)
    current = null
    completed += 1
    reportProgress(context, completed, totalSteps)
    return result
  } finally {
    deleteShape(current)
    for (let index = nextPieceIndex; index < supportPieces.length; index += 1) {
      deleteShape(supportPieces[index])
    }
  }
}
