import {
  BoxGeometry,
  ExtrudeGeometry,
  Path,
  Shape,
  type BufferGeometry,
} from 'three'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import {
  type ModelId,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import {
  validateOpenGridStackableBoxParameters,
  nominalOpenGridStackableBoxFootprintFor,
  externalOpenGridStackableBoxHeightFor,
  openGridStackableBoxActiveFloorTopZFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units/opengrid-stackable-box'
import {
  validateOpenGridStackableCylinderParameters,
  openGridStackableCylinderDerivedGeometryFor,
  type OpenGridStackableCylinderParameters,
} from '../../../cad-contract/units/opengrid-stackable-cylinder'
import {
  validateOpenGridOrganizerBoxParameters,
  openGridOrganizerBoxLayoutFor,
  openGridOrganizerBoxPolygonPointsFor,
  type OpenGridOrganizerBoxParameters,
} from '../../../cad-contract/units/opengrid-organizer-box'

type Point = [number, number]
const CURVE_SEGMENTS = 24

export function supportsProgressivePreview(modelId: ModelId): boolean {
  return (
    modelId === 'opengrid-stackable-box' ||
    modelId === 'opengrid-stackable-cylinder' ||
    modelId === 'opengrid-organizer-box'
  )
}

function rectangle(width: number, depth: number): Point[] {
  return [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ]
}

function ellipse(width: number, depth: number): Point[] {
  return Array.from({ length: CURVE_SEGMENTS }, (_, i) => {
    const angle = (i * Math.PI * 2) / CURVE_SEGMENTS
    return [(Math.cos(angle) * width) / 2, (Math.sin(angle) * depth) / 2]
  })
}

function trace<T extends Path>(path: T, points: Point[]): T {
  path.moveTo(...points[0])
  for (const point of points.slice(1)) path.lineTo(...point)
  path.closePath()
  return path
}

function extrude(
  outline: Point[],
  hole: Point[] | null,
  height: number,
  z = 0,
): BufferGeometry {
  const shape = trace(new Shape(), outline)
  if (hole) shape.holes.push(trace(new Path(), hole))
  const geometry = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
  })
  geometry.translate(0, 0, z)
  return geometry
}

function floor(width: number, depth: number, height: number): BufferGeometry {
  return new BoxGeometry(width, depth, height).translate(0, 0, height / 2)
}

// Display-only triangles. No native shapes, export buffers or face identities.
function snapshotAndDispose(geometries: BufferGeometry[]): MeshSnapshot {
  const positions: number[] = []
  const normals: number[] = []
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  try {
    for (const geometry of geometries) {
      const position = geometry.getAttribute('position')
      const normal = geometry.getAttribute('normal')
      const count = geometry.index?.count ?? position.count
      for (let i = 0; i < count; i++) {
        const vertex = geometry.index?.getX(i) ?? i
        const xyz = [
          position.getX(vertex),
          position.getY(vertex),
          position.getZ(vertex),
        ]
        positions.push(...xyz)
        normals.push(
          normal.getX(vertex),
          normal.getY(vertex),
          normal.getZ(vertex),
        )
        for (let axis = 0; axis < 3; axis++) {
          min[axis] = Math.min(min[axis], xyz[axis])
          max[axis] = Math.max(max[axis], xyz[axis])
        }
      }
    }
    const count = positions.length / 3
    return {
      positions: new Float32Array(positions).buffer,
      normals: new Float32Array(normals).buffer,
      indices: Uint32Array.from({ length: count }, (_, i) => i).buffer,
      bounds: { min, max },
      triangleCount: count / 3,
    }
  } finally {
    for (const geometry of geometries) geometry.dispose()
  }
}

function boxPreview(p: OpenGridStackableBoxParameters): MeshSnapshot {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(p)
  const height = externalOpenGridStackableBoxHeightFor(p)
  const wall = OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness
  const shapes = [
    extrude(
      rectangle(width, depth),
      rectangle(width - 2 * wall, depth - 2 * wall),
      height,
    ),
  ]
  if (p.bottomMode !== 'none')
    shapes.push(floor(width, depth, openGridStackableBoxActiveFloorTopZFor(p)))
  return snapshotAndDispose(shapes)
}

function cylinderPreview(p: OpenGridStackableCylinderParameters): MeshSnapshot {
  const derived = openGridStackableCylinderDerivedGeometryFor(p)
  const outer = ellipse(derived.radius * 2, derived.radius * 2)
  const inner = ellipse(p.innerDiameter, p.innerDiameter)
  return snapshotAndDispose([
    extrude(outer, inner, p.height),
    extrude(inner, null, derived.floorThickness),
  ])
}

function cavityOutline(p: OpenGridOrganizerBoxParameters): Point[] {
  if (p.holeShape === 'circle') return ellipse(p.holeDiameter, p.holeDiameter)
  if (p.holeShape === 'ellipse') return ellipse(p.holeWidth, p.holeHeight)
  if (p.holeShape === 'rectangle') return rectangle(p.holeWidth, p.holeHeight)
  return openGridOrganizerBoxPolygonPointsFor(p.holeShape, p.holeDiameter)
}

function organizerPreview(p: OpenGridOrganizerBoxParameters): MeshSnapshot {
  const layout = openGridOrganizerBoxLayoutFor(p)
  const [width, depth] = layout.footprint
  const floorHeight = layout.interfaceFloorDatum + p.bottomThickness
  const hole = cavityOutline(p)
  const shapes: BufferGeometry[] = [floor(width, depth, floorHeight)]
  // One hole per cell keeps triangulation linear in cavity count instead of
  // triangulating a single large polygon with hundreds of holes.
  for (const [x, y] of layout.cavityCenters) {
    const halfX = layout.cavityPitch[0] / 2
    const halfY = layout.cavityPitch[1] / 2
    const left =
      x - halfX <= -layout.requiredSpan.x / 2 ? -width / 2 : x - halfX
    const right = x + halfX >= layout.requiredSpan.x / 2 ? width / 2 : x + halfX
    const bottom =
      y - halfY <= -layout.requiredSpan.y / 2 ? -depth / 2 : y - halfY
    const top = y + halfY >= layout.requiredSpan.y / 2 ? depth / 2 : y + halfY
    const outline: Point[] = [
      [left, bottom],
      [right, bottom],
      [right, top],
      [left, top],
    ]
    const translatedHole: Point[] = hole.map(([px, py]) => [px + x, py + y])
    shapes.push(extrude(outline, translatedHole, p.holeDepth, floorHeight))
  }
  if (layout.stacking) {
    shapes.push(
      extrude(
        rectangle(width, depth),
        rectangle(width - 2 * p.wallThickness, depth - 2 * p.wallThickness),
        layout.stacking.externalTopZ - layout.bodyHeight,
        layout.bodyHeight,
      ),
    )
  }
  return snapshotAndDispose(shapes)
}

export function createSimplifiedMesh(
  modelId: ModelId,
  parameters: ModelParameterValues,
): MeshSnapshot | null {
  if (modelId === 'opengrid-stackable-box') {
    const result = validateOpenGridStackableBoxParameters(parameters)
    if (result.valid) return boxPreview(result.value)
  }
  if (modelId === 'opengrid-stackable-cylinder') {
    const result = validateOpenGridStackableCylinderParameters(parameters)
    if (result.valid) return cylinderPreview(result.value)
  }
  if (modelId === 'opengrid-organizer-box') {
    const result = validateOpenGridOrganizerBoxParameters(parameters)
    if (result.valid) return organizerPreview(result.value)
  }
  return null
}
