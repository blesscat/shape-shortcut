import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { BoxBounds } from '../../../cad-contract/units'

export type FaceTriangleRange = {
  start: number
  count: number
}

export type FaceMeasurement = {
  faceIndex: number
  range: FaceTriangleRange
  bounds: BoxBounds
}

/*
 * Measurement premise: the viewport renders the model mesh without any
 * transform, so mesh coordinates equal world coordinates. If a transform is
 * ever applied to the model, these bounds must account for it.
 */

export function findFaceTriangleRange(
  ranges: Uint32Array,
  triangleIndex: number,
): FaceTriangleRange | null {
  if (triangleIndex < 0) return null
  let low = 0
  let high = ranges.length / 2 - 1
  while (low <= high) {
    const middle = (low + high) >> 1
    const start = ranges[middle * 2] as number
    const count = ranges[middle * 2 + 1] as number
    if (triangleIndex < start) {
      high = middle - 1
    } else if (triangleIndex >= start + count) {
      low = middle + 1
    } else {
      return { start, count }
    }
  }
  return null
}

export function measureFaceBounds(
  positions: Float32Array,
  indices: Uint32Array,
  range: FaceTriangleRange,
): BoxBounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  const first = range.start * 3
  const last = (range.start + range.count) * 3
  for (let index = first; index < last; index += 1) {
    const vertex = indices[index] * 3
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[vertex + axis]
      if (value < min[axis]) min[axis] = value
      if (value > max[axis]) max[axis] = value
    }
  }
  return { min, max }
}

export function measureFaceAt(
  snapshot: Pick<MeshSnapshot, 'positions' | 'indices' | 'triangleCount'>,
  ranges: Uint32Array | null,
  triangleIndex: number,
): FaceMeasurement | null {
  if (!ranges || triangleIndex < 0 || triangleIndex >= snapshot.triangleCount) {
    return null
  }
  const range = findFaceTriangleRange(ranges, triangleIndex)
  if (!range) return null
  const bounds = measureFaceBounds(
    new Float32Array(snapshot.positions),
    new Uint32Array(snapshot.indices),
    range,
  )
  if (bounds.min.some((value) => !Number.isFinite(value))) return null
  return { faceIndex: triangleIndex, range, bounds }
}

export function formatExtentValue(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2)
}
