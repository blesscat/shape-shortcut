import { describe, expect, it, vi } from 'vitest'
import { exportStlBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'

vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: vi.fn(),
}))

describe('CAD STL export', () => {
  it('encodes the memory-safe mesh path for native B-Rep shapes', async () => {
    vi.mocked(meshBRep).mockReturnValue({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array(9),
      indices: new Uint32Array([0, 1, 2]),
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
      triangleCount: 1,
    })
    const shape = {
      wrapped: {},
      blobSTL: vi.fn(),
    }

    const result = await exportStlBytes(shape as never, {
      tolerance: 0.001,
      angularTolerance: 0.1,
    })

    expect(new DataView(result).getUint32(80, true)).toBe(1)
    expect(meshBRep).toHaveBeenCalledWith(shape, {
      tolerance: 0.001,
      angularTolerance: 0.1,
    })
    expect(shape.blobSTL).not.toHaveBeenCalled()
  })

  it('writes binary STL bytes with explicit tessellation settings', async () => {
    const bytes = new Uint8Array(84 + 50)
    const shape = {
      blobSTL: vi.fn(() => new Blob([bytes], { type: 'application/sla' })),
    }

    const result = await exportStlBytes(shape as never, {
      tolerance: 0.001,
      angularTolerance: 0.1,
    })

    expect(result.byteLength).toBe(bytes.byteLength)
    expect(shape.blobSTL).toHaveBeenCalledWith({
      binary: true,
      tolerance: 0.001,
      angularTolerance: 0.1,
    })
  })

  it('rejects an empty STL blob', async () => {
    const shape = {
      blobSTL: vi.fn(() => new Blob([])),
    }

    await expect(exportStlBytes(shape as never)).rejects.toThrow('STL_EMPTY')
  })
})
