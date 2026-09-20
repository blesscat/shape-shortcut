import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import { cloneMesh, meshBRep, serializeMesh } from '../../src/cad-kernel/mesh'

describe('CAD mesh boundary', () => {
  it('reports bounds from the generated mesh positions', () => {
    const shape = {
      mesh: vi.fn(() => ({
        vertices: [-1, -2, -3, 4, 5, 6, 0, 1, 2],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        triangles: [0, 1, 2],
      })),
    }

    expect(
      meshBRep(shape as unknown as Shape3D, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      }).bounds,
    ).toEqual({
      min: [-1, -2, -3],
      max: [4, 5, 6],
    })
  })

  it('maps native mesh failures to a stable mesh error', () => {
    const shape = {
      mesh: vi.fn(() => {
        throw new Error('OpenCascade meshing failed')
      }),
    }

    expect(() =>
      meshBRep(shape as unknown as Shape3D, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      }),
    ).toThrow('MESH_INVALID: OpenCascade meshing failed')
  })

  it('omits face ranges on the fallback mesh path', () => {
    const shape = {
      mesh: vi.fn(() => ({
        vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        triangles: [0, 1, 2],
      })),
    }

    const mesh = meshBRep(shape as unknown as Shape3D, {
      tolerance: 0.01,
      angularTolerance: 0.1,
    })
    expect(mesh.faceRanges).toBeUndefined()
    expect(serializeMesh(mesh).faceTriangleRanges).toBeUndefined()
  })

  it('clones face ranges without sharing buffers', () => {
    const mesh = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
      bounds: {
        min: [0, 0, 0] as [number, number, number],
        max: [1, 1, 0] as [number, number, number],
      },
      triangleCount: 1,
      faceRanges: new Uint32Array([0, 1]),
    }
    const cloned = cloneMesh(mesh)
    expect(cloned.faceRanges).not.toBe(mesh.faceRanges)
    expect(Array.from(cloned.faceRanges ?? [])).toEqual([0, 1])
  })
})
