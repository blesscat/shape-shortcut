import { makeBox, Sketcher, type Shape3D } from 'replicad'
import {
  OPENGRID_GRID_CONFIGURATION,
  OPENGRID_CONFIGURATION,
  type OpenGridSnapFootprint,
} from '../../../cad-contract/units'
import {
  openGridLiteCornerProfile,
  openGridLiteTileProfile,
  openGridProfileConstants,
} from '../opengrid/profile'
import {
  measureBooleanInScope,
  type BooleanOperationScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'

type BoundaryInterfaceX = 'left' | 'right' | null
type BoundaryInterfaceY = 'bottom' | 'top' | null

type BoundaryTile = {
  width: number
  depth: number
  interfaceX: BoundaryInterfaceX
  interfaceY: BoundaryInterfaceY
}

/**
 * The edge material that an OpenGrid snap footprint must avoid.
 *
 * These values intentionally mirror the official OpenGrid profile.  The
 * boundary is built locally from the rail and corner profiles instead of
 * loading the full board STEP at runtime.
 */
export const OPENGRID_SNAP_BOUNDARY_PROFILE = {
  pitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  halfPitch: OPENGRID_GRID_CONFIGURATION.halfPitch,
  liteThickness: OPENGRID_CONFIGURATION.variants.Lite.thickness,
  boundaryHeight: OPENGRID_CONFIGURATION.variants.Full.thickness,
  cornerWidth: openGridProfileConstants(
    OPENGRID_GRID_CONFIGURATION.fullPitch,
    OPENGRID_CONFIGURATION.variants.Lite.thickness,
  ).cornerWidth,
  diagonalCornerInset: OPENGRID_CONFIGURATION.intersectionDistance,
  seamOverlap: 0.2,
} as const

function extrudeProfile(
  plane: 'YZ' | 'XZ',
  origin: [number, number, number],
  profile: readonly [number, number][],
  distance: number,
  direction: [number, number, number],
): Shape3D {
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = profile[0]
    if (!first) throw new Error('OPENGRID_SNAP_BOUNDARY_PROFILE_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of profile.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(distance, { extrusionDirection: direction })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

type Point2D = [number, number]

function extrudePolygon(points: readonly Point2D[], height: number): Shape3D {
  const sketcher = new Sketcher('XY', [0, 0, 0])
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = points[0]
    if (!first) throw new Error('OPENGRID_SNAP_BOUNDARY_POLYGON_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(height)
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function clipCornerPolygon(
  width: number,
  depth: number,
  cornerDiagonal: number,
): Point2D[] {
  const source: Point2D[] = [
    [0, 0],
    [width, 0],
    [width, depth],
    [0, depth],
  ]
  const clipped: Point2D[] = []

  const isInside = (point: Point2D): boolean =>
    point[0] + point[1] >= cornerDiagonal - 1e-9

  const intersection = (first: Point2D, second: Point2D): Point2D => {
    const firstSum = first[0] + first[1]
    const secondSum = second[0] + second[1]
    const denominator = secondSum - firstSum
    if (Math.abs(denominator) <= 1e-9) return [...first]
    const ratio = (cornerDiagonal - firstSum) / denominator
    return [
      first[0] + (second[0] - first[0]) * ratio,
      first[1] + (second[1] - first[1]) * ratio,
    ]
  }

  for (let index = 0; index < source.length; index += 1) {
    const first = source[index]
    const second = source[(index + 1) % source.length]
    if (!first || !second) continue
    const firstInside = isInside(first)
    const secondInside = isInside(second)
    if (firstInside) clipped.push([...first])
    if (firstInside !== secondInside) {
      clipped.push(intersection(first, second))
    }
  }
  return clipped
}

function buildFullHeightCornerWedge(
  width: number,
  depth: number,
  cornerX: -1 | 1,
  cornerY: -1 | 1,
): Shape3D | null {
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const cornerDiagonal =
    halfWidth + halfDepth - OPENGRID_SNAP_BOUNDARY_PROFILE.cornerWidth
  const localPolygon = clipCornerPolygon(halfWidth, halfDepth, cornerDiagonal)
  if (localPolygon.length < 3) return null
  const polygon = localPolygon.map(
    ([x, y]) => [cornerX * x, cornerY * y] as Point2D,
  )
  return extrudePolygon(polygon, OPENGRID_SNAP_BOUNDARY_PROFILE.boundaryHeight)
}

function addFullHeightCornerWedges(
  parts: Shape3D[],
  width: number,
  depth: number,
): void {
  for (const cornerX of [-1, 1] as const) {
    for (const cornerY of [-1, 1] as const) {
      const wedge = buildFullHeightCornerWedge(width, depth, cornerX, cornerY)
      if (wedge) parts.push(wedge)
    }
  }
}

function buildRail(): Shape3D {
  const halfPitch = OPENGRID_SNAP_BOUNDARY_PROFILE.halfPitch
  return extrudeProfile(
    'YZ',
    [-halfPitch, -halfPitch, 0],
    openGridLiteTileProfile(),
    OPENGRID_SNAP_BOUNDARY_PROFILE.pitch,
    [1, 0, 0],
  )
}

function buildCornerNode(): Shape3D {
  const thickness = OPENGRID_SNAP_BOUNDARY_PROFILE.liteThickness
  const constants = openGridProfileConstants(
    OPENGRID_SNAP_BOUNDARY_PROFILE.pitch,
    thickness,
  )
  const profile = openGridLiteCornerProfile()
  const shape = extrudeProfile(
    'XZ',
    [0, -constants.cornerOffset, 0],
    profile,
    constants.cornerOffset * 2,
    [0, 1, 0],
  )
  const rotated = shape.rotate(45, [0, 0, 0], [0, 0, 1])
  if (rotated !== shape) deleteShape(shape)
  const translated = rotated.translate(-halfPitch(), -halfPitch(), 0)
  if (translated !== rotated) deleteShape(rotated)
  return translated
}

function halfPitch(): number {
  return OPENGRID_SNAP_BOUNDARY_PROFILE.halfPitch
}

function rotateShape(shape: Shape3D, quarterTurns: number): Shape3D {
  if (quarterTurns === 0) return shape
  const rotated = shape.rotate(quarterTurns * 90, [0, 0, 0], [0, 0, 1])
  if (rotated !== shape) deleteShape(shape)
  return rotated
}

function translateShape(shape: Shape3D, x: number, y: number): Shape3D {
  const translated = shape.translate(x, y, 0)
  if (translated !== shape) deleteShape(shape)
  return translated
}

function clipShapeToBox(
  shape: Shape3D,
  clip: Shape3D,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  const clipped = measureBooleanInScope(scope, 'intersect', () =>
    shape.intersect(clip),
  )
  if (clipped !== shape) deleteShape(shape)
  return clipped
}

function fuseParts(
  parts: Shape3D[],
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  const first = parts.shift()
  if (!first) throw new Error('OPENGRID_SNAP_BOUNDARY_PARTS_EMPTY')

  let result = first
  let extension: Shape3D | null = null
  const fuseScope = reporter?.createScope(parts.length)
  try {
    while (parts.length > 0) {
      extension = parts.shift() ?? null
      if (!extension) continue
      const activeExtension = extension
      const fused = measureBooleanInScope(fuseScope, 'fuse', () =>
        result.fuse(activeExtension, { optimisation: 'none' }),
      )
      if (fused !== result) deleteShape(result)
      deleteShape(extension)
      extension = null
      result = fused
    }
    return result
  } catch (error) {
    deleteShape(extension)
    deleteShape(result)
    for (const part of parts) deleteShape(part)
    throw error
  }
}

function addSeamOverlap(
  parts: Shape3D[],
  width: number,
  depth: number,
  interfaceX: BoundaryInterfaceX,
  interfaceY: BoundaryInterfaceY,
): void {
  const overlap = OPENGRID_SNAP_BOUNDARY_PROFILE.seamOverlap
  const thickness = OPENGRID_SNAP_BOUNDARY_PROFILE.liteThickness

  if (interfaceX === 'left') {
    parts.push(
      makeBox(
        [width / 2 - overlap, -depth / 2, 0],
        [width / 2 + overlap, depth / 2, thickness],
      ),
    )
  }
  if (interfaceX === 'right') {
    parts.push(
      makeBox(
        [-width / 2 - overlap, -depth / 2, 0],
        [-width / 2 + overlap, depth / 2, thickness],
      ),
    )
  }
  if (interfaceY === 'bottom') {
    parts.push(
      makeBox(
        [-width / 2, depth / 2 - overlap, 0],
        [width / 2, depth / 2 + overlap, thickness],
      ),
    )
  }
  if (interfaceY === 'top') {
    parts.push(
      makeBox(
        [-width / 2, -depth / 2 - overlap, 0],
        [width / 2, -depth / 2 + overlap, thickness],
      ),
    )
  }
}

function buildBoundaryTile(
  tile: BoundaryTile,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  const { width, depth, interfaceX, interfaceY } = tile
  const rail = buildRail()
  const corner = buildCornerNode()
  const parts: Shape3D[] = []
  const cornerWedges: Shape3D[] = []
  let clip: Shape3D | null = null
  let boundary: Shape3D | null = null
  let cornerWedge: Shape3D | null = null

  try {
    const railPlacements: Array<[number, number, number]> = [
      [0, -depth / 2 + halfPitch(), 0],
      [0, depth / 2 - halfPitch(), 2],
      [width / 2 - halfPitch(), 0, 1],
      [-width / 2 + halfPitch(), 0, 3],
    ]
    for (const [x, y, quarterTurns] of railPlacements) {
      parts.push(translateShape(rotateShape(rail.clone(), quarterTurns), x, y))
    }

    const currentAnchors: Array<[number, number]> = [
      [-halfPitch(), -halfPitch()],
      [halfPitch(), -halfPitch()],
      [halfPitch(), halfPitch()],
      [-halfPitch(), halfPitch()],
    ]
    const targetAnchors: Array<[number, number]> = [
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
      [width / 2, depth / 2],
      [-width / 2, depth / 2],
    ]
    for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
      const currentAnchor = currentAnchors[quarterTurns]
      const targetAnchor = targetAnchors[quarterTurns]
      if (!currentAnchor || !targetAnchor) {
        throw new Error('OPENGRID_SNAP_BOUNDARY_CORNER_MISSING')
      }
      const placed = translateShape(
        rotateShape(corner.clone(), quarterTurns),
        targetAnchor[0] - currentAnchor[0],
        targetAnchor[1] - currentAnchor[1],
      )
      parts.push(placed)
    }

    clip = makeBox(
      [-width / 2, -depth / 2, -0.01],
      [
        width / 2,
        depth / 2,
        OPENGRID_SNAP_BOUNDARY_PROFILE.boundaryHeight + 0.01,
      ],
    )
    const intersectionScope = reporter?.createScope(parts.length)
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]
      if (!part) continue
      parts[index] = clipShapeToBox(part, clip, intersectionScope)
    }
    addSeamOverlap(parts, width, depth, interfaceX, interfaceY)
    boundary = fuseParts(parts, reporter)
    addFullHeightCornerWedges(cornerWedges, width, depth)
    if (cornerWedges.length === 0) {
      if (!boundary) {
        throw new Error('OPENGRID_SNAP_BOUNDARY_BASE_MISSING')
      }
      const result = boundary
      boundary = null
      return result
    }
    cornerWedge = fuseParts(cornerWedges, reporter)
    if (!boundary || !cornerWedge) {
      throw new Error('OPENGRID_SNAP_BOUNDARY_CORNER_WEDGE_MISSING')
    }
    const partsToFuse: Shape3D[] = [boundary, cornerWedge]
    boundary = null
    cornerWedge = null
    return fuseParts(partsToFuse, reporter)
  } catch (error) {
    for (const part of parts) deleteShape(part)
    for (const wedge of cornerWedges) deleteShape(wedge)
    deleteShape(boundary)
    deleteShape(cornerWedge)
    throw error
  } finally {
    deleteShape(rail)
    deleteShape(corner)
    deleteShape(clip)
  }
}

/**
 * Build only the official edge material surrounding the local snap footprint.
 * The returned shape is used as a cutter after the complete snap assembly has
 * been built, so bodies, holders, snaps, holes, supports, and offset all use
 * the same boundary operation.
 */
export function buildOpenGridSnapBoundaryObstacle(
  footprint: OpenGridSnapFootprint,
  reporter?: BooleanOperationReporter,
): Shape3D | null {
  if (footprint === 'full') return null

  if (footprint === 'half') {
    return buildBoundaryTile(
      {
        width: halfPitch(),
        depth: OPENGRID_SNAP_BOUNDARY_PROFILE.pitch,
        interfaceX: 'left',
        interfaceY: null,
      },
      reporter,
    )
  }

  const quarterTile = buildBoundaryTile(
    {
      width: halfPitch(),
      depth: halfPitch(),
      interfaceX: 'left',
      interfaceY: 'top',
    },
    reporter,
  )
  return quarterTile
}
