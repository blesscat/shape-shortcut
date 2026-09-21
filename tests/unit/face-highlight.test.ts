import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createFaceHighlightGeometry } from '../../src/features/cad/viewport/face-highlight'

function snapshotWithTwoFaces() {
  // Face A: unit quad on Z=0 (triangles 0-1, vertices 0-3)
  // Face B: triangle offset in X (triangle 2, vertex 4-6)
  const positions = new Float32Array([
    0, 0, 0, 4, 0, 0, 4, 2, 0, 0, 2, 0, 10, 0, 0, 12, 0, 0, 10, 2, 0,
  ])
  const normals = new Float32Array(7 * 3).fill(0)
  const indices = new Uint32Array([
    0,
    1,
    2, // face A
    0,
    2,
    3, // face A
    4,
    5,
    6, // face B
  ])
  return {
    positions: positions.buffer,
    normals: normals.buffer,
    indices: indices.buffer,
  }
}

describe('createFaceHighlightGeometry', () => {
  it('builds an overlay geometry limited to the hovered face vertices', () => {
    const geometry = createFaceHighlightGeometry(
      snapshotWithTwoFaces(),
      new Uint32Array([0, 2, 2, 1]),
      0,
    )
    expect(geometry).not.toBeNull()
    const position = geometry?.getAttribute('position') as THREE.BufferAttribute
    expect(position.count).toBe(4)
    const index = geometry?.getIndex()
    expect(index?.count).toBe(6)
    expect(Array.from(index?.array ?? [])).toEqual([0, 1, 2, 0, 2, 3])
    expect(position.getX(0)).toBe(0)
    expect(position.getX(1)).toBe(4)
    geometry?.dispose()
  })

  it('rebases indices for faces later in the buffer', () => {
    const geometry = createFaceHighlightGeometry(
      snapshotWithTwoFaces(),
      new Uint32Array([0, 2, 2, 1]),
      2,
    )
    expect(geometry).not.toBeNull()
    const position = geometry?.getAttribute('position') as THREE.BufferAttribute
    expect(position.count).toBe(3)
    expect(position.getX(0)).toBe(10)
    const index = geometry?.getIndex()
    expect(Array.from(index?.array ?? [])).toEqual([0, 1, 2])
    geometry?.dispose()
  })

  it('returns null for triangle indices outside every face range', () => {
    expect(
      createFaceHighlightGeometry(
        snapshotWithTwoFaces(),
        new Uint32Array([0, 2, 2, 1]),
        3,
      ),
    ).toBeNull()
  })
})
