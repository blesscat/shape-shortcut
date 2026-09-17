import {
  drawEllipse,
  getOC,
  makeBox,
  makeCompound,
  makeCylinder,
  Sketcher,
  sketchRectangle,
  sketchRoundedRectangle,
  Solid,
  type Edge,
  type Shape3D,
  type Sketch,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerPolygonPointsFor,
  openGridOpenConnectOrganizerSlotOriginsFor,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  type OpenGridOpenConnectOrganizerLayout,
  validateOpenGridOpenConnectOrganizerParameters,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../../cad-contract/units'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  loadOpenGridOpenConnectShelfLockedSlot,
  placeOpenGridOpenConnectShelfLockedSlot,
} from '../opengrid-openconnect-shelf/slot'

type Point2D = [number, number]

export type OpenGridOpenConnectOrganizerBuildContext = {
  getLockedSlot?: () => Promise<Shape3D>
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

const CAVITY_BOOLEAN_BATCH_SIZE = 16
const SLOT_BOOLEAN_BATCH_SIZE = 16
const CAVITY_TOP_OVERLAP = 0.02
const CAVITY_BOTTOM_OVERLAP = 0.02
const EDGE_COORDINATE_TOLERANCE = 0.02
const FUSION_OVERLAP =
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.fusionOverlap

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function assertGenerationCurrent(
  context: OpenGridOpenConnectOrganizerBuildContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: OpenGridOpenConnectOrganizerBuildContext,
): Promise<void> {
  assertGenerationCurrent(context)
  await context.yieldToEventLoop?.()
  assertGenerationCurrent(context)
}

function reportProgress(
  context: OpenGridOpenConnectOrganizerBuildContext,
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

function replaceOwnedShape(current: Shape3D, replacement: Shape3D): Shape3D {
  if (replacement !== current) deleteShape(current)
  return replacement
}

function edgePointTuple(point: {
  toTuple: () => number[]
  delete: () => void
}): [number, number, number] {
  try {
    return point.toTuple() as [number, number, number]
  } finally {
    point.delete()
  }
}

function edgeCoordinateMatches(first: number, second: number): boolean {
  return Math.abs(first - second) <= EDGE_COORDINATE_TOLERANCE
}

function isFrontVerticalBodyEdge(
  edge: Edge,
  layout: OpenGridOpenConnectOrganizerLayout,
): boolean {
  if (edge.geomType !== 'LINE') return false
  const start = edgePointTuple(edge.startPoint)
  const end = edgePointTuple(edge.endPoint)
  const spansBodyHeight = edgeCoordinateMatches(
    Math.abs(start[2] - end[2]),
    layout.bodyThickness,
  )
  const hasStablePlanPosition =
    edgeCoordinateMatches(start[0], end[0]) &&
    edgeCoordinateMatches(start[1], end[1])
  const isAtBodySide = edgeCoordinateMatches(
    Math.abs(start[0]),
    layout.bodyWidth / 2,
  )
  const isAtBodyFront = edgeCoordinateMatches(start[1], -layout.bodyDepth)
  return (
    spansBodyHeight && hasStablePlanPosition && isAtBodySide && isAtBodyFront
  )
}

function makeRoundedOrganizerBody(
  layout: OpenGridOpenConnectOrganizerLayout,
): Shape3D {
  const body = makeBox(
    [-layout.bodyWidth / 2, -layout.bodyDepth, 0],
    [layout.bodyWidth / 2, 0, layout.bodyThickness],
  )
  try {
    const rounded = body.fillet((edge) =>
      isFrontVerticalBodyEdge(edge, layout) ? layout.frontCornerRadius : null,
    )
    if (rounded !== body) deleteShape(body)
    return rounded
  } catch (error) {
    deleteShape(body)
    throw error
  }
}

export function applyOpenGridOpenConnectOrganizerOwnedTransforms(
  shape: Shape3D,
  transforms: readonly ((current: Shape3D) => Shape3D)[],
): Shape3D {
  let current = shape
  try {
    for (const transform of transforms) {
      current = replaceOwnedShape(current, transform(current))
    }
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  }
}

function polygonCavityCutter(
  parameters: OpenGridOpenConnectOrganizerParameters,
  center: Point2D,
  height: number,
): Shape3D {
  const shape = parameters.holeShape
  if (
    shape !== 'triangle' &&
    shape !== 'square' &&
    shape !== 'pentagon' &&
    shape !== 'hexagon'
  ) {
    throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_POLYGON_EXPECTED')
  }
  const points = openGridOpenConnectOrganizerPolygonPointsFor(
    shape,
    parameters.holeDiameter,
  )
  const startZ =
    parameters.bottomThickness === 0
      ? -CAVITY_BOTTOM_OVERLAP
      : parameters.bottomThickness
  const sketcher = new Sketcher('XY', [center[0], center[1], startZ])
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = points[0]
    if (!first) {
      throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_POLYGON_EMPTY')
    }
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(height, { extrusionDirection: [0, 0, 1] })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function rectangleCavityCutter(
  parameters: OpenGridOpenConnectOrganizerParameters,
  center: Point2D,
  height: number,
): Shape3D {
  const startZ =
    parameters.bottomThickness === 0
      ? -CAVITY_BOTTOM_OVERLAP
      : parameters.bottomThickness
  const { holeWidth, holeHeight } = parameters
  const radius = Math.min(
    parameters.holeCornerRadius,
    holeWidth / 2,
    holeHeight / 2,
  )
  if (radius <= 0) {
    const sketch = sketchRectangle(holeWidth, holeHeight, {
      plane: 'XY',
      origin: [center[0], center[1], startZ],
    })
    try {
      return sketch.extrude(height, { extrusionDirection: [0, 0, 1] })
    } finally {
      deleteShape(sketch)
    }
  }
  if (radius === holeWidth / 2 && radius === holeHeight / 2) {
    return makeCylinder(radius, height, [center[0], center[1], startZ])
  }
  if (radius === holeWidth / 2) {
    // Degenerate straight edges on the X side: replicate the stadium profile
    // with the straights along X, rotated onto Y.
    const sketch = sketchRoundedRectangle(holeHeight, holeWidth, radius, {
      plane: 'XY',
      origin: [0, 0, startZ],
    })
    try {
      const solid = sketch.extrude(height, { extrusionDirection: [0, 0, 1] })
      return solid
        .rotate(90, [0, 0, startZ], [0, 0, 1])
        .translate(center[0], center[1], 0)
    } finally {
      deleteShape(sketch)
    }
  }
  const sketch = sketchRoundedRectangle(holeWidth, holeHeight, radius, {
    plane: 'XY',
    origin: [center[0], center[1], startZ],
  })
  try {
    return sketch.extrude(height, { extrusionDirection: [0, 0, 1] })
  } finally {
    deleteShape(sketch)
  }
}

function ellipseCavityCutter(
  parameters: OpenGridOpenConnectOrganizerParameters,
  center: Point2D,
  height: number,
): Shape3D {
  const startZ =
    parameters.bottomThickness === 0
      ? -CAVITY_BOTTOM_OVERLAP
      : parameters.bottomThickness
  const drawing = drawEllipse(
    parameters.holeWidth / 2,
    parameters.holeHeight / 2,
  )
  const sketch = drawing.sketchOnPlane('XY', [
    center[0],
    center[1],
    startZ,
  ]) as unknown as Sketch
  try {
    return sketch.extrude(height, { extrusionDirection: [0, 0, 1] })
  } finally {
    deleteShape(sketch)
  }
}

function cavityCutterFor(
  parameters: OpenGridOpenConnectOrganizerParameters,
  center: Point2D,
): Shape3D {
  const throughBottomOverlap =
    parameters.bottomThickness === 0 ? CAVITY_BOTTOM_OVERLAP : 0
  const height =
    parameters.holeDepth + CAVITY_TOP_OVERLAP + throughBottomOverlap
  const startZ = parameters.bottomThickness - throughBottomOverlap
  if (parameters.holeShape === 'circle') {
    return makeCylinder(parameters.holeDiameter / 2, height, [
      center[0],
      center[1],
      startZ,
    ])
  }
  if (parameters.holeShape === 'rectangle') {
    return rectangleCavityCutter(parameters, center, height)
  }
  if (parameters.holeShape === 'ellipse') {
    return ellipseCavityCutter(parameters, center, height)
  }
  return polygonCavityCutter(parameters, center, height)
}

export function createOpenGridOpenConnectOrganizerOwnedCavityCutters(
  parameters: OpenGridOpenConnectOrganizerParameters,
  centers: readonly Point2D[],
  factory: (
    parameters: OpenGridOpenConnectOrganizerParameters,
    center: Point2D,
  ) => Shape3D = cavityCutterFor,
): Shape3D[] {
  const cutters: Shape3D[] = []
  try {
    for (const center of centers) cutters.push(factory(parameters, center))
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

async function cutCavities(
  body: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
  context: OpenGridOpenConnectOrganizerBuildContext,
): Promise<Shape3D> {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  const printCenters = layout.cavityCenters.map(
    ([x, y]) => [x, y - layout.bodyDepth / 2] as Point2D,
  )
  let current = body
  try {
    for (
      let start = 0;
      start < printCenters.length;
      start += CAVITY_BOOLEAN_BATCH_SIZE
    ) {
      assertGenerationCurrent(context)
      const cutters = createOpenGridOpenConnectOrganizerOwnedCavityCutters(
        parameters,
        printCenters.slice(start, start + CAVITY_BOOLEAN_BATCH_SIZE),
      )
      let compound: Shape3D | null = null
      try {
        compound =
          cutters.length === 1 ? cutters[0]! : makeCompound(cutters).asShape3D()
        const cut = measureBooleanInScope(
          context.booleanOperations?.createScope(cutters.length),
          'cut',
          () => current.cut(compound!),
        )
        current = replaceOwnedShape(current, cut)
      } finally {
        if (compound && compound !== cutters[0]) deleteShape(compound)
        cutters.forEach(deleteShape)
      }
      await yieldAtSafeBoundary(context)
    }
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  }
}

function makeTransition(
  parameters: OpenGridOpenConnectOrganizerParameters,
): Shape3D {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  const radians = (parameters.tiltAngle * Math.PI) / 180
  const upperY = -layout.bodyThickness * Math.sin(radians)
  const upperZ =
    layout.installedBodyPivotZ + layout.bodyThickness * Math.cos(radians)
  const lowerZ = layout.installedBodyPivotZ
  let plateTopZ = Math.max(upperZ, FUSION_OVERLAP)
  if (parameters.tiltAngle > 0) {
    plateTopZ = layout.rearInterfaceHeight
  }
  const rearThickness =
    OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.rearThickness
  const sketcher = new Sketcher('YZ', [-layout.bodyWidth / 2, 0, 0])
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    sketcher.movePointerTo([0, lowerZ])
    sketcher.lineTo([rearThickness, 0])
    sketcher.lineTo([0, plateTopZ])
    sketcher.lineTo([upperY - FUSION_OVERLAP, upperZ])
    sketch = sketcher.close()
    return sketch.extrude(layout.bodyWidth, {
      extrusionDirection: [1, 0, 0],
    })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

export function fuseOpenGridOpenConnectOrganizerOwnedShapes(
  first: Shape3D,
  second: Shape3D,
  reporter: BooleanOperationReporter | undefined,
  fuse: (first: Shape3D, second: Shape3D) => Shape3D = (first, second) =>
    first.fuse(second),
): Shape3D {
  let result: Shape3D | null = null
  try {
    result = measureBooleanInScope(reporter?.createScope(1), 'fuse', () =>
      fuse(first, second),
    )
    if (result !== first) deleteShape(first)
    if (result !== second) deleteShape(second)
    return result
  } catch (error) {
    if (result && result !== first && result !== second) deleteShape(result)
    if (second !== first) deleteShape(second)
    throw error
  }
}

function placeBodyInInstalledCoordinates(
  body: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
): Shape3D {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  return applyOpenGridOpenConnectOrganizerOwnedTransforms(body, [
    (current) => current.rotate(parameters.tiltAngle, [0, 0, 0], [1, 0, 0]),
    (current) => current.translate(0, 0, layout.installedBodyPivotZ),
  ])
}

async function cutLockedSlots(
  body: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
  context: OpenGridOpenConnectOrganizerBuildContext,
): Promise<Shape3D> {
  const ownsSource = !context.getLockedSlot
  const source = context.getLockedSlot
    ? await context.getLockedSlot()
    : await loadOpenGridOpenConnectShelfLockedSlot()
  const origins = openGridOpenConnectOrganizerSlotOriginsFor(parameters)
  let current = body
  try {
    for (
      let start = 0;
      start < origins.length;
      start += SLOT_BOOLEAN_BATCH_SIZE
    ) {
      assertGenerationCurrent(context)
      const cutters: Shape3D[] = []
      let compound: Shape3D | null = null
      try {
        for (const origin of origins.slice(
          start,
          start + SLOT_BOOLEAN_BATCH_SIZE,
        )) {
          cutters.push(placeOpenGridOpenConnectShelfLockedSlot(source, origin))
        }
        compound =
          cutters.length === 1 ? cutters[0]! : makeCompound(cutters).asShape3D()
        const cut = measureBooleanInScope(
          context.booleanOperations?.createScope(cutters.length),
          'cut',
          () => current.cut(compound!),
        )
        current = replaceOwnedShape(current, cut)
      } finally {
        if (compound && compound !== cutters[0]) deleteShape(compound)
        cutters.forEach(deleteShape)
      }
      await yieldAtSafeBoundary(context)
    }
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  } finally {
    if (ownsSource) deleteShape(source)
  }
}

function orientForPrint(
  shape: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
): Shape3D {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  return applyOpenGridOpenConnectOrganizerOwnedTransforms(shape, [
    (current) => current.translate(0, 0, -layout.installedBodyPivotZ),
    (current) => current.rotate(-parameters.tiltAngle, [0, 0, 0], [1, 0, 0]),
  ])
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
  } catch (error) {
    solids.forEach(deleteShape)
    throw error
  } finally {
    explorer.delete()
  }
  if (solids.length !== 1) {
    solids.forEach(deleteShape)
    throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_NOT_SINGLE_SOLID')
  }
  return solids[0]!
}

export async function buildOpenGridOpenConnectOrganizer(
  parameters: OpenGridOpenConnectOrganizerParameters,
  context: OpenGridOpenConnectOrganizerBuildContext = {},
): Promise<Solid> {
  const validation = validateOpenGridOpenConnectOrganizerParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  const normalized = validation.value
  const layout = openGridOpenConnectOrganizerLayoutFor(normalized)
  assertGenerationCurrent(context)

  const cavityBatches = Math.ceil(
    layout.cavityCenters.length / CAVITY_BOOLEAN_BATCH_SIZE,
  )
  const totalSteps = cavityBatches + 6
  let completed = 0
  let current: Shape3D | null = makeRoundedOrganizerBody(layout)
  try {
    current = await cutCavities(current, normalized, context)
    completed += cavityBatches
    reportProgress(context, completed, totalSteps)

    current = placeBodyInInstalledCoordinates(current, normalized)
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
    const rearInterface = makeBox(
      [-layout.rearInterfaceWidth / 2, 0, 0],
      [
        layout.rearInterfaceWidth / 2,
        configuration.rearThickness,
        layout.rearInterfaceHeight,
      ],
    )
    current = fuseOpenGridOpenConnectOrganizerOwnedShapes(
      current,
      rearInterface,
      context.booleanOperations,
    )
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    current = fuseOpenGridOpenConnectOrganizerOwnedShapes(
      current,
      makeTransition(normalized),
      context.booleanOperations,
    )
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    current = await cutLockedSlots(current, normalized, context)
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    current = orientForPrint(current, normalized)
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
  }
}
