import {
  CompoundSketch,
  makeBox,
  makeCompound,
  makeCylinder,
  Sketcher,
  type Sketch,
  type Shape3D,
} from 'replicad'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../boolean-progress'
import {
  nominalOpenGridStackableBoxFootprintFor,
  openGridOpenShelfAngleRadiansFor,
  openGridOpenShelfDividerCentersFor,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfPegCentersFor,
  openGridOpenShelfShelfCountFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  openGridOpenShelfTopOuterRearZFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableBoxActiveUpperInnerRimZFor,
  openGridStackableBoxDerivedGeometryFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderHoleCentersFor,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  type OpenGridStackableBoxOpeningDirection,
  type OpenGridStackableBoxParameters,
  type OpenGridOpenShelfParameters,
  type OpenGridStackableCylinderOpeningDirection,
  type OpenGridStackableCylinderParameters,
} from '../../cad-contract/units'

type Plane = 'XY' | 'YZ' | 'XZ'
type Point2D = [number, number]
type BoxSide = OpenGridStackableBoxOpeningDirection
type HoneycombLattice = Readonly<{
  anchorPitch: number
  rowPitch: number
  cellRadius: number
}>
type Rectangle2D = Readonly<{
  minimumU: number
  maximumU: number
  minimumV: number
  maximumV: number
}>

const EPSILON = 0.0001
const BOX_BOTTOM_CLIP_BATCH_SIZE = 128

export type OpenGridHoneycombBuildContext = {
  isGenerationCurrent?: () => boolean
  booleanOperations?: BooleanOperationReporter
}

function assertHoneycombGenerationCurrent(
  context: OpenGridHoneycombBuildContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function hexagonPoints(center: Point2D, lattice: HoneycombLattice): Point2D[] {
  const points: Point2D[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 6 + (Math.PI / 3) * index
    points.push([
      center[0] + lattice.cellRadius * Math.cos(angle),
      center[1] + lattice.cellRadius * Math.sin(angle),
    ])
  }
  return points
}

function extrudePolygon(
  plane: Plane,
  origin: [number, number, number],
  points: readonly Point2D[],
  distance: number,
  direction?: [number, number, number],
): Shape3D {
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = points[0]
    if (!first) throw new Error('OPENGRID_HONEYCOMB_PROFILE_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    if (direction) {
      return sketch.extrude(distance, { extrusionDirection: direction })
    }
    return sketch.extrude(distance)
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function sketchPolygon(
  plane: Plane,
  origin: [number, number, number],
  points: readonly Point2D[],
): Sketch {
  const sketcher = new Sketcher(plane, origin)
  try {
    const first = points[0]
    if (!first) throw new Error('OPENGRID_HONEYCOMB_PROFILE_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    return sketcher.close()
  } finally {
    sketcher.delete()
  }
}

function rectanglePoints(bounds: Rectangle2D): Point2D[] {
  return [
    [bounds.minimumU, bounds.minimumV],
    [bounds.maximumU, bounds.minimumV],
    [bounds.maximumU, bounds.maximumV],
    [bounds.minimumU, bounds.maximumV],
  ]
}

function boundsForPolygons(
  polygons: readonly (readonly Point2D[])[],
): Rectangle2D {
  const points = polygons.flatMap((polygon) => polygon)
  if (points.length === 0) {
    throw new Error('OPENGRID_HONEYCOMB_PROFILE_EMPTY')
  }
  return {
    minimumU: Math.min(...points.map((point) => point[0])),
    maximumU: Math.max(...points.map((point) => point[0])),
    minimumV: Math.min(...points.map((point) => point[1])),
    maximumV: Math.max(...points.map((point) => point[1])),
  }
}

function crossProduct(first: Point2D, second: Point2D, third: Point2D): number {
  return (
    (second[0] - first[0]) * (third[1] - first[1]) -
    (second[1] - first[1]) * (third[0] - first[0])
  )
}

function pointOnSegment(point: Point2D, start: Point2D, end: Point2D): boolean {
  return (
    Math.abs(crossProduct(start, end, point)) <= EPSILON &&
    point[0] >= Math.min(start[0], end[0]) - EPSILON &&
    point[0] <= Math.max(start[0], end[0]) + EPSILON &&
    point[1] >= Math.min(start[1], end[1]) - EPSILON &&
    point[1] <= Math.max(start[1], end[1]) + EPSILON
  )
}

function segmentsIntersectOrTouch(
  firstStart: Point2D,
  firstEnd: Point2D,
  secondStart: Point2D,
  secondEnd: Point2D,
): boolean {
  const firstStartSide = crossProduct(firstStart, firstEnd, secondStart)
  const firstEndSide = crossProduct(firstStart, firstEnd, secondEnd)
  const secondStartSide = crossProduct(secondStart, secondEnd, firstStart)
  const secondEndSide = crossProduct(secondStart, secondEnd, firstEnd)
  const properIntersection =
    ((firstStartSide > EPSILON && firstEndSide < -EPSILON) ||
      (firstStartSide < -EPSILON && firstEndSide > EPSILON)) &&
    ((secondStartSide > EPSILON && secondEndSide < -EPSILON) ||
      (secondStartSide < -EPSILON && secondEndSide > EPSILON))
  return (
    properIntersection ||
    pointOnSegment(secondStart, firstStart, firstEnd) ||
    pointOnSegment(secondEnd, firstStart, firstEnd) ||
    pointOnSegment(firstStart, secondStart, secondEnd) ||
    pointOnSegment(firstEnd, secondStart, secondEnd)
  )
}

function polygonsOverlapOrTouch(
  first: readonly Point2D[],
  second: readonly Point2D[],
): boolean {
  const firstBounds = polygonBounds(first)
  const secondBounds = polygonBounds(second)
  if (
    firstBounds.maximumU < secondBounds.minimumU - EPSILON ||
    secondBounds.maximumU < firstBounds.minimumU - EPSILON ||
    firstBounds.maximumV < secondBounds.minimumV - EPSILON ||
    secondBounds.maximumV < firstBounds.minimumV - EPSILON
  ) {
    return false
  }
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const firstStart = first[firstIndex]!
    const firstEnd = first[(firstIndex + 1) % first.length]!
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const secondStart = second[secondIndex]!
      const secondEnd = second[(secondIndex + 1) % second.length]!
      if (
        segmentsIntersectOrTouch(firstStart, firstEnd, secondStart, secondEnd)
      ) {
        return true
      }
    }
  }
  return (
    pointIsInsidePolygon(first[0]!, second) ||
    pointIsInsidePolygon(second[0]!, first)
  )
}

function assertPanelProfile(
  outer: readonly Point2D[],
  holes: readonly Point2D[][],
): void {
  if (outer.length < 3 || polygonArea(outer) <= EPSILON) {
    throw new Error('OPENGRID_HONEYCOMB_PROFILE_INVALID_OUTER')
  }
  const outerBounds = polygonBounds(outer)
  for (const hole of holes) {
    if (
      hole.length < 3 ||
      polygonArea(hole) <= EPSILON ||
      hole.some(
        (point) =>
          point[0] <= outerBounds.minimumU + EPSILON ||
          point[0] >= outerBounds.maximumU - EPSILON ||
          point[1] <= outerBounds.minimumV + EPSILON ||
          point[1] >= outerBounds.maximumV - EPSILON ||
          !pointIsInsidePolygon(point, outer),
      )
    ) {
      throw new Error('OPENGRID_HONEYCOMB_PROFILE_INVALID_WIRE')
    }
  }
  for (let firstIndex = 0; firstIndex < holes.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < holes.length;
      secondIndex += 1
    ) {
      if (polygonsOverlapOrTouch(holes[firstIndex]!, holes[secondIndex]!)) {
        throw new Error('OPENGRID_HONEYCOMB_PROFILE_OVERLAPPING_WIRES')
      }
    }
  }
}

function extrudePolygonWithHoles(
  plane: Plane,
  origin: [number, number, number],
  outer: readonly Point2D[],
  holes: readonly (readonly Point2D[])[],
  distance: number,
  direction: [number, number, number],
): Shape3D {
  const sketches: Sketch[] = []
  let compound: CompoundSketch | null = null
  try {
    assertPanelProfile(
      outer,
      holes.map((hole) => [...hole]),
    )
    sketches.push(sketchPolygon(plane, origin, outer))
    for (const hole of holes) {
      sketches.push(sketchPolygon(plane, origin, hole))
    }
    if (sketches.length === 1) {
      const sketch = sketches[0]
      if (!sketch) throw new Error('OPENGRID_HONEYCOMB_PROFILE_EMPTY')
      const result = sketch.extrude(distance, {
        extrusionDirection: direction,
      })
      sketches.length = 0
      return result
    }
    compound = new CompoundSketch(sketches)
    const result = compound.extrude(distance, {
      extrusionDirection: direction,
    })
    return result
  } catch (error) {
    if (compound === null) sketches.forEach(deleteShape)
    throw error
  } finally {
    compound?.delete()
  }
}

function extrudePolygonGroup(
  plane: Plane,
  origin: [number, number, number],
  polygons: readonly (readonly Point2D[])[],
  distance: number,
  direction?: [number, number, number],
): Shape3D {
  const parts: Shape3D[] = []
  try {
    for (const polygon of polygons) {
      parts.push(extrudePolygon(plane, origin, polygon, distance, direction))
    }
    if (parts.length === 0) {
      throw new Error('OPENGRID_HONEYCOMB_PROFILE_EMPTY')
    }
    if (parts.length === 1) return parts.pop()!
    return makeCompound(parts).asShape3D()
  } finally {
    parts.forEach(deleteShape)
  }
}

function latticeCenters(
  spanU: number,
  spanV: number,
  frameU: number,
  frameV: number,
  lattice: HoneycombLattice,
): Point2D[] {
  const horizontalCellExtent = (Math.sqrt(3) * lattice.cellRadius) / 2
  const minimumU = -spanU / 2 + frameU + horizontalCellExtent
  const maximumU = spanU / 2 - frameU - horizontalCellExtent
  const minimumV = -spanV / 2 + frameV + lattice.cellRadius
  const maximumV = spanV / 2 - frameV - lattice.cellRadius
  if (maximumU < minimumU || maximumV < minimumV) return []

  const centers: Point2D[] = []
  const availableRowSpan = maximumV - minimumV
  const rowCount =
    Math.floor((availableRowSpan + EPSILON) / lattice.rowPitch) + 1
  const usedRowSpan = (rowCount - 1) * lattice.rowPitch
  const firstRowV = (minimumV + maximumV - usedRowSpan) / 2
  for (let row = 0; row < rowCount; row += 1) {
    const offset = row % 2 === 0 ? 0 : lattice.anchorPitch / 2
    const firstColumn = Math.ceil(
      (minimumU - offset - EPSILON) / lattice.anchorPitch,
    )
    const lastColumn = Math.floor(
      (maximumU - offset + EPSILON) / lattice.anchorPitch,
    )
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      centers.push([
        column * lattice.anchorPitch + offset,
        firstRowV + row * lattice.rowPitch,
      ])
    }
  }
  return centers
}

function boundaryOverlappingLatticeCenters(
  spanU: number,
  spanV: number,
  frameU: number,
  frameV: number,
  lattice: HoneycombLattice,
): Point2D[] {
  const horizontalCellExtent = (Math.sqrt(3) * lattice.cellRadius) / 2
  return latticeCenters(
    spanU + horizontalCellExtent * 4,
    spanV + lattice.cellRadius * 4,
    frameU,
    frameV,
    lattice,
  )
}

function sideBoundaryOverlappingLatticeCenters(
  spanU: number,
  spanV: number,
  lattice: HoneycombLattice,
): Point2D[] {
  const horizontalCellExtent = (Math.sqrt(3) * lattice.cellRadius) / 2
  const minimumU = -spanU / 2 - horizontalCellExtent + EPSILON
  const maximumU = spanU / 2 + horizontalCellExtent - EPSILON
  const availableRowSpan = Math.max(0, spanV - lattice.cellRadius * 2)
  const rowCount =
    Math.ceil((availableRowSpan + EPSILON) / lattice.rowPitch) + 1
  const firstRowV = -((rowCount - 1) * lattice.rowPitch) / 2
  const centers: Point2D[] = []

  for (let row = 0; row < rowCount; row += 1) {
    const offset = row % 2 === 0 ? 0 : lattice.anchorPitch / 2
    const firstColumn = Math.ceil(
      (minimumU - offset - EPSILON) / lattice.anchorPitch,
    )
    const lastColumn = Math.floor(
      (maximumU - offset + EPSILON) / lattice.anchorPitch,
    )
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      centers.push([
        column * lattice.anchorPitch + offset,
        firstRowV + row * lattice.rowPitch,
      ])
    }
  }
  return centers
}

function clipPolygonToAxisBoundary(
  points: readonly Point2D[],
  axis: 0 | 1,
  limit: number,
  keepGreaterValues: boolean,
): Point2D[] {
  if (points.length === 0) return []

  const clipped: Point2D[] = []
  let previous = points.at(-1)!
  let previousInside = keepGreaterValues
    ? previous[axis] >= limit - EPSILON
    : previous[axis] <= limit + EPSILON

  for (const current of points) {
    const currentInside = keepGreaterValues
      ? current[axis] >= limit - EPSILON
      : current[axis] <= limit + EPSILON
    if (currentInside !== previousInside) {
      const delta = current[axis] - previous[axis]
      const ratio =
        Math.abs(delta) <= EPSILON ? 0 : (limit - previous[axis]) / delta
      clipped.push([
        previous[0] + (current[0] - previous[0]) * ratio,
        previous[1] + (current[1] - previous[1]) * ratio,
      ])
    }
    if (currentInside) clipped.push(current)
    previous = current
    previousInside = currentInside
  }
  return clipped
}

function clipPolygonToRectangle(
  points: readonly Point2D[],
  minimumU: number,
  maximumU: number,
  minimumV: number,
  maximumV: number,
): Point2D[] {
  let clipped = clipPolygonToAxisBoundary(points, 0, minimumU, true)
  clipped = clipPolygonToAxisBoundary(clipped, 0, maximumU, false)
  clipped = clipPolygonToAxisBoundary(clipped, 1, minimumV, true)
  return clipPolygonToAxisBoundary(clipped, 1, maximumV, false)
}

function clipPolygonToBounds(
  points: readonly Point2D[],
  bounds: Rectangle2D,
): Point2D[] {
  return clipPolygonToRectangle(
    points,
    bounds.minimumU,
    bounds.maximumU,
    bounds.minimumV,
    bounds.maximumV,
  )
}

function signedPolygonArea(points: readonly Point2D[]): number {
  let doubledArea = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    doubledArea += current[0] * next[1] - next[0] * current[1]
  }
  return doubledArea / 2
}

function edgeCrossProduct(
  edgeStart: Point2D,
  edgeEnd: Point2D,
  point: Point2D,
): number {
  return (
    (edgeEnd[0] - edgeStart[0]) * (point[1] - edgeStart[1]) -
    (edgeEnd[1] - edgeStart[1]) * (point[0] - edgeStart[0])
  )
}

function segmentLineIntersection(
  segmentStart: Point2D,
  segmentEnd: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D,
): Point2D {
  const segmentX = segmentEnd[0] - segmentStart[0]
  const segmentY = segmentEnd[1] - segmentStart[1]
  const lineX = lineEnd[0] - lineStart[0]
  const lineY = lineEnd[1] - lineStart[1]
  const denominator = segmentX * lineY - segmentY * lineX
  if (Math.abs(denominator) <= EPSILON) return [...segmentEnd]

  const startDeltaX = lineStart[0] - segmentStart[0]
  const startDeltaY = lineStart[1] - segmentStart[1]
  const ratio = (startDeltaX * lineY - startDeltaY * lineX) / denominator
  return [
    segmentStart[0] + segmentX * ratio,
    segmentStart[1] + segmentY * ratio,
  ]
}

function clipPolygonToConvexPolygon(
  points: readonly Point2D[],
  boundary: readonly Point2D[],
): Point2D[] {
  if (points.length === 0 || boundary.length < 3) return []
  const orientation = signedPolygonArea(boundary) >= 0 ? 1 : -1
  let clipped = [...points]

  for (let edgeIndex = 0; edgeIndex < boundary.length; edgeIndex += 1) {
    if (clipped.length === 0) break
    const edgeStart = boundary[edgeIndex]!
    const edgeEnd = boundary[(edgeIndex + 1) % boundary.length]!
    const input = clipped
    clipped = []
    let previous = input.at(-1)!
    let previousInside =
      orientation * edgeCrossProduct(edgeStart, edgeEnd, previous) >= -EPSILON

    for (const current of input) {
      const currentInside =
        orientation * edgeCrossProduct(edgeStart, edgeEnd, current) >= -EPSILON
      if (currentInside !== previousInside) {
        clipped.push(
          segmentLineIntersection(previous, current, edgeStart, edgeEnd),
        )
      }
      if (currentInside) clipped.push(current)
      previous = current
      previousInside = currentInside
    }
  }
  return clipped
}

function polygonArea(points: readonly Point2D[]): number {
  return Math.abs(signedPolygonArea(points))
}

function polygonBounds(points: readonly Point2D[]): Rectangle2D {
  const uCoordinates = points.map((point) => point[0])
  const vCoordinates = points.map((point) => point[1])
  return {
    minimumU: Math.min(...uCoordinates),
    maximumU: Math.max(...uCoordinates),
    minimumV: Math.min(...vCoordinates),
    maximumV: Math.max(...vCoordinates),
  }
}

function rectangleIntersectsPolygon(
  rectangle: Rectangle2D,
  polygon: readonly Point2D[],
): boolean {
  const bounds = polygonBounds(polygon)
  return (
    bounds.minimumU < rectangle.maximumU - EPSILON &&
    bounds.maximumU > rectangle.minimumU + EPSILON &&
    bounds.minimumV < rectangle.maximumV - EPSILON &&
    bounds.maximumV > rectangle.minimumV + EPSILON
  )
}

function polygonIsInsideRectangle(
  polygon: readonly Point2D[],
  rectangle: Rectangle2D,
): boolean {
  return polygon.every(
    ([u, v]) =>
      u >= rectangle.minimumU - EPSILON &&
      u <= rectangle.maximumU + EPSILON &&
      v >= rectangle.minimumV - EPSILON &&
      v <= rectangle.maximumV + EPSILON,
  )
}

function nonEmptyPolygons(
  polygons: readonly (readonly Point2D[])[],
): Point2D[][] {
  return polygons
    .filter((polygon) => polygon.length >= 3 && polygonArea(polygon) > EPSILON)
    .map((polygon) => [...polygon])
}

function subtractRectangleFromPolygon(
  polygon: readonly Point2D[],
  rectangle: Rectangle2D,
): Point2D[][] {
  if (!rectangleIntersectsPolygon(rectangle, polygon)) return [[...polygon]]

  const left = clipPolygonToAxisBoundary(polygon, 0, rectangle.minimumU, false)
  const right = clipPolygonToAxisBoundary(polygon, 0, rectangle.maximumU, true)
  let middle = clipPolygonToAxisBoundary(polygon, 0, rectangle.minimumU, true)
  middle = clipPolygonToAxisBoundary(middle, 0, rectangle.maximumU, false)
  const lowerMiddle = clipPolygonToAxisBoundary(
    middle,
    1,
    rectangle.minimumV,
    false,
  )
  const upperMiddle = clipPolygonToAxisBoundary(
    middle,
    1,
    rectangle.maximumV,
    true,
  )
  return nonEmptyPolygons([left, right, lowerMiddle, upperMiddle])
}

function subtractRectanglesFromPolygons(
  polygons: readonly (readonly Point2D[])[],
  rectangles: readonly Rectangle2D[],
): Point2D[][] {
  let result = nonEmptyPolygons(polygons)
  for (const rectangle of rectangles) {
    result = result.flatMap((polygon) =>
      subtractRectangleFromPolygon(polygon, rectangle),
    )
    if (result.length === 0) break
  }
  return result
}

function wrapAroundCenter(value: number, period: number): number {
  const shifted = value + period / 2
  const positiveRemainder = ((shifted % period) + period) % period
  return positiveRemainder - period / 2
}

function periodicBoundaryOverlappingLatticeCenters(
  circumference: number,
  spanV: number,
  lattice: HoneycombLattice,
): Point2D[] {
  const columnCount = Math.floor(
    (circumference + EPSILON) / lattice.anchorPitch,
  )
  if (columnCount < 1) return []

  const availableRowSpan = Math.max(0, spanV - lattice.cellRadius * 2)
  const rowCount =
    Math.ceil((availableRowSpan + EPSILON) / lattice.rowPitch) + 1
  const firstRowV = -((rowCount - 1) * lattice.rowPitch) / 2
  const periodicPitch = circumference / columnCount
  const centers: Point2D[] = []
  for (let row = 0; row < rowCount; row += 1) {
    const rowOffset = row % 2 === 0 ? 0 : periodicPitch / 2
    for (let column = 0; column < columnCount; column += 1) {
      const unwrappedU =
        -circumference / 2 + (column + 0.5) * periodicPitch + rowOffset
      centers.push([
        wrapAroundCenter(unwrappedU, circumference),
        firstRowV + row * lattice.rowPitch,
      ])
    }
  }
  return centers
}

function distanceSquared(first: Point2D, second: Point2D): number {
  const du = first[0] - second[0]
  const dv = first[1] - second[1]
  return du * du + dv * dv
}

function intersectsProtectedCircle(
  center: Point2D,
  radius: number,
  protectedCenter: Point2D,
  protectedRadius: number,
): boolean {
  const reach = radius + protectedRadius
  return distanceSquared(center, protectedCenter) <= reach * reach
}

function intersectsProtectedBand(
  center: Point2D,
  radius: number,
  axis: 0 | 1,
  position: number,
  halfWidth: number,
): boolean {
  return Math.abs(center[axis] - position) <= halfWidth + radius
}

function boxSidePanelBounds(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
): Rectangle2D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const lowerFrame = parameters.thinShellMode ? 3.5 : honeycomb.lowerFrame
  const tangentSpan = side === '+X' || side === '-X' ? depth : width
  return {
    minimumU: -tangentSpan / 2 + honeycomb.sideFrame,
    maximumU: tangentSpan / 2 - honeycomb.sideFrame,
    minimumV: derived.activeFloorTopZ + lowerFrame,
    maximumV: derived.activeUpperInnerRimZ - honeycomb.topFrame,
  }
}

function boxSideOpeningKeepout(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
  panel: Rectangle2D,
): Rectangle2D | null {
  const opening =
    openGridStackableBoxDerivedGeometryFor(parameters).openings[side]
  if (!opening.enabled) return null

  const clearance = OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
  const protectedHalfWidth = opening.upperWidth / 2 + clearance
  return {
    minimumU: -protectedHalfWidth,
    maximumU: protectedHalfWidth,
    minimumV: opening.bottomZ - clearance,
    maximumV: panel.maximumV,
  }
}

function boxSideCellPolygonGroups(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
  applyOpeningKeepout = true,
): Point2D[][][] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const panel = boxSidePanelBounds(parameters, side)
  const panelTangentSpan = panel.maximumU - panel.minimumU
  const panelHeight = panel.maximumV - panel.minimumV
  if (panelTangentSpan < honeycomb.minimumPanelSpan) return []
  if (panelHeight < honeycomb.minimumPanelSpan) return []

  const openingKeepout = boxSideOpeningKeepout(parameters, side, panel)
  const groups: Point2D[][][] = []
  const centers = sideBoundaryOverlappingLatticeCenters(
    panelTangentSpan,
    panelHeight,
    honeycomb,
  )
  const panelCenterV = (panel.minimumV + panel.maximumV) / 2
  for (const [tangent, localV] of centers) {
    const center: Point2D = [tangent, localV + panelCenterV]
    const clipped = clipPolygonToBounds(hexagonPoints(center, honeycomb), panel)
    let polygons = nonEmptyPolygons([clipped])
    if (openingKeepout) {
      if (applyOpeningKeepout) {
        polygons = subtractRectanglesFromPolygons(polygons, [openingKeepout])
      } else if (
        polygons.every((polygon) =>
          polygonIsInsideRectangle(polygon, openingKeepout),
        )
      ) {
        // The panel slot applies the opening mask as a single exact solid
        // cut. Do not emit cells that are wholly inside that mask.
        continue
      }
    }
    if (polygons.length > 0) groups.push(polygons)
  }
  return groups
}

function boxSideCutter(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
  polygons: readonly (readonly Point2D[])[],
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const wallThickness = parameters.thinShellMode
    ? configuration.thinShellWallThickness
    : configuration.wallThickness
  const margin = OPENGRID_HONEYCOMB_CONFIGURATION.cutterMargin
  const distance = wallThickness + margin * 2
  const normalIsX = side === '+X' || side === '-X'
  if (normalIsX) {
    const x =
      side === '+X' ? width / 2 - wallThickness - margin : -width / 2 - margin
    return extrudePolygonGroup('YZ', [x, 0, 0], polygons, distance, [1, 0, 0])
  }

  const y =
    side === '+Y' ? depth / 2 - wallThickness - margin : -depth / 2 - margin
  return extrudePolygonGroup('XZ', [0, y, 0], polygons, distance, [0, 1, 0])
}

export const OPENGRID_HONEYCOMB_PANEL_OVERLAP = 0.08
export const OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE = 1024
export const OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE = 2048

function expandedPanelBounds(bounds: Rectangle2D): Rectangle2D {
  const overlap = OPENGRID_HONEYCOMB_PANEL_OVERLAP
  return {
    minimumU: bounds.minimumU - overlap,
    maximumU: bounds.maximumU + overlap,
    minimumV: bounds.minimumV - overlap,
    maximumV: bounds.maximumV + overlap,
  }
}

export function makeOpenGridStackableBoxSideHoneycombPanel(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
  context: OpenGridHoneycombBuildContext = {},
  batchStart = 0,
  batchSize = OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE,
): Shape3D | null {
  // Keep each clipped hexagon as one wire. A side opening is masked from the
  // panel slot below; splitting a hexagon into several coplanar fragments can
  // make adjacent wires touch at the opening boundary and invalidate the
  // compound sketch.
  const groups = boxSideCellPolygonGroups(parameters, side, false)
  const batch = groups.slice(batchStart, batchStart + batchSize)
  if (batch.length === 0) return null

  const holes: Point2D[][] = []
  for (const group of batch) {
    assertHoneycombGenerationCurrent(context)
    holes.push(...group)
  }

  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const wallThickness = parameters.thinShellMode
    ? configuration.thinShellWallThickness
    : configuration.wallThickness
  let origin: [number, number, number]
  let plane: Plane
  let direction: [number, number, number]
  if (side === '+X' || side === '-X') {
    plane = 'YZ'
    direction = [1, 0, 0]
    origin = [
      side === '+X'
        ? width / 2 - wallThickness - OPENGRID_HONEYCOMB_PANEL_OVERLAP
        : -width / 2,
      0,
      0,
    ]
  } else {
    plane = 'XZ'
    direction = [0, 1, 0]
    origin = [
      0,
      side === '+Y'
        ? depth / 2 - wallThickness - OPENGRID_HONEYCOMB_PANEL_OVERLAP
        : -depth / 2,
      0,
    ]
  }

  const panel = expandedPanelBounds(boundsForPolygons(holes))
  const distance = wallThickness + OPENGRID_HONEYCOMB_PANEL_OVERLAP
  return extrudePolygonWithHoles(
    plane,
    origin,
    rectanglePoints(panel),
    holes,
    distance,
    direction,
  )
}

export function makeOpenGridStackableBoxSideHoneycombPanelSlot(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
  panel: Shape3D,
  context: OpenGridHoneycombBuildContext = {},
): Shape3D {
  const panelBounds = panel.boundingBox
  let minimumX = 0
  let minimumY = 0
  let minimumZ = 0
  let maximumX = 0
  let maximumY = 0
  let maximumZ = 0
  try {
    const [[minX, minY, minZ], [maxX, maxY, maxZ]] =
      panelBounds.bounds as number[][]
    minimumX = minX!
    minimumY = minY!
    minimumZ = minZ!
    maximumX = maxX!
    maximumY = maxY!
    maximumZ = maxZ!
  } finally {
    panelBounds.delete()
  }

  let slot: Shape3D | null = null
  let protector: Shape3D | null = null
  try {
    slot = makeBox(
      [minimumX, minimumY, minimumZ],
      [maximumX, maximumY, maximumZ],
    )
    const openingKeepout = boxSideOpeningKeepout(
      parameters,
      side,
      boxSidePanelBounds(parameters, side),
    )
    if (!openingKeepout) {
      const result = slot
      slot = null
      return result
    }

    assertHoneycombGenerationCurrent(context)
    const margin = OPENGRID_HONEYCOMB_CONFIGURATION.cutterMargin
    const normalMinimum =
      (side === '+X' || side === '-X' ? minimumX : minimumY) - margin
    const normalMaximum =
      (side === '+X' || side === '-X' ? maximumX : maximumY) + margin
    const tangentMinimum = openingKeepout.minimumU
    const tangentMaximum = openingKeepout.maximumU
    const zMinimum = Math.min(minimumZ, openingKeepout.minimumV) - margin
    const zMaximum = Math.max(maximumZ, openingKeepout.maximumV) + margin
    const protectorMinimum: [number, number, number] =
      side === '+X' || side === '-X'
        ? [normalMinimum, tangentMinimum, zMinimum]
        : [tangentMinimum, normalMinimum, zMinimum]
    const protectorMaximum: [number, number, number] =
      side === '+X' || side === '-X'
        ? [normalMaximum, tangentMaximum, zMaximum]
        : [tangentMaximum, normalMaximum, zMaximum]
    protector = makeBox(protectorMinimum, protectorMaximum)
    const current = slot
    const masked = measureBooleanInScope(
      context.booleanOperations?.createScope(1),
      'cut',
      () => current.cut(protector!),
    )
    deleteShape(current)
    slot = null
    return masked
  } catch (error) {
    deleteShape(slot)
    throw error
  } finally {
    deleteShape(protector)
  }
}

export function makeOpenGridStackableBoxSideHoneycombCutters(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridHoneycombBuildContext = {},
): Shape3D[] {
  const cutters: Shape3D[] = []
  try {
    for (const side of ['+X', '-X', '+Y', '-Y'] as const) {
      for (const polygons of boxSideCellPolygonGroups(parameters, side)) {
        assertHoneycombGenerationCurrent(context)
        cutters.push(boxSideCutter(parameters, side, polygons))
      }
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

type ProtectedCircle = Readonly<{
  center: Point2D
  radius: number
}>

type ProtectedBand = Readonly<{
  axis: 0 | 1
  position: number
  halfWidth: number
}>

type BoxBottomProtector =
  | Readonly<{ type: 'circle'; circle: ProtectedCircle }>
  | Readonly<{ type: 'band'; band: ProtectedBand }>

function boxBottomProtectedCircles(
  parameters: OpenGridStackableBoxParameters,
): ProtectedCircle[] {
  const socketRadius =
    openGridStackableBoxHoneycombSocketProtectionRadiusFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const ordinaryHoleRadius =
    configuration.bottomGridHoleDiameter / 2 + honeycomb.bottomHoleSafetyRing
  return [
    ...openGridStackableBoxSocketCentersFor(parameters).map((center) => ({
      center,
      radius: socketRadius,
    })),
    ...openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters).map(
      (center) => ({ center, radius: ordinaryHoleRadius }),
    ),
  ]
}

export function openGridStackableBoxHoneycombSocketProtectionRadiusFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const socketOpeningRadius =
    parameters.cornerSeatMode === 'detachable-corner-seat'
      ? OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.outerDiameter / 2 -
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.hostOverlap
      : Math.max(
          configuration.baseHoleBottomOpeningDiameter,
          configuration.baseHoleTopOpeningDiameter,
        ) / 2
  return socketOpeningRadius + honeycomb.bottomHoleSafetyRing
}

function boxBottomProtectedBands(
  parameters: OpenGridStackableBoxParameters,
): ProtectedBand[] {
  if (parameters.thinShellMode) return []

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const seamHalfWidth =
    configuration.bottomGridSeamSupportOpeningWidth / 2 +
    honeycomb.bottomFeatureClearance
  const bands: ProtectedBand[] = []
  for (let index = 1; index < Math.ceil(parameters.x); index += 1) {
    bands.push({
      axis: 0,
      position: -width / 2 + index * configuration.gridPitch,
      halfWidth: seamHalfWidth,
    })
  }
  for (let index = 1; index < Math.ceil(parameters.y); index += 1) {
    bands.push({
      axis: 1,
      position: -depth / 2 + index * configuration.gridPitch,
      halfWidth: seamHalfWidth,
    })
  }
  return bands
}

function boxBottomProtectors(
  parameters: OpenGridStackableBoxParameters,
): BoxBottomProtector[] {
  return [
    ...boxBottomProtectedCircles(parameters).map(
      (circle): BoxBottomProtector => ({ type: 'circle', circle }),
    ),
    ...boxBottomProtectedBands(parameters).map((band): BoxBottomProtector => ({
      type: 'band',
      band,
    })),
  ]
}

function boxBottomClippedHexagon(
  parameters: OpenGridStackableBoxParameters,
  center: Point2D,
): Point2D[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const frame = honeycomb.bottomFrame
  return clipPolygonToRectangle(
    hexagonPoints(center, honeycomb.bottomLattice),
    -width / 2 + frame,
    width / 2 - frame,
    -depth / 2 + frame,
    depth / 2 - frame,
  )
}

function polygonIsInsideCircle(
  points: readonly Point2D[],
  circle: ProtectedCircle,
): boolean {
  const radiusSquared = (circle.radius + EPSILON) ** 2
  return points.every(
    (point) => distanceSquared(point, circle.center) <= radiusSquared,
  )
}

function polygonIsInsideBand(
  points: readonly Point2D[],
  band: ProtectedBand,
): boolean {
  return points.every(
    (point) =>
      Math.abs(point[band.axis] - band.position) <= band.halfWidth + EPSILON,
  )
}

function pointIsInsidePolygon(
  point: Point2D,
  polygon: readonly Point2D[],
): boolean {
  let inside = false
  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = polygon[currentIndex]!
    const previous = polygon[previousIndex]!
    const crossesRay =
      current[1] > point[1] !== previous[1] > point[1] &&
      point[0] <
        ((previous[0] - current[0]) * (point[1] - current[1])) /
          (previous[1] - current[1]) +
          current[0]
    if (crossesRay) inside = !inside
  }
  return inside
}

function pointToSegmentDistanceSquared(
  point: Point2D,
  start: Point2D,
  end: Point2D,
): number {
  const segmentX = end[0] - start[0]
  const segmentY = end[1] - start[1]
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  if (lengthSquared <= EPSILON) return distanceSquared(point, start)
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * segmentX + (point[1] - start[1]) * segmentY) /
        lengthSquared,
    ),
  )
  return distanceSquared(point, [
    start[0] + projection * segmentX,
    start[1] + projection * segmentY,
  ])
}

function polygonIntersectsCircle(
  points: readonly Point2D[],
  circle: ProtectedCircle,
): boolean {
  const radiusSquared = (circle.radius + EPSILON) ** 2
  if (
    points.some(
      (point) => distanceSquared(point, circle.center) <= radiusSquared,
    ) ||
    pointIsInsidePolygon(circle.center, points)
  ) {
    return true
  }
  return points.some(
    (point, index) =>
      pointToSegmentDistanceSquared(
        circle.center,
        point,
        points[(index + 1) % points.length]!,
      ) <= radiusSquared,
  )
}

function polygonIntersectsBand(
  points: readonly Point2D[],
  band: ProtectedBand,
): boolean {
  const coordinates = points.map((point) => point[band.axis])
  const minimum = Math.min(...coordinates)
  const maximum = Math.max(...coordinates)
  return (
    minimum <= band.position + band.halfWidth + EPSILON &&
    maximum >= band.position - band.halfWidth - EPSILON
  )
}

function polygonIntersectsProtector(
  points: readonly Point2D[],
  protector: BoxBottomProtector,
): boolean {
  return protector.type === 'circle'
    ? polygonIntersectsCircle(points, protector.circle)
    : polygonIntersectsBand(points, protector.band)
}

function makeBoxBottomHoneycombProtectors(
  parameters: OpenGridStackableBoxParameters,
  descriptors: readonly BoxBottomProtector[],
  floorTop: number,
  margin: number,
  context: OpenGridHoneycombBuildContext,
): Shape3D[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const protectors: Shape3D[] = []
  try {
    for (const descriptor of descriptors) {
      assertHoneycombGenerationCurrent(context)
      if (descriptor.type === 'circle') {
        const { circle } = descriptor
        protectors.push(
          makeCylinder(circle.radius, floorTop + margin * 2, [
            circle.center[0],
            circle.center[1],
            -margin,
          ]),
        )
      } else {
        const { band } = descriptor
        const minimum: [number, number, number] = [
          -width / 2 - margin,
          -depth / 2 - margin,
          -margin,
        ]
        const maximum: [number, number, number] = [
          width / 2 + margin,
          depth / 2 + margin,
          floorTop + margin,
        ]
        minimum[band.axis] = band.position - band.halfWidth
        maximum[band.axis] = band.position + band.halfWidth
        protectors.push(makeBox(minimum, maximum))
      }
    }
    return protectors
  } catch (error) {
    protectors.forEach(deleteShape)
    throw error
  }
}

export type OpenGridStackableBoxBottomHoneycombPanel = Readonly<{
  panel: Shape3D | null
  slot: Shape3D | null
}>

export function makeOpenGridStackableBoxBottomHoneycombPanel(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridHoneycombBuildContext = {},
  batchStart = 0,
  batchSize = OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE,
): OpenGridStackableBoxBottomHoneycombPanel {
  const centers = boxBottomHoneycombCenters(parameters)
  const batch = centers.slice(batchStart, batchStart + batchSize)
  if (batch.length === 0) {
    return { panel: null, slot: null }
  }

  const polygons: Point2D[][] = []
  for (const center of batch) {
    assertHoneycombGenerationCurrent(context)
    polygons.push(boxBottomClippedHexagon(parameters, center))
  }

  const panelBounds = expandedPanelBounds(boundsForPolygons(polygons))
  const floorTop = openGridStackableBoxActiveFloorTopZFor(parameters)
  let panel: Shape3D | null = null
  let slot: Shape3D | null = null
  let protectors: Shape3D[] = []
  try {
    panel = extrudePolygonWithHoles(
      'XY',
      [0, 0, 0],
      rectanglePoints(panelBounds),
      polygons,
      floorTop,
      [0, 0, 1],
    )
    slot = makeBox(
      [panelBounds.minimumU, panelBounds.minimumV, 0],
      [panelBounds.maximumU, panelBounds.maximumV, floorTop],
    )
    const descriptors = boxBottomProtectors(parameters)
    if (descriptors.length > 0) {
      protectors = makeBoxBottomHoneycombProtectors(
        parameters,
        descriptors,
        floorTop,
        OPENGRID_HONEYCOMB_CONFIGURATION.cutterMargin,
        context,
      )
      for (const protector of protectors) {
        assertHoneycombGenerationCurrent(context)
        if (!slot) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
        const current: Shape3D = slot
        const masked: Shape3D = measureBooleanInScope(
          context.booleanOperations?.createScope(1),
          'cut',
          () => current.cut(protector),
        )
        deleteShape(current)
        slot = masked
      }
    }
    protectors.forEach(deleteShape)
    protectors = []
    return { panel, slot }
  } catch (error) {
    deleteShape(panel)
    deleteShape(slot)
    protectors.forEach(deleteShape)
    throw error
  }
}

export function makeOpenGridStackableBoxBottomHoneycombCutters(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridHoneycombBuildContext = {},
): Shape3D[] {
  const floorTop = openGridStackableBoxActiveFloorTopZFor(parameters)
  const centers = boxBottomHoneycombCenters(parameters)
  const margin = OPENGRID_HONEYCOMB_CONFIGURATION.cutterMargin
  const cutters: Shape3D[] = []
  try {
    for (const center of centers) {
      assertHoneycombGenerationCurrent(context)
      const points = boxBottomClippedHexagon(parameters, center)
      cutters.push(
        extrudePolygon('XY', [0, 0, -margin], points, floorTop + margin * 2),
      )
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

export function makeOpenGridStackableBoxProtectedBottomHoneycombCutters(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridHoneycombBuildContext = {},
): Shape3D[] {
  const margin = OPENGRID_HONEYCOMB_CONFIGURATION.cutterMargin
  const floorTop = openGridStackableBoxActiveFloorTopZFor(parameters)
  const centers = boxBottomHoneycombCenters(parameters)
  const cutters = makeOpenGridStackableBoxBottomHoneycombCutters(
    parameters,
    context,
  )
  if (cutters.length === 0) return cutters

  const descriptors = boxBottomProtectors(parameters)
  const batchProtectorIndices: number[][] = []
  let operationCount = 0
  for (
    let start = 0;
    start < centers.length;
    start += BOX_BOTTOM_CLIP_BATCH_SIZE
  ) {
    const indices = new Set<number>()
    for (const center of centers.slice(
      start,
      start + BOX_BOTTOM_CLIP_BATCH_SIZE,
    )) {
      const points = boxBottomClippedHexagon(parameters, center)
      descriptors.forEach((descriptor, index) => {
        if (polygonIntersectsProtector(points, descriptor)) indices.add(index)
      })
    }
    const batchIndices = [...indices]
    operationCount += batchIndices.length
    batchProtectorIndices.push(batchIndices)
  }
  if (operationCount === 0) return cutters

  let protectors: Shape3D[] = []
  try {
    protectors = makeBoxBottomHoneycombProtectors(
      parameters,
      descriptors,
      floorTop,
      margin,
      context,
    )
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
  if (protectors.length === 0) return cutters

  const clippedBatches: Shape3D[] = []
  const cutScope = context.booleanOperations?.createScope(operationCount)
  let activeBatch: Shape3D[] = []
  let activeResult: Shape3D | null = null
  let batchIndex = 0
  try {
    while (cutters.length > 0) {
      assertHoneycombGenerationCurrent(context)
      activeBatch = cutters.splice(0, BOX_BOTTOM_CLIP_BATCH_SIZE)
      activeResult = makeCompound(activeBatch).asShape3D()
      const protectorIndices = batchProtectorIndices[batchIndex] ?? []
      batchIndex += 1
      for (const protectorIndex of protectorIndices) {
        assertHoneycombGenerationCurrent(context)
        const current: Shape3D | null = activeResult
        if (!current) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
        const protector = protectors[protectorIndex]
        if (!protector) throw new Error('OPENGRID_HONEYCOMB_PROTECTOR_EMPTY')
        const clipped: Shape3D = measureBooleanInScope(cutScope, 'cut', () =>
          current.cut(protector),
        )
        deleteShape(current)
        activeResult = clipped
      }
      if (!activeResult) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
      clippedBatches.push(activeResult)
      activeResult = null
      activeBatch.forEach(deleteShape)
      activeBatch = []
    }
    return clippedBatches
  } catch (error) {
    clippedBatches.forEach(deleteShape)
    throw error
  } finally {
    deleteShape(activeResult)
    activeBatch.forEach(deleteShape)
    cutters.forEach(deleteShape)
    protectors.forEach(deleteShape)
  }
}

function boxBottomHoneycombCenters(
  parameters: OpenGridStackableBoxParameters,
): Point2D[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const protectedCircles = boxBottomProtectedCircles(parameters)
  const protectedBands = boxBottomProtectedBands(parameters)
  return boundaryOverlappingLatticeCenters(
    width,
    depth,
    honeycomb.bottomFrame,
    honeycomb.bottomFrame,
    honeycomb.bottomLattice,
  ).filter((center) => {
    const points = boxBottomClippedHexagon(parameters, center)
    if (points.length < 3 || polygonArea(points) <= EPSILON) return false
    if (protectedBands.some((band) => polygonIsInsideBand(points, band))) {
      return false
    }
    return !protectedCircles.some((circle) =>
      polygonIsInsideCircle(points, circle),
    )
  })
}

export function openGridStackableBoxBottomHoneycombCellCountFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  if (!parameters.honeycombMode) return 0
  return boxBottomHoneycombCenters(parameters).length
}

function cylinderSideOpeningKeepouts(
  parameters: OpenGridStackableCylinderParameters,
  lowerZ: number,
  upperZ: number,
): Rectangle2D[] {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = derived.radius
  const circumference = 2 * Math.PI * radius
  const clearance = OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
  const directions: ReadonlyArray<
    readonly [OpenGridStackableCylinderOpeningDirection, number]
  > = [
    ['+X', 0],
    ['+Y', Math.PI / 2],
    ['-X', Math.PI],
    ['-Y', -Math.PI / 2],
  ]
  const keepouts: Rectangle2D[] = []
  for (const [direction, directionAngle] of directions) {
    const opening = derived.openings[direction]
    if (!opening.enabled) continue
    const centerTangent = directionAngle * radius
    const protectedHalfWidth = opening.angularHalfWidth * radius + clearance
    for (const periodOffset of [-circumference, 0, circumference]) {
      const protectedCenter = centerTangent + periodOffset
      keepouts.push({
        minimumU: protectedCenter - protectedHalfWidth,
        maximumU: protectedCenter + protectedHalfWidth,
        minimumV: Math.max(lowerZ, opening.bottomZ - clearance),
        maximumV: upperZ,
      })
    }
  }
  return keepouts
}

type CylinderSideCellGroup = Readonly<{
  tangent: number
  polygons: Point2D[][]
}>

function cylinderSideCellGroups(
  parameters: OpenGridStackableCylinderParameters,
): CylinderSideCellGroup[] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = derived.radius
  const lowerZ = derived.outerTransitionEndZ + honeycomb.lowerFrame
  const topProtectedHeight = Math.max(
    honeycomb.topFrame,
    derived.topInnerChamfer,
  )
  const upperZ = parameters.height - topProtectedHeight
  const circumference = 2 * Math.PI * radius
  const panelHeight = upperZ - lowerZ
  if (panelHeight < honeycomb.minimumPanelSpan) return []
  if (circumference < honeycomb.minimumPanelSpan) return []

  const centers = periodicBoundaryOverlappingLatticeCenters(
    circumference,
    panelHeight,
    honeycomb,
  )
  const keepouts = cylinderSideOpeningKeepouts(parameters, lowerZ, upperZ)
  const centerZ = (lowerZ + upperZ) / 2
  const groups: CylinderSideCellGroup[] = []
  for (const [tangent, localZ] of centers) {
    const center: Point2D = [tangent, localZ + centerZ]
    let clipped = clipPolygonToAxisBoundary(
      hexagonPoints(center, honeycomb),
      1,
      lowerZ,
      true,
    )
    clipped = clipPolygonToAxisBoundary(clipped, 1, upperZ, false)
    const unwrappedPolygons = subtractRectanglesFromPolygons(
      nonEmptyPolygons([clipped]),
      keepouts,
    )
    const localPolygons = unwrappedPolygons.map((polygon) =>
      polygon.map(
        ([unwrappedTangent, z]) => [unwrappedTangent - tangent, z] as Point2D,
      ),
    )
    if (localPolygons.length > 0) {
      groups.push({ tangent, polygons: localPolygons })
    }
  }
  return groups
}

function rotateAroundZ(shape: Shape3D, angleDegrees: number): Shape3D {
  if (Math.abs(angleDegrees) < EPSILON) return shape
  const rotated = shape.rotate(angleDegrees, [0, 0, 0], [0, 0, 1])
  if (rotated !== shape) deleteShape(shape)
  return rotated
}

export function makeOpenGridStackableCylinderSideHoneycombCutters(
  parameters: OpenGridStackableCylinderParameters,
  context: OpenGridHoneycombBuildContext = {},
): Shape3D[] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = derived.radius
  const cutters: Shape3D[] = []
  try {
    for (const group of cylinderSideCellGroups(parameters)) {
      assertHoneycombGenerationCurrent(context)
      const maximumTangentExtent = Math.max(
        ...group.polygons.flatMap((polygon) =>
          polygon.map(([tangent]) => Math.abs(tangent)),
        ),
      )
      const innerWallStart =
        Math.sqrt(
          Math.max(0, derived.innerRadius ** 2 - maximumTangentExtent ** 2),
        ) - honeycomb.cutterMargin
      const wallDistance = radius + honeycomb.cutterMargin - innerWallStart
      let base: Shape3D | null = null
      try {
        base = extrudePolygonGroup(
          'YZ',
          [innerWallStart, 0, 0],
          group.polygons,
          wallDistance,
          [1, 0, 0],
        )
        cutters.push(
          rotateAroundZ(base, (group.tangent / radius) * (180 / Math.PI)),
        )
        base = null
      } finally {
        deleteShape(base)
      }
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

type CylinderBottomCell = Readonly<{
  points: Point2D[]
  clippedAtFrame: boolean
  protectedCircleIndices: number[]
}>

function cylinderBottomOpeningRadius(
  parameters: OpenGridStackableCylinderParameters,
): number {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = derived.radius
  return Math.max(
    0,
    Math.min(
      derived.flatFloorRadius - honeycomb.bottomFrame,
      radius - configuration.outerEdgeClearance,
    ),
  )
}

function cylinderBottomProtectedCircles(
  parameters: OpenGridStackableCylinderParameters,
): ProtectedCircle[] {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const protectedRadius =
    Math.max(
      configuration.bottomHoleDiameter,
      configuration.innerHoleDiameter,
    ) /
      2 +
    honeycomb.bottomHoleSafetyRing
  return openGridStackableCylinderHoleCentersFor(parameters).map((center) => ({
    center,
    radius: protectedRadius,
  }))
}

function cylinderBottomHoneycombCells(
  parameters: OpenGridStackableCylinderParameters,
): CylinderBottomCell[] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const bottomLattice = honeycomb.bottomLattice
  const openingCircle: ProtectedCircle = {
    center: [0, 0],
    radius: cylinderBottomOpeningRadius(parameters),
  }
  if (openingCircle.radius <= EPSILON) return []

  const protectedCircles = cylinderBottomProtectedCircles(parameters)
  const span = openingCircle.radius * 2
  const centers = boundaryOverlappingLatticeCenters(
    span,
    span,
    0,
    0,
    bottomLattice,
  )
  const cells: CylinderBottomCell[] = []
  for (const center of centers) {
    const points = hexagonPoints(center, bottomLattice)
    if (!polygonIntersectsCircle(points, openingCircle)) continue
    if (
      protectedCircles.some((circle) => polygonIsInsideCircle(points, circle))
    ) {
      continue
    }
    const protectedCircleIndices = protectedCircles.flatMap((circle, index) =>
      polygonIntersectsCircle(points, circle) ? [index] : [],
    )
    cells.push({
      points,
      clippedAtFrame: !polygonIsInsideCircle(points, openingCircle),
      protectedCircleIndices,
    })
  }
  const hasCompleteSafeCell = cells.some(
    (cell) => !cell.clippedAtFrame && cell.protectedCircleIndices.length === 0,
  )
  return hasCompleteSafeCell ? cells : []
}

export function makeOpenGridStackableCylinderBottomHoneycombCutters(
  parameters: OpenGridStackableCylinderParameters,
  context: OpenGridHoneycombBuildContext = {},
): Shape3D[] {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const margin = honeycomb.cutterMargin
  const cells = cylinderBottomHoneycombCells(parameters)
  if (cells.length === 0) return []
  const protectedCircles = cylinderBottomProtectedCircles(parameters)
  const operationCount = cells.reduce(
    (count, cell) =>
      count +
      (cell.clippedAtFrame ? 1 : 0) +
      cell.protectedCircleIndices.length,
    0,
  )
  const scope = context.booleanOperations?.createScope(operationCount)
  const cutters: Shape3D[] = []
  let openingMask: Shape3D | null = null
  const circleProtectors: Shape3D[] = []
  try {
    openingMask = makeCylinder(
      cylinderBottomOpeningRadius(parameters),
      derived.floorThickness + margin * 2,
      [0, 0, -margin],
    )
    for (const circle of protectedCircles) {
      circleProtectors.push(
        makeCylinder(circle.radius, derived.floorThickness + margin * 2, [
          circle.center[0],
          circle.center[1],
          -margin,
        ]),
      )
    }

    for (const cell of cells) {
      assertHoneycombGenerationCurrent(context)
      let active: Shape3D | null = extrudePolygon(
        'XY',
        [0, 0, -margin],
        cell.points,
        derived.floorThickness + margin * 2,
      )
      try {
        if (cell.clippedAtFrame) {
          assertHoneycombGenerationCurrent(context)
          const current: Shape3D | null = active
          const activeOpeningMask: Shape3D | null = openingMask
          if (!current || !activeOpeningMask) {
            throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
          }
          const clipped: Shape3D = measureBooleanInScope(
            scope,
            'intersect',
            () => current.intersect(activeOpeningMask),
          )
          deleteShape(current)
          active = clipped
        }
        for (const protectorIndex of cell.protectedCircleIndices) {
          assertHoneycombGenerationCurrent(context)
          const current: Shape3D | null = active
          const protector = circleProtectors[protectorIndex]
          if (!current || !protector) {
            throw new Error('OPENGRID_HONEYCOMB_PROTECTOR_EMPTY')
          }
          const clipped: Shape3D = measureBooleanInScope(scope, 'cut', () =>
            current.cut(protector),
          )
          deleteShape(current)
          active = clipped
        }
        if (!active) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
        cutters.push(active)
        active = null
      } finally {
        deleteShape(active)
      }
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  } finally {
    deleteShape(openingMask)
    circleProtectors.forEach(deleteShape)
  }
}

export function openGridStackableCylinderBottomHoneycombCellCountFor(
  parameters: OpenGridStackableCylinderParameters,
): number {
  if (!parameters.honeycombMode) return 0
  return cylinderBottomHoneycombCells(parameters).length
}

export function openGridStackableBoxHoneycombCellCountFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  if (!parameters.honeycombMode) return 0
  let count = 0
  for (const side of ['+X', '-X', '+Y', '-Y'] as const) {
    count += boxSideCellPolygonGroups(parameters, side).length
  }

  count += boxBottomHoneycombCenters(parameters).length
  return count
}

export function openGridStackableBoxSideHoneycombCellCountFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  return (['+X', '-X', '+Y', '-Y'] as const).reduce(
    (count, side) => count + boxSideCellPolygonGroups(parameters, side).length,
    0,
  )
}

/**
 * Practical cell budget for the stackable-box honeycomb builder.
 *
 * The panel builder does not allocate one native solid per cell, but the
 * number of openings still predicts the topology that the fixed wasm32
 * geometry engine must hold. Keep this threshold centralized so the worker
 * can reject an input before starting native lattice construction.
 * This is an admission ceiling, not a guarantee of completion within the
 * model-generation timeout; the 10x10 h101 thin-shell target can exceed that
 * timeout. Keep the ceiling at 5000 cells so the unified-lattice 10x10 h200
 * candidate remains rejected before native construction.
 */
export const OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_BUDGET = 5000

export type OpenGridStackableBoxHoneycombMemoryEstimate = Readonly<{
  estimatedCells: number
  withinBudget: boolean
}>

export function estimateOpenGridStackableBoxHoneycombMemory(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxHoneycombMemoryEstimate {
  const estimatedCells = openGridStackableBoxHoneycombCellCountFor(parameters)
  return {
    estimatedCells,
    withinBudget:
      !parameters.honeycombMode ||
      estimatedCells <= OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_BUDGET,
  }
}

export function openGridStackableCylinderHoneycombCellCountFor(
  parameters: OpenGridStackableCylinderParameters,
): number {
  if (!parameters.honeycombMode) return 0
  let count = cylinderSideCellGroups(parameters).length

  count += openGridStackableCylinderBottomHoneycombCellCountFor(parameters)
  return count
}

type OpenShelfSlopedPanel = {
  lowerFrontY: number
  lowerRearY: number
  lowerFrontZ: number
  lowerRearZ: number
  thickness: number
}

type OpenShelfParallelBand = {
  lowerNormalOffset: number
  upperNormalOffset: number
}

type ClippedLatticeCell = {
  polygons: Point2D[][]
  isComplete: boolean
}

type OpenShelfBottomCell = ClippedLatticeCell & {
  protectedPegIndices: number[]
}

function polygonGroupArea(polygons: readonly (readonly Point2D[])[]): number {
  return polygons.reduce((area, polygon) => area + polygonArea(polygon), 0)
}

function rectangularLatticeCells(
  bounds: Rectangle2D,
  lattice: HoneycombLattice,
  keepouts: readonly Rectangle2D[] = [],
): ClippedLatticeCell[] {
  const spanU = bounds.maximumU - bounds.minimumU
  const spanV = bounds.maximumV - bounds.minimumV
  if (spanU <= EPSILON || spanV <= EPSILON) return []

  const centerU = (bounds.minimumU + bounds.maximumU) / 2
  const centerV = (bounds.minimumV + bounds.maximumV) / 2
  const cells: ClippedLatticeCell[] = []
  for (const [localU, localV] of boundaryOverlappingLatticeCenters(
    spanU,
    spanV,
    0,
    0,
    lattice,
  )) {
    const points = hexagonPoints([localU + centerU, localV + centerV], lattice)
    const clipped = clipPolygonToBounds(points, bounds)
    const polygons = subtractRectanglesFromPolygons([clipped], keepouts)
    if (polygons.length === 0) continue
    cells.push({
      polygons,
      isComplete:
        Math.abs(polygonGroupArea(polygons) - polygonArea(points)) <= EPSILON,
    })
  }
  return cells.some((cell) => cell.isComplete) ? cells : []
}

function convexLatticeCells(
  boundary: readonly Point2D[],
  lattice: HoneycombLattice,
): ClippedLatticeCell[] {
  if (boundary.length < 3 || polygonArea(boundary) <= EPSILON) return []
  const bounds = polygonBounds(boundary)
  const spanU = bounds.maximumU - bounds.minimumU
  const spanV = bounds.maximumV - bounds.minimumV
  const centerU = (bounds.minimumU + bounds.maximumU) / 2
  const centerV = (bounds.minimumV + bounds.maximumV) / 2
  const cells: ClippedLatticeCell[] = []

  for (const [localU, localV] of boundaryOverlappingLatticeCenters(
    spanU,
    spanV,
    0,
    0,
    lattice,
  )) {
    const points = hexagonPoints([localU + centerU, localV + centerV], lattice)
    const clipped = clipPolygonToConvexPolygon(points, boundary)
    const polygons = nonEmptyPolygons([clipped])
    if (polygons.length === 0) continue
    cells.push({
      polygons,
      isComplete:
        Math.abs(polygonGroupArea(polygons) - polygonArea(points)) <= EPSILON,
    })
  }
  return cells.some((cell) => cell.isComplete) ? cells : []
}

function openShelfShelfNormalOffsets(
  parameters: OpenGridOpenShelfParameters,
): Array<{ lower: number; upper: number }> {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [, depth] = openGridOpenShelfFootprintFor(parameters)
  const yRear = depth / 2
  const angle = openGridOpenShelfAngleRadiansFor(parameters.angle)
  const normalY = Math.sin(angle)
  const normalZ = Math.cos(angle)
  return Array.from(
    { length: openGridOpenShelfShelfCountFor(parameters) },
    (_, index) => {
      const [, lowerRearZ] = openGridOpenShelfShelfLowerSurfaceZFor(
        parameters,
        index + 1,
      )
      const lower = yRear * normalY + lowerRearZ * normalZ
      return {
        lower,
        upper: lower + configuration.innerPlateThickness,
      }
    },
  )
}

function openShelfRegularBands(
  parameters: OpenGridOpenShelfParameters,
): OpenShelfParallelBand[] {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [, depth] = openGridOpenShelfFootprintFor(parameters)
  const yRear = depth / 2
  const angle = openGridOpenShelfAngleRadiansFor(parameters.angle)
  const normalY = Math.sin(angle)
  const normalZ = Math.cos(angle)
  const shelves = openShelfShelfNormalOffsets(parameters)
  const topLowerRearY = yRear - normalY * configuration.outerWallThickness
  const topLowerRearZ =
    openGridOpenShelfTopOuterRearZFor(parameters) -
    normalZ * configuration.outerWallThickness
  const topLowerOffset = topLowerRearY * normalY + topLowerRearZ * normalZ
  const bottomUpperOffset = configuration.bottomThickness * normalZ

  return Array.from({ length: parameters.cellZ }, (_, cellIndex) => {
    if (parameters.angle > 0) {
      const lower = shelves[cellIndex]?.upper ?? topLowerOffset
      const upper = shelves[cellIndex + 1]?.lower ?? topLowerOffset
      return { lowerNormalOffset: lower, upperNormalOffset: upper }
    }
    const lower =
      cellIndex === 0
        ? bottomUpperOffset
        : (shelves[cellIndex - 1]?.upper ?? topLowerOffset)
    const upper = shelves[cellIndex]?.lower ?? topLowerOffset
    return { lowerNormalOffset: lower, upperNormalOffset: upper }
  })
}

function openShelfWorldPointToPanel(point: Point2D, angle: number): Point2D {
  const tangentY = Math.cos(angle)
  const tangentZ = -Math.sin(angle)
  const normalY = Math.sin(angle)
  const normalZ = Math.cos(angle)
  return [
    point[0] * tangentY + point[1] * tangentZ,
    point[0] * normalY + point[1] * normalZ,
  ]
}

function openShelfPanelPointToWorld(point: Point2D, angle: number): Point2D {
  const tangentY = Math.cos(angle)
  const tangentZ = -Math.sin(angle)
  const normalY = Math.sin(angle)
  const normalZ = Math.cos(angle)
  return [
    point[0] * tangentY + point[1] * normalY,
    point[0] * tangentZ + point[1] * normalZ,
  ]
}

function openShelfRegularVerticalCellPolygonGroups(
  parameters: OpenGridOpenShelfParameters,
): Point2D[][][] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const [, depth] = openGridOpenShelfFootprintFor(parameters)
  const angle = openGridOpenShelfAngleRadiansFor(parameters.angle)
  const tangentY = Math.cos(angle)
  const normalY = Math.sin(angle)
  const bridge = honeycomb.ribThickness / 2
  const safeFrontY = -depth / 2 + honeycomb.sideFrame
  const safeRearY = depth / 2 - honeycomb.sideFrame
  const cells: Point2D[][][] = []

  for (const band of openShelfRegularBands(parameters)) {
    const lowerNormalOffset = band.lowerNormalOffset + bridge
    const upperNormalOffset = band.upperNormalOffset - bridge
    if (upperNormalOffset <= lowerNormalOffset + EPSILON) continue
    const tangentAt = (worldY: number, normalOffset: number) =>
      (worldY - normalOffset * normalY) / tangentY
    const boundary: Point2D[] = [
      [tangentAt(safeFrontY, lowerNormalOffset), lowerNormalOffset],
      [tangentAt(safeRearY, lowerNormalOffset), lowerNormalOffset],
      [tangentAt(safeRearY, upperNormalOffset), upperNormalOffset],
      [tangentAt(safeFrontY, upperNormalOffset), upperNormalOffset],
    ]
    for (const cell of convexLatticeCells(boundary, honeycomb)) {
      cells.push(
        cell.polygons.map((polygon) =>
          polygon.map((point) => openShelfPanelPointToWorld(point, angle)),
        ),
      )
    }
  }

  return cells
}

function openShelfBottomWedgeBoundary(
  parameters: OpenGridOpenShelfParameters,
): Point2D[] {
  if (parameters.angle <= 0) return []
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [, depth] = openGridOpenShelfFootprintFor(parameters)
  const angle = openGridOpenShelfAngleRadiansFor(parameters.angle)
  const normalY = Math.sin(angle)
  const normalZ = Math.cos(angle)
  if (normalY <= EPSILON) return []

  const firstShelf = openShelfShelfNormalOffsets(parameters)[0]
  if (!firstShelf) return []
  const bridge = honeycomb.ribThickness / 2
  const yFront = -depth / 2 + honeycomb.sideFrame
  const yRear = depth / 2 - honeycomb.sideFrame
  const lowerZ = configuration.bottomThickness + bridge
  const upperNormalOffset = firstShelf.lower - bridge
  const upperZAt = (y: number) => (upperNormalOffset - y * normalY) / normalZ
  const crossingY = (upperNormalOffset - lowerZ * normalZ) / normalY
  const maximumY = Math.min(yRear, crossingY)
  if (maximumY <= yFront + EPSILON) return []

  const upperFrontZ = upperZAt(yFront)
  const upperRearZ = upperZAt(maximumY)
  if (upperFrontZ <= lowerZ + EPSILON) return []
  const worldBoundary: Point2D[] = [
    [yFront, lowerZ],
    [maximumY, lowerZ],
  ]
  if (upperRearZ > lowerZ + EPSILON) {
    worldBoundary.push([maximumY, upperRearZ])
  }
  worldBoundary.push([yFront, upperFrontZ])
  return worldBoundary.map((point) => openShelfWorldPointToPanel(point, angle))
}

function openShelfBottomWedgeCellPolygonGroups(
  parameters: OpenGridOpenShelfParameters,
): Point2D[][][] {
  const angle = openGridOpenShelfAngleRadiansFor(parameters.angle)
  const boundary = openShelfBottomWedgeBoundary(parameters)
  return convexLatticeCells(boundary, OPENGRID_HONEYCOMB_CONFIGURATION).map(
    (cell) =>
      cell.polygons.map((polygon) =>
        polygon.map((point) => openShelfPanelPointToWorld(point, angle)),
      ),
  )
}

function openShelfVerticalPanelCellPolygonGroups(
  parameters: OpenGridOpenShelfParameters,
): Point2D[][][] {
  return [
    ...openShelfBottomWedgeCellPolygonGroups(parameters),
    ...openShelfRegularVerticalCellPolygonGroups(parameters),
  ]
}

function openShelfBackboardCellPolygonGroups(
  parameters: OpenGridOpenShelfParameters,
): Point2D[][][] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [width] = openGridOpenShelfFootprintFor(parameters)
  const lowerZ = configuration.bottomThickness + honeycomb.lowerFrame
  const upperZ =
    openGridOpenShelfTopOuterRearZFor(parameters) - honeycomb.topFrame
  const panelHeight = upperZ - lowerZ
  if (panelHeight <= EPSILON) return []

  const dividerCenters = openGridOpenShelfDividerCentersFor(parameters)
  const dividerHalfWidth =
    configuration.innerPlateThickness / 2 + honeycomb.ribThickness / 2
  const angle = openGridOpenShelfAngleRadiansFor(parameters.angle)
  const shelfHalfHeight =
    (configuration.innerPlateThickness * Math.cos(angle)) / 2 +
    honeycomb.ribThickness / 2
  const shelfCenterZs = Array.from(
    { length: openGridOpenShelfShelfCountFor(parameters) },
    (_, index) => {
      const [, lowerRearZ] = openGridOpenShelfShelfLowerSurfaceZFor(
        parameters,
        index + 1,
      )
      return (
        lowerRearZ + (configuration.innerPlateThickness * Math.cos(angle)) / 2
      )
    },
  )
  const bounds: Rectangle2D = {
    minimumU: -width / 2 + honeycomb.sideFrame,
    maximumU: width / 2 - honeycomb.sideFrame,
    minimumV: lowerZ,
    maximumV: upperZ,
  }
  const keepouts: Rectangle2D[] = [
    ...dividerCenters.map((dividerCenter) => ({
      minimumU: dividerCenter - dividerHalfWidth,
      maximumU: dividerCenter + dividerHalfWidth,
      minimumV: lowerZ,
      maximumV: upperZ,
    })),
    ...shelfCenterZs.map((shelfCenterZ) => ({
      minimumU: bounds.minimumU,
      maximumU: bounds.maximumU,
      minimumV: shelfCenterZ - shelfHalfHeight,
      maximumV: shelfCenterZ + shelfHalfHeight,
    })),
  ]
  return rectangularLatticeCells(bounds, honeycomb, keepouts).map(
    (cell) => cell.polygons,
  )
}

function openShelfBottomProtectedCircles(
  parameters: OpenGridOpenShelfParameters,
): ProtectedCircle[] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const protectedPegRadius =
    configuration.pegDiameter / 2 + honeycomb.bottomFeatureClearance
  return openGridOpenShelfPegCentersFor(parameters).map((center) => ({
    center,
    radius: protectedPegRadius,
  }))
}

function openShelfBottomCells(
  parameters: OpenGridOpenShelfParameters,
): OpenShelfBottomCell[] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const bottomLattice = honeycomb.bottomLattice
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  const dividerHalfWidth =
    configuration.innerPlateThickness / 2 + bottomLattice.ribThickness / 2
  const bounds: Rectangle2D = {
    minimumU: -width / 2 + honeycomb.bottomFrame,
    maximumU: width / 2 - honeycomb.bottomFrame,
    minimumV: -depth / 2 + honeycomb.bottomFrame,
    maximumV: depth / 2 - honeycomb.bottomFrame,
  }
  const dividerKeepouts = openGridOpenShelfDividerCentersFor(parameters).map(
    (dividerCenter): Rectangle2D => ({
      minimumU: dividerCenter - dividerHalfWidth,
      maximumU: dividerCenter + dividerHalfWidth,
      minimumV: bounds.minimumV,
      maximumV: bounds.maximumV,
    }),
  )
  const protectedCircles = openShelfBottomProtectedCircles(parameters)
  const cells: OpenShelfBottomCell[] = []

  for (const cell of rectangularLatticeCells(
    bounds,
    bottomLattice,
    dividerKeepouts,
  )) {
    const polygons = cell.polygons.filter(
      (polygon) =>
        !protectedCircles.some((circle) =>
          polygonIsInsideCircle(polygon, circle),
        ),
    )
    if (polygons.length === 0) continue
    const protectedPegIndices = protectedCircles.flatMap((circle, index) =>
      polygons.some((polygon) => polygonIntersectsCircle(polygon, circle))
        ? [index]
        : [],
    )
    cells.push({
      polygons,
      protectedPegIndices,
      isComplete: cell.isComplete && protectedPegIndices.length === 0,
    })
  }
  return cells.some((cell) => cell.isComplete) ? cells : []
}

function openShelfSlopedPlateCellPolygonGroups(
  parameters: OpenGridOpenShelfParameters,
): Point2D[][][] {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const bottomLattice = honeycomb.bottomLattice
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  const angle = openGridOpenShelfAngleRadiansFor(parameters.angle)
  const slopeLength = depth / Math.cos(angle)
  const dividerHalfWidth =
    configuration.innerPlateThickness / 2 + bottomLattice.ribThickness / 2
  const bounds: Rectangle2D = {
    minimumU: -width / 2 + honeycomb.bottomFrame,
    maximumU: width / 2 - honeycomb.bottomFrame,
    minimumV: -slopeLength / 2 + honeycomb.bottomFrame,
    maximumV: slopeLength / 2 - honeycomb.bottomFrame,
  }
  const dividerKeepouts = openGridOpenShelfDividerCentersFor(parameters).map(
    (dividerCenter): Rectangle2D => ({
      minimumU: dividerCenter - dividerHalfWidth,
      maximumU: dividerCenter + dividerHalfWidth,
      minimumV: bounds.minimumV,
      maximumV: bounds.maximumV,
    }),
  )
  return rectangularLatticeCells(bounds, bottomLattice, dividerKeepouts).map(
    (cell) => cell.polygons,
  )
}

function openShelfSlopedPanels(
  parameters: OpenGridOpenShelfParameters,
): OpenShelfSlopedPanel[] {
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [, depth] = openGridOpenShelfFootprintFor(parameters)
  const yFront = -depth / 2
  const yRear = depth / 2
  const panels: OpenShelfSlopedPanel[] = []
  for (
    let shelfIndex = 1;
    shelfIndex <= openGridOpenShelfShelfCountFor(parameters);
    shelfIndex += 1
  ) {
    const [lowerFrontZ, lowerRearZ] = openGridOpenShelfShelfLowerSurfaceZFor(
      parameters,
      shelfIndex,
    )
    panels.push({
      lowerFrontY: yFront,
      lowerRearY: yRear,
      lowerFrontZ,
      lowerRearZ,
      thickness: configuration.innerPlateThickness,
    })
  }

  const angle = openGridOpenShelfAngleRadiansFor(parameters.angle)
  const normalY = Math.sin(angle)
  const normalZ = Math.cos(angle)
  panels.push({
    lowerFrontY: yFront - normalY * configuration.outerWallThickness,
    lowerRearY: yRear - normalY * configuration.outerWallThickness,
    lowerFrontZ: parameters.height - normalZ * configuration.outerWallThickness,
    lowerRearZ:
      openGridOpenShelfTopOuterRearZFor(parameters) -
      normalZ * configuration.outerWallThickness,
    thickness: configuration.outerWallThickness,
  })
  return panels
}

function transformSlopedPlateCutter(
  shape: Shape3D,
  angleDegrees: number,
  translation: [number, number, number],
): Shape3D {
  let current: Shape3D | null = shape
  try {
    if (Math.abs(angleDegrees) > EPSILON) {
      const rotated = current.rotate(-angleDegrees, [0, 0, 0], [1, 0, 0])
      if (rotated !== current) deleteShape(current)
      current = rotated
    }
    const translated = current.translate(...translation)
    if (translated !== current) deleteShape(current)
    current = null
    return translated
  } finally {
    deleteShape(current)
  }
}

function openShelfSlopedPlateCutter(
  polygons: readonly (readonly Point2D[])[],
  panel: OpenShelfSlopedPanel,
  parameters: OpenGridOpenShelfParameters,
): Shape3D {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const margin = honeycomb.cutterMargin
  const base = extrudePolygonGroup(
    'XY',
    [0, 0, -margin],
    polygons,
    panel.thickness + margin * 2,
  )
  return transformSlopedPlateCutter(base, parameters.angle, [
    0,
    (panel.lowerFrontY + panel.lowerRearY) / 2,
    (panel.lowerFrontZ + panel.lowerRearZ) / 2,
  ])
}

export function makeOpenGridOpenShelfWallHoneycombCutters(
  parameters: OpenGridOpenShelfParameters,
  context: OpenGridHoneycombBuildContext = {},
): Shape3D[] {
  if (!parameters.honeycombMode) return []
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const [width, depth] = openGridOpenShelfFootprintFor(parameters)
  const yRear = depth / 2
  const margin = honeycomb.cutterMargin
  const verticalCellGroups = openShelfVerticalPanelCellPolygonGroups(parameters)
  const wallLayouts = [
    {
      xStart: -width / 2 - margin,
      thickness: configuration.outerWallThickness,
      cells: verticalCellGroups,
    },
    {
      xStart: width / 2 - configuration.outerWallThickness - margin,
      thickness: configuration.outerWallThickness,
      cells: verticalCellGroups,
    },
    ...openGridOpenShelfDividerCentersFor(parameters).map((centerX) => ({
      xStart: centerX - configuration.innerPlateThickness / 2 - margin,
      thickness: configuration.innerPlateThickness,
      cells: verticalCellGroups,
    })),
  ]

  const cutters: Shape3D[] = []
  try {
    for (const layout of wallLayouts) {
      for (const polygons of layout.cells) {
        assertHoneycombGenerationCurrent(context)
        cutters.push(
          extrudePolygonGroup(
            'YZ',
            [layout.xStart, 0, 0],
            polygons,
            layout.thickness + margin * 2,
            [1, 0, 0],
          ),
        )
      }
    }

    for (const polygons of openShelfBackboardCellPolygonGroups(parameters)) {
      assertHoneycombGenerationCurrent(context)
      cutters.push(
        extrudePolygonGroup(
          'XZ',
          [0, yRear - configuration.backboardThickness - margin, 0],
          polygons,
          configuration.backboardThickness + margin * 2,
          [0, 1, 0],
        ),
      )
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

export function makeOpenGridOpenShelfPlateHoneycombCutters(
  parameters: OpenGridOpenShelfParameters,
  context: OpenGridHoneycombBuildContext = {},
): Shape3D[] {
  if (!parameters.honeycombMode) return []
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const configuration = OPENGRID_OPEN_SHELF_CONFIGURATION
  const margin = honeycomb.cutterMargin
  const bottomCells = openShelfBottomCells(parameters)
  const protectedCircles = openShelfBottomProtectedCircles(parameters)
  const protectorOperationCount = bottomCells.reduce(
    (count, cell) => count + cell.protectedPegIndices.length,
    0,
  )
  const protectorScope = context.booleanOperations?.createScope(
    protectorOperationCount,
  )
  const cutters: Shape3D[] = []
  const pegProtectors: Shape3D[] = []
  try {
    if (protectorOperationCount > 0) {
      for (const circle of protectedCircles) {
        pegProtectors.push(
          makeCylinder(
            circle.radius,
            configuration.bottomThickness + margin * 2,
            [circle.center[0], circle.center[1], -margin],
          ),
        )
      }
    }

    for (const cell of bottomCells) {
      assertHoneycombGenerationCurrent(context)
      let active: Shape3D | null = extrudePolygonGroup(
        'XY',
        [0, 0, -margin],
        cell.polygons,
        configuration.bottomThickness + margin * 2,
      )
      try {
        for (const protectorIndex of cell.protectedPegIndices) {
          assertHoneycombGenerationCurrent(context)
          const current: Shape3D | null = active
          const protector = pegProtectors[protectorIndex]
          if (!current || !protector) {
            throw new Error('OPENGRID_HONEYCOMB_PROTECTOR_EMPTY')
          }
          const clipped: Shape3D = measureBooleanInScope(
            protectorScope,
            'cut',
            () => current.cut(protector),
          )
          deleteShape(current)
          active = clipped
        }
        if (!active) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
        cutters.push(active)
        active = null
      } finally {
        deleteShape(active)
      }
    }

    const slopedCellGroups = openShelfSlopedPlateCellPolygonGroups(parameters)
    for (const panel of openShelfSlopedPanels(parameters)) {
      for (const polygons of slopedCellGroups) {
        assertHoneycombGenerationCurrent(context)
        cutters.push(openShelfSlopedPlateCutter(polygons, panel, parameters))
      }
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  } finally {
    pegProtectors.forEach(deleteShape)
  }
}

export function openGridOpenShelfHoneycombCellCountFor(
  parameters: OpenGridOpenShelfParameters,
): number {
  if (!parameters.honeycombMode) return 0
  const verticalCellCount =
    openShelfVerticalPanelCellPolygonGroups(parameters).length
  const outerWallCount = verticalCellCount * 2
  const dividerWallCount =
    verticalCellCount * openGridOpenShelfDividerCentersFor(parameters).length
  const backboardCount = openShelfBackboardCellPolygonGroups(parameters).length
  const bottomCount = openShelfBottomCells(parameters).length
  const slopedPanelCount = openShelfSlopedPanels(parameters).length
  const slopedCellCount =
    openShelfSlopedPlateCellPolygonGroups(parameters).length * slopedPanelCount
  return (
    outerWallCount +
    dividerWallCount +
    backboardCount +
    bottomCount +
    slopedCellCount
  )
}
