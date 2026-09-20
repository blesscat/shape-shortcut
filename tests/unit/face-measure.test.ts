import { describe, expect, it } from 'vitest'
import {
  findFaceTriangleRange,
  formatExtentValue,
  measureFaceAt,
  measureFaceBounds,
} from '../../src/features/cad/viewport/face-measure'

function snapshotFrom(
  positions: number[],
  indices: number[],
  faceRanges: number[],
): Parameters<typeof measureFaceAt>[0] {
  return {
    positions: new Float32Array(positions).buffer,
    indices: new Uint32Array(indices).buffer,
    triangleCount: indices.length / 3,
  }
}

describe('findFaceTriangleRange', () => {
  const ranges = new Uint32Array([0, 2, 2, 1, 3, 4])

  it('finds the range containing a triangle index', () => {
    expect(findFaceTriangleRange(ranges, 0)).toEqual({ start: 0, count: 2 })
    expect(findFaceTriangleRange(ranges, 1)).toEqual({ start: 0, count: 2 })
    expect(findFaceTriangleRange(ranges, 2)).toEqual({ start: 2, count: 1 })
    expect(findFaceTriangleRange(ranges, 5)).toEqual({ start: 3, count: 4 })
    expect(findFaceTriangleRange(ranges, 6)).toEqual({ start: 3, count: 4 })
  })

  it('returns null for indices outside every range', () => {
    expect(findFaceTriangleRange(ranges, 7)).toBeNull()
    expect(findFaceTriangleRange(ranges, -1)).toBeNull()
  })
})

describe('measureFaceBounds', () => {
  it('computes the X/Y/Z extent of the face triangles', () => {
    const positions = new Float32Array([
      0,
      0,
      0, // vertex 0
      4,
      0,
      0, // vertex 1
      4,
      2,
      0, // vertex 2
      0,
      2,
      3, // vertex 3
      10,
      10,
      10, // vertex 4 (other face)
    ])
    const indices = new Uint32Array([
      0,
      1,
      2, // face A triangle 0
      0,
      2,
      3, // face A triangle 1
      4,
      4,
      4, // face B triangle 2 (degenerate but separate)
    ])
    const bounds = measureFaceBounds(positions, indices, { start: 0, count: 2 })
    expect(bounds).toEqual({
      min: [0, 0, 0],
      max: [4, 2, 3],
    })
  })
})

describe('measureFaceAt', () => {
  it('measures the face under a triangle index', () => {
    const snapshot = snapshotFrom(
      [0, 0, 0, 4, 0, 0, 4, 2, 0, 0, 2, 0],
      [0, 1, 2, 0, 2, 3],
      [0, 2],
    )
    const measurement = measureFaceAt(snapshot, new Uint32Array([0, 2]), 1)
    expect(measurement?.bounds).toEqual({
      min: [0, 0, 0],
      max: [4, 2, 0],
    })
    expect(measurement?.range).toEqual({ start: 0, count: 2 })
  })

  it('measures a tessellated cylindrical hole face with the same AABB semantics', () => {
    // 8mm-diameter, 5mm-deep hole approximated by 8 segments: vertices sit on
    // the cylinder surface, so the AABB recovers diameter and depth.
    const radius = 4
    const depth = 5
    const positions: number[] = []
    const indices: number[] = []
    const segments = 8
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      positions.push(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        0,
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        depth,
      )
      const next = (segment + 1) % segments
      indices.push(segment * 2, segment * 2 + 1, next * 2 + 1)
      indices.push(segment * 2, next * 2 + 1, next * 2)
    }
    const snapshot = snapshotFrom(positions, indices, [0, segments * 2])
    const measurement = measureFaceAt(
      snapshot,
      new Uint32Array([0, segments * 2]),
      0,
    )
    expect(measurement?.bounds.min[0]).toBeCloseTo(-radius, 5)
    expect(measurement?.bounds.max[0]).toBeCloseTo(radius, 5)
    expect(measurement?.bounds.min[1]).toBeCloseTo(-radius, 5)
    expect(measurement?.bounds.max[1]).toBeCloseTo(radius, 5)
    expect(measurement?.bounds.min[2]).toBe(0)
    expect(measurement?.bounds.max[2]).toBe(depth)
  })

  it('returns null without ranges, out-of-range triangles, or unknown ranges', () => {
    const snapshot = snapshotFrom(
      [0, 0, 0, 4, 0, 0, 4, 2, 0],
      [0, 1, 2],
      [0, 1],
    )
    expect(measureFaceAt(snapshot, null, 0)).toBeNull()
    expect(measureFaceAt(snapshot, new Uint32Array([0, 1]), 1)).toBeNull()
    expect(measureFaceAt(snapshot, new Uint32Array([0, 1]), -1)).toBeNull()
    expect(measureFaceAt(snapshot, new Uint32Array([1, 1]), 0)).toBeNull()
  })
})

describe('formatExtentValue', () => {
  it('rounds to two decimals with fixed notation', () => {
    expect(formatExtentValue(42)).toBe('42.00')
    expect(formatExtentValue(0)).toBe('0.00')
    expect(formatExtentValue(7.064999)).toBe('7.06')
    expect(formatExtentValue(7.065)).toBe('7.07')
  })
})
