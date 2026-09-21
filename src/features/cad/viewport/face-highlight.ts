import * as THREE from 'three'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import { findFaceTriangleRange } from './face-measure'

/**
 * Builds an overlay geometry for a single face. The face's triangles are
 * contiguous in the index buffer and its vertices contiguous in the position
 * buffer, so the overlay is a small slice of the committed mesh (mesh
 * coordinates equal world coordinates - the model mesh carries no transform).
 */
export function createFaceHighlightGeometry(
  snapshot: Pick<MeshSnapshot, 'positions' | 'normals' | 'indices'>,
  ranges: Uint32Array,
  triangleIndex: number,
): THREE.BufferGeometry | null {
  const range = findFaceTriangleRange(ranges, triangleIndex)
  if (!range) return null

  const indices = new Uint32Array(snapshot.indices)
  const firstIndex = range.start * 3
  const lastIndex = (range.start + range.count) * 3

  let vertexMin = Number.MAX_SAFE_INTEGER
  let vertexMax = 0
  for (let index = firstIndex; index < lastIndex; index += 1) {
    const vertex = indices[index]
    if (vertex < vertexMin) vertexMin = vertex
    if (vertex > vertexMax) vertexMax = vertex
  }
  if (vertexMin === Number.MAX_SAFE_INTEGER) return null

  const positions = new Float32Array(snapshot.positions)
  const normals = new Float32Array(snapshot.normals)
  const overlayPositions = positions.slice(vertexMin * 3, vertexMax * 3 + 3)
  const overlayNormals = normals.slice(vertexMin * 3, vertexMax * 3 + 3)
  const overlayIndices = indices.slice(firstIndex, lastIndex)
  for (let index = 0; index < overlayIndices.length; index += 1) {
    overlayIndices[index] -= vertexMin
  }
  if (overlayIndices.length % 3 !== 0) {
    return null
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(overlayPositions, 3),
  )
  geometry.setAttribute('normal', new THREE.BufferAttribute(overlayNormals, 3))
  geometry.setIndex(new THREE.BufferAttribute(overlayIndices, 1))
  geometry.computeBoundingSphere()
  return geometry
}
