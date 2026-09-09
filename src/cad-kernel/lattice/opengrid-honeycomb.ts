import {
  CompoundSketch,
  makeBox,
  makeCompound,
  makeCylinder,
  Sketcher,
  type Sketch,
  type Shape3D,
} from 'replicad'
import { measureBooleanInScope } from '../boolean-progress'
import {
  assertPanelProfile,
  boxBottomClippedHexagon,
  boxBottomHoneycombCenters,
  boxBottomProtectors,
  boxSideCellPolygonGroups,
  boxSideOpeningKeepout,
  boxSidePanelBounds,
  boundsForPolygons,
  cylinderBottomHoneycombCells,
  cylinderBottomOpeningRadius,
  cylinderBottomProtectedCircles,
  cylinderSideCellGroups,
  expandedPanelBounds,
  openShelfBackboardCellPolygonGroups,
  openShelfBottomCells,
  openShelfBottomProtectedCircles,
  openShelfSlopedPanels,
  openShelfSlopedPlateCellPolygonGroups,
  openShelfVerticalPanelCellPolygonGroups,
  polygonIntersectsProtector,
  rectanglePoints,
  EPSILON,
  OPENGRID_HONEYCOMB_PANEL_OVERLAP,
  OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE,
  OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE,
  type BoxBottomProtector,
  type BoxSide,
  type OpenShelfSlopedPanel,
  type OpenGridHoneycombBuildContext,
  type Point2D,
} from './opengrid-honeycomb-cells'
import {
  nominalOpenGridStackableBoxFootprintFor,
  openGridOpenShelfDividerCentersFor,
  openGridOpenShelfFootprintFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableCylinderDerivedGeometryFor,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridOpenShelfParameters,
  type OpenGridStackableBoxParameters,
  type OpenGridStackableCylinderParameters,
} from '../../cad-contract/units'

// Re-export the replicad-free lattice API so existing worker-side imports
// keep working; the client bundle imports './opengrid-honeycomb-cells'
// directly.
export {
  EPSILON,
  OPENGRID_HONEYCOMB_PANEL_OVERLAP,
  OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE,
  OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE,
  OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_BUDGET,
  estimateOpenGridStackableBoxHoneycombMemory,
  openGridOpenShelfHoneycombCellCountFor,
  openGridStackableBoxBottomHoneycombCellCountFor,
  openGridStackableBoxHoneycombCellCountFor,
  openGridStackableBoxHoneycombPanelCellCountFor,
  openGridStackableBoxSideHoneycombCellCountFor,
  openGridStackableBoxHoneycombSocketProtectionRadiusFor,
  openGridStackableCylinderBottomHoneycombCellCountFor,
  openGridStackableCylinderHoneycombCellCountFor,
} from './opengrid-honeycomb-cells'
export type {
  OpenGridHoneycombBuildContext,
  OpenGridStackableBoxHoneycombMemoryEstimate,
} from './opengrid-honeycomb-cells'

type Plane = 'XY' | 'YZ' | 'XZ'

const BOX_BOTTOM_CLIP_BATCH_SIZE = 128

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

export type OpenGridStackableBoxSideHoneycombPanel = Readonly<{
  panel: Shape3D | null
  cellCount: number
}>

export function makeOpenGridStackableBoxSideHoneycombPanel(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
  context: OpenGridHoneycombBuildContext = {},
  batchStart = 0,
  batchSize = OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE,
): OpenGridStackableBoxSideHoneycombPanel {
  // Keep each clipped hexagon as one wire. A side opening is masked from the
  // panel slot below; splitting a hexagon into several coplanar fragments can
  // make adjacent wires touch at the opening boundary and invalidate the
  // compound sketch.
  const groups = boxSideCellPolygonGroups(parameters, side, false)
  const batch = groups.slice(batchStart, batchStart + batchSize)
  if (batch.length === 0) return { panel: null, cellCount: 0 }

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
  return {
    panel: extrudePolygonWithHoles(
      plane,
      origin,
      rectanglePoints(panel),
      holes,
      distance,
      direction,
    ),
    cellCount: batch.length,
  }
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
  cellCount: number
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
    return { panel: null, slot: null, cellCount: 0 }
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
    return { panel, slot, cellCount: batch.length }
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
