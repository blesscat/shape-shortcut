import { BlueprintSketcher, makeCompound, type Shape3D } from 'replicad'
import { LABEL_CARD_ICON_PATHS } from './icon-paths'
import {
  groupPolygonContours,
  parseSvgPath,
  SvgPathParseError,
  type PathPolygon,
} from './svg-path'

export const LABEL_CARD_ICON_CONFIGURATION = {
  /** Nominal rendered icon size on the plate face (square bounding box). */
  size: 6,
  depth: 0.3,
  /** Maximum flattened points per icon across all subpaths. */
  maxPoints: 4000,
} as const

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the primary geometry error.
  }
}

function scaleAndCenterPolygons(
  polygons: readonly PathPolygon[],
  targetSize: number,
): PathPolygon[] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const polygon of polygons) {
    for (const [x, y] of polygon) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  const span = Math.max(maxX - minX, maxY - minY)
  if (!Number.isFinite(span) || span <= 0) {
    throw new SvgPathParseError('SVG_PATH_NO_GEOMETRY')
  }
  const scale = targetSize / span
  const offsetX = (minX + maxX) / 2
  const offsetY = (minY + maxY) / 2
  // SVG Y points down; the card face uses CAD Y pointing up.
  return polygons.map((polygon) =>
    polygon.map(
      ([x, y]) =>
        [(x - offsetX) * scale, (offsetY - y) * scale] as [number, number],
    ),
  )
}

function totalPoints(polygons: readonly PathPolygon[]): number {
  return polygons.reduce((total, polygon) => total + polygon.length, 0)
}

function extrudePolygon(polygon: PathPolygon, depth: number): Shape3D {
  const [first, ...rest] = polygon
  if (!first) throw new SvgPathParseError('SVG_PATH_NO_GEOMETRY')
  const sketcher = new BlueprintSketcher([first[0], first[1]])
  for (const point of rest) {
    sketcher.lineTo([point[0], point[1]])
  }
  const blueprint = sketcher.close()
  try {
    const sketch = blueprint.sketchOnPlane()
    try {
      return sketch.extrude(depth) as Shape3D
    } finally {
      deleteShape(sketch)
    }
  } finally {
    deleteShape(blueprint)
  }
}

function extrudeContourGroup(
  outer: PathPolygon,
  holes: readonly PathPolygon[],
  depth: number,
): Shape3D {
  let solid: Shape3D | null = null
  const holeSolids: Shape3D[] = []
  try {
    solid = extrudePolygon(outer, depth)
    for (const hole of holes) {
      holeSolids.push(extrudePolygon(hole, depth))
    }
    for (const holeSolid of holeSolids) {
      const result: Shape3D = solid.cut(holeSolid)
      if (result !== solid) deleteShape(solid)
      solid = result
      deleteShape(holeSolid)
    }
    holeSolids.length = 0
    return solid
  } catch (error) {
    deleteShape(solid)
    for (const holeSolid of holeSolids) deleteShape(holeSolid)
    throw error
  }
}

/**
 * Builds the extruded icon solid for an icon id: all subpaths are flattened,
 * grouped into outer/hole contours, extruded to the accent depth, and fused
 * into one compound solid. Coordinates are centered on the icon origin with
 * the nominal rendered size.
 */
export function makeLabelCardIconShape(
  iconId: string,
  depth: number = LABEL_CARD_ICON_CONFIGURATION.depth,
): Shape3D {
  const icon = LABEL_CARD_ICON_PATHS[iconId]
  if (!icon) throw new Error('LABEL_CARD_ICON_UNKNOWN')

  const pieces: Shape3D[] = []
  try {
    let polygons: PathPolygon[] = []
    for (const path of icon.paths) {
      polygons.push(...parseSvgPath(path))
    }
    if (totalPoints(polygons) > LABEL_CARD_ICON_CONFIGURATION.maxPoints) {
      throw new SvgPathParseError('SVG_PATH_TOO_COMPLEX')
    }
    polygons = scaleAndCenterPolygons(
      polygons,
      LABEL_CARD_ICON_CONFIGURATION.size,
    )

    for (const [outer, ...holes] of groupPolygonContours(polygons)) {
      if (!outer) continue
      pieces.push(extrudeContourGroup(outer, holes, depth))
    }
    if (pieces.length === 0) throw new Error('LABEL_CARD_ICON_EMPTY')
    if (pieces.length === 1) {
      const single = pieces[0]!
      pieces.length = 0
      return single
    }
    const compound = makeCompound(pieces).asShape3D()
    pieces.length = 0
    return compound
  } catch (error) {
    for (const piece of pieces) deleteShape(piece)
    pieces.length = 0
    if (error instanceof SvgPathParseError) throw error
    throw new Error('LABEL_CARD_ICON_GEOMETRY_FAILED')
  }
}
