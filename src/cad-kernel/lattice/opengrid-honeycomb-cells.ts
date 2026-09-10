import type { BooleanOperationReporter } from '../boolean-progress'
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

// This module is the replicad-free lattice core: 2D polygon math, honeycomb
// cell derivation, and cell counting. It is imported by the client bundle for
// the parameter-panel cell estimate, so it MUST NOT import 'replicad'.
// Native cutter construction stays in ./opengrid-honeycomb.

export type Point2D = [number, number]
export type BoxSide = OpenGridStackableBoxOpeningDirection
export type HoneycombLattice = Readonly<{
  anchorPitch: number
  rowPitch: number
  cellRadius: number
}>
export type Rectangle2D = Readonly<{
  minimumU: number
  maximumU: number
  minimumV: number
  maximumV: number
}>

export const EPSILON = 0.0001

export const OPENGRID_HONEYCOMB_PANEL_OVERLAP = 0.08
export const OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE = 1024
export const OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE = 2048

export type OpenGridHoneycombBuildContext = {
  isGenerationCurrent?: () => boolean
  booleanOperations?: BooleanOperationReporter
}

export function hexagonPoints(
  center: Point2D,
  lattice: HoneycombLattice,
): Point2D[] {
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

export function rectanglePoints(bounds: Rectangle2D): Point2D[] {
  return [
    [bounds.minimumU, bounds.minimumV],
    [bounds.maximumU, bounds.minimumV],
    [bounds.maximumU, bounds.maximumV],
    [bounds.minimumU, bounds.maximumV],
  ]
}

export function boundsForPolygons(
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

export function crossProduct(
  first: Point2D,
  second: Point2D,
  third: Point2D,
): number {
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

export function polygonsOverlapOrTouch(
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

export function assertPanelProfile(
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

export function latticeCenters(
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

export function boundaryOverlappingLatticeCenters(
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

export function clipPolygonToAxisBoundary(
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

export function clipPolygonToRectangle(
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

export function clipPolygonToBounds(
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

export function signedPolygonArea(points: readonly Point2D[]): number {
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

export function clipPolygonToConvexPolygon(
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

export function polygonArea(points: readonly Point2D[]): number {
  return Math.abs(signedPolygonArea(points))
}

export function polygonBounds(points: readonly Point2D[]): Rectangle2D {
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

export function polygonIsInsideRectangle(
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

export function nonEmptyPolygons(
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

export function subtractRectanglesFromPolygons(
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

export function distanceSquared(first: Point2D, second: Point2D): number {
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

export function boxSidePanelBounds(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
): Rectangle2D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const lowerFrame = honeycomb.lowerFrame
  const tangentSpan = side === '+X' || side === '-X' ? depth : width
  return {
    minimumU: -tangentSpan / 2 + honeycomb.sideFrame,
    maximumU: tangentSpan / 2 - honeycomb.sideFrame,
    minimumV: derived.activeFloorTopZ + lowerFrame,
    maximumV: derived.activeUpperInnerRimZ - honeycomb.topFrame,
  }
}

export function boxSideOpeningKeepout(
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

export function boxSideCellPolygonGroups(
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

export function expandedPanelBounds(bounds: Rectangle2D): Rectangle2D {
  const overlap = OPENGRID_HONEYCOMB_PANEL_OVERLAP
  return {
    minimumU: bounds.minimumU - overlap,
    maximumU: bounds.maximumU + overlap,
    minimumV: bounds.minimumV - overlap,
    maximumV: bounds.maximumV + overlap,
  }
}

export type ProtectedCircle = Readonly<{
  center: Point2D
  radius: number
}>

export type ProtectedBand = Readonly<{
  axis: 0 | 1
  position: number
  halfWidth: number
}>

export type BoxBottomProtector =
  | Readonly<{ type: 'circle'; circle: ProtectedCircle }>
  | Readonly<{ type: 'band'; band: ProtectedBand }>

export function boxBottomProtectedCircles(
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
  if (parameters.bottomMode !== 'stacking') return []

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

export function boxBottomProtectors(
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

export function boxBottomClippedHexagon(
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

export function polygonIsInsideCircle(
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

export function pointIsInsidePolygon(
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

export function polygonIntersectsCircle(
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

export function polygonIntersectsProtector(
  points: readonly Point2D[],
  protector: BoxBottomProtector,
): boolean {
  return protector.type === 'circle'
    ? polygonIntersectsCircle(points, protector.circle)
    : polygonIntersectsBand(points, protector.band)
}

export function boxBottomHoneycombCenters(
  parameters: OpenGridStackableBoxParameters,
): Point2D[] {
  if (parameters.bottomMode === 'none') return []
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

export function cylinderSideOpeningKeepouts(
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

export type CylinderSideCellGroup = Readonly<{
  tangent: number
  polygons: Point2D[][]
}>

export function cylinderSideCellGroups(
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

export type CylinderBottomCell = Readonly<{
  points: Point2D[]
  clippedAtFrame: boolean
  protectedCircleIndices: number[]
}>

export function cylinderBottomOpeningRadius(
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

export function cylinderBottomProtectedCircles(
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

export function cylinderBottomHoneycombCells(
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

// Cell count on the same basis the panel builder cuts with: side cells keep
// their full hexagon outline (the panel slot masks the opening), so the
// progress total and per-panel advances sum exactly to this number.
export function openGridStackableBoxHoneycombPanelCellCountFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  if (!parameters.honeycombMode) return 0
  let count = 0
  for (const side of ['+X', '-X', '+Y', '-Y'] as const) {
    count += boxSideCellPolygonGroups(parameters, side, false).length
  }
  count += boxBottomHoneycombCenters(parameters).length
  return count
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

export type OpenShelfSlopedPanel = {
  lowerFrontY: number
  lowerRearY: number
  lowerFrontZ: number
  lowerRearZ: number
  thickness: number
}

export type OpenShelfParallelBand = {
  lowerNormalOffset: number
  upperNormalOffset: number
}

export type ClippedLatticeCell = {
  polygons: Point2D[][]
  isComplete: boolean
}

export type OpenShelfBottomCell = ClippedLatticeCell & {
  protectedPegIndices: number[]
}

export function polygonGroupArea(
  polygons: readonly (readonly Point2D[])[],
): number {
  return polygons.reduce((area, polygon) => area + polygonArea(polygon), 0)
}

export function rectangularLatticeCells(
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

export function convexLatticeCells(
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

export function openShelfRegularVerticalCellPolygonGroups(
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

export function openShelfVerticalPanelCellPolygonGroups(
  parameters: OpenGridOpenShelfParameters,
): Point2D[][][] {
  return [
    ...openShelfBottomWedgeCellPolygonGroups(parameters),
    ...openShelfRegularVerticalCellPolygonGroups(parameters),
  ]
}

export function openShelfBackboardCellPolygonGroups(
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

export function openShelfBottomProtectedCircles(
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

export function openShelfBottomCells(
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

export function openShelfSlopedPlateCellPolygonGroups(
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

export function openShelfSlopedPanels(
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
