import {
  ExtrudeGeometry,
  Path,
  Shape,
  Matrix4,
  type BufferGeometry,
} from 'three'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { ModelId, ModelParameterValues } from '../../../cad-contract/units'
import { getModelDefinition } from '../model-catalog'
import type { Point2, PreviewSolid } from './description'

function trace<T extends Path>(path: T, points: Point2[]): T {
  path.moveTo(...points[0])
  for (const point of points.slice(1)) path.lineTo(...point)
  path.closePath()
  return path
}

function materialize(solid: PreviewSolid): BufferGeometry {
  const shape = trace(new Shape(), solid.outline)
  if (solid.hole) shape.holes.push(trace(new Path(), solid.hole))
  const geometry = new ExtrudeGeometry(shape, {
    depth: solid.depth,
    bevelEnabled: false,
    steps: 1,
  })
  const { u, v, w, origin: o } = solid
  geometry.applyMatrix4(
    new Matrix4().set(
      u[0],
      v[0],
      w[0],
      o[0],
      u[1],
      v[1],
      w[1],
      o[1],
      u[2],
      v[2],
      w[2],
      o[2],
      0,
      0,
      0,
      1,
    ),
  )
  return geometry
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

export function createSimplifiedMesh(
  modelId: ModelId,
  parameters: ModelParameterValues,
): MeshSnapshot | null {
  const definition = getModelDefinition(modelId)
  if (!definition) return null
  const validation = definition.validateParameters(parameters)
  if (!validation.valid) return null
  const description = definition.simplifiedPreview(validation.value.parameters)
  return snapshotAndDispose(description.map(materialize))
}
