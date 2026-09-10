import {
  getOC,
  isShape3D,
  makeBox,
  makeCylinder,
  measureVolume,
  Sketcher,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForPillar,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  pillarBodyDiameterForParameters,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
  type PillarDetachableCornerSeatParameters,
  type PillarParameters,
} from '../../../cad-contract/units'
import type { BooleanOperationReporter } from '../../boolean-progress'

const GEOMETRY_TOLERANCE = 0.02
const SLOT_CUTTER_OVERLAP = 0.01

export type PillarBuildContext = {
  detachableCornerSeatReference?: Shape3D
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  booleanOperations?: BooleanOperationReporter
}

type PointOnEdge = {
  z?: number
  delete: () => void
}

type EdgeWithPoints = {
  startPoint: PointOnEdge
  endPoint: PointOnEdge
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the primary geometry error.
  }
}

function deleteUniqueShapes(shapes: readonly Shape3D[]): void {
  const deleted = new Set<Shape3D>()
  for (const shape of shapes) {
    if (deleted.has(shape)) continue
    deleted.add(shape)
    deleteShape(shape)
  }
}

function assertGenerationCurrent(context: PillarBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(context: PillarBuildContext): Promise<void> {
  await context.yieldToEventLoop?.()
}

function edgeIsAtZ(
  edge: EdgeWithPoints,
  station: number,
  tolerance = GEOMETRY_TOLERANCE,
): boolean {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return (
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.z - station) <= tolerance &&
      Math.abs(end.z - station) <= tolerance
    )
  } finally {
    start.delete()
    end.delete()
  }
}

function edgeIsAtAnyStation(
  edge: EdgeWithPoints,
  stations: readonly number[],
): boolean {
  return stations.some((station) => edgeIsAtZ(edge, station))
}

function chamferAtStations(
  shape: Shape3D,
  stations: readonly number[],
  distance: number,
): Shape3D {
  let chamfered: Shape3D | null = null
  try {
    chamfered = shape.chamfer(distance, (finder) =>
      finder.when(({ element }) => edgeIsAtAnyStation(element, stations)),
    )
    if (!isShape3D(chamfered)) {
      throw new Error('PILLAR_CHAMFER_RESULT_NOT_3D')
    }
    return chamfered
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PILLAR_')) {
      throw error
    }
    const stationLabel = stations.join(',')
    throw new Error(`PILLAR_CHAMFER_FAILED:${stationLabel}`, {
      cause: error,
    })
  } finally {
    if (chamfered !== shape) deleteShape(shape)
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
    deleteUniqueShapes(solids)
    throw new Error('PILLAR_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function readBounds(shape: Shape3D): number[][] {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as number[][]
  } finally {
    boundingBox.delete()
  }
}

function assertFiniteShape(shape: Shape3D, parameters: PillarParameters): void {
  const bounds = readBounds(shape)
  const values = bounds.flat()
  if (!values.every(Number.isFinite)) {
    throw new Error('PILLAR_INVALID_BOUNDS')
  }

  const expected = boundsForPillar(parameters)
  const expectedBounds = [expected.min, expected.max]
  const matches = expectedBounds.every((expectedPoint, pointIndex) =>
    expectedPoint.every(
      (coordinate, coordinateIndex) =>
        Math.abs(
          (bounds[pointIndex]?.[coordinateIndex] ?? Number.NaN) - coordinate,
        ) <= GEOMETRY_TOLERANCE,
    ),
  )
  if (!matches) throw new Error('PILLAR_INVALID_BOUNDS')

  const volume = measureVolume(shape)
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new Error('PILLAR_INVALID_VOLUME')
  }
}

function buildPositioningPillar(
  parameters: Extract<PillarParameters, { mode: 'positioning' }>,
): Shape3D {
  const cylinder = makeCylinder(
    pillarBodyDiameterForParameters(parameters) / 2,
    parameters.length,
    [0, 0, 0],
  )
  const lowerChamfered = chamferAtStations(
    cylinder,
    [0],
    PILLAR_CONFIGURATION.positioningLowerChamfer,
  )
  return chamferAtStations(
    lowerChamfered,
    [parameters.length],
    PILLAR_CONFIGURATION.positioningUpperChamfer,
  )
}

function buildSeatIndicatorSlotCutter(): Shape3D {
  // The v13 male carries a 3 mm by 0.5 mm straight slot recessed 0.4 mm into
  // its Z=0 face, centered on the origin along the local X datum.
  const indicator = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.indicator
  const sketcher = new Sketcher('XY', [0, 0, -SLOT_CUTTER_OVERLAP])
  let sketch: ReturnType<Sketcher['close']> | null = null
  let cutter: Shape3D | null = null
  try {
    const halfWidth = indicator.width / 2
    const halfLength = indicator.radialLength / 2
    sketcher.movePointerTo([-halfLength, -halfWidth])
    sketcher.lineTo([halfLength, -halfWidth])
    sketcher.lineTo([halfLength, halfWidth])
    sketcher.lineTo([-halfLength, halfWidth])
    sketch = sketcher.close()
    cutter = sketch.extrude(indicator.depth + SLOT_CUTTER_OVERLAP, {
      extrusionDirection: [0, 0, 1],
    })
    const result = cutter
    cutter = null
    return result
  } catch (error) {
    deleteShape(cutter)
    if (error instanceof Error && error.message.startsWith('PILLAR_')) {
      throw error
    }
    throw new Error('PILLAR_SEAT_INDICATOR_CUTTER_FAILED', { cause: error })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function cutSeatHeadFromReference(reference: Shape3D): Shape3D {
  const male = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male
  const cutterRadius =
    Math.max(
      Math.abs(male.bounds.min[0]),
      Math.abs(male.bounds.max[0]),
      Math.abs(male.bounds.min[1]),
      Math.abs(male.bounds.max[1]),
    ) + 1
  let cutter: Shape3D | null = null
  let cut: Shape3D | null = null
  let head: Shape3D | null = null
  try {
    cutter = makeCylinder(cutterRadius, male.bodyHeight, [0, 0, 0])
    cut = reference.clone().cut(cutter)
    deleteShape(cutter)
    cutter = null
    // The shared contract trims headTopTrim off the head top so the seated
    // male keeps 0.1 mm of clearance below the untouched 1.5 mm pocket roof.
    cutter = makeBox(
      [-cutterRadius, -cutterRadius, male.effectiveTotalHeight],
      [cutterRadius, cutterRadius, male.totalHeight + 1],
    )
    const trimmed = cut.cut(cutter)
    deleteShape(cut)
    cut = trimmed
    const boundingBox = cut.boundingBox
    let headMinZ: number
    let headMaxZ: number
    try {
      headMinZ = boundingBox.bounds[0]?.[2] ?? Number.NaN
      headMaxZ = boundingBox.bounds[1]?.[2] ?? Number.NaN
    } finally {
      boundingBox.delete()
    }
    if (
      !Number.isFinite(headMinZ) ||
      !Number.isFinite(headMaxZ) ||
      Math.abs(headMinZ - male.bodyHeight) > GEOMETRY_TOLERANCE ||
      Math.abs(headMaxZ - male.effectiveTotalHeight) > GEOMETRY_TOLERANCE
    ) {
      throw new Error('PILLAR_SEAT_HEAD_CUT_INVALID')
    }
    head = cut
    cut = null
    return head
  } catch (error) {
    deleteShape(head)
    deleteShape(cut)
    if (error instanceof Error && error.message.startsWith('PILLAR_')) {
      throw error
    }
    throw new Error('PILLAR_SEAT_HEAD_CUT_FAILED', { cause: error })
  } finally {
    deleteShape(cutter)
  }
}

function buildSeatBody(
  parameters: PillarDetachableCornerSeatParameters,
): Shape3D {
  const bodyRadius = pillarBodyDiameterForParameters(parameters) / 2
  let cylinder: Shape3D | null = null
  let chamfered: Shape3D | null = null
  let slotted: Shape3D | null = null
  let cutter: Shape3D | null = null
  try {
    cylinder = makeCylinder(bodyRadius, parameters.length, [0, 0, 0])
    chamfered = chamferAtStations(
      cylinder,
      [0],
      PILLAR_CONFIGURATION.positioningLowerChamfer,
    )
    cylinder = null
    cutter = buildSeatIndicatorSlotCutter()
    slotted = chamfered.cut(cutter)
    deleteShape(chamfered)
    chamfered = null
    return slotted
  } catch (error) {
    deleteShape(slotted)
    deleteShape(chamfered)
    deleteShape(cylinder)
    if (error instanceof Error && error.message.startsWith('PILLAR_')) {
      throw error
    }
    throw new Error('PILLAR_SEAT_BODY_FAILED', { cause: error })
  } finally {
    deleteShape(cutter)
  }
}

function buildDetachableCornerSeatPillar(
  reference: Shape3D,
  parameters: PillarDetachableCornerSeatParameters,
): Shape3D {
  const male = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male
  let head: Shape3D | null = null
  let placedHead: Shape3D | null = null
  let body: Shape3D | null = null
  let fused: Shape3D | null = null
  try {
    head = cutSeatHeadFromReference(reference)
    const headVolume = measureVolume(head)
    body = buildSeatBody(parameters)
    const seatBodyVolume = measureVolume(body)
    const headRise = parameters.length - male.bodyHeight
    placedHead = headRise === 0 ? head : head.translateZ(headRise)
    if (placedHead === head) head = null
    fused = body.fuse(placedHead)
    deleteShape(body)
    body = null
    deleteShape(placedHead)
    placedHead = null
    deleteShape(head)
    head = null
    const fusedVolume = measureVolume(fused)
    const expectedVolume = headVolume + seatBodyVolume
    if (
      !Number.isFinite(fusedVolume) ||
      Math.abs(fusedVolume - expectedVolume) >
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.volumeTolerance
    ) {
      throw new Error('PILLAR_SEAT_FUSE_VOLUME_INVALID')
    }
    const result = fused
    fused = null
    return result
  } catch (error) {
    deleteShape(fused)
    deleteShape(placedHead)
    deleteShape(body)
    deleteShape(head)
    if (error instanceof Error && error.message.startsWith('PILLAR_')) {
      throw error
    }
    throw new Error('PILLAR_SEAT_BUILD_FAILED', { cause: error })
  }
}

export async function buildPillar(
  parameters: PillarParameters,
  context: PillarBuildContext = {},
): Promise<Solid> {
  const validation = validatePillarParameters(parameters)
  if (!validation.valid) throw new Error('PILLAR_PARAMETERS_INVALID')

  assertGenerationCurrent(context)
  await yieldAtSafeBoundary(context)

  let shape: Shape3D | null = null
  let finalSolid: Solid | null = null
  try {
    if (parameters.mode === 'detachable-corner-seat') {
      if (!context.detachableCornerSeatReference) {
        throw new Error('PILLAR_DETACHABLE_CORNER_SEAT_REFERENCE_MISSING')
      }
      shape = buildDetachableCornerSeatPillar(
        context.detachableCornerSeatReference,
        parameters,
      )
    } else if (parameters.mode === 'positioning') {
      shape = buildPositioningPillar(parameters)
    }

    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)

    assertGenerationCurrent(context)
    if (!shape) throw new Error('PILLAR_SHAPE_MISSING')
    finalSolid = asSingleSolid(shape)
    deleteShape(shape)
    shape = null
    assertFiniteShape(finalSolid, parameters)
    return finalSolid
  } catch (error) {
    deleteShape(shape)
    deleteShape(finalSolid)
    throw error
  }
}
