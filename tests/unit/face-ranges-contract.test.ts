import { describe, expect, it } from 'vitest'
import {
  isWorkerEvent,
  PROTOCOL_VERSION,
  transferablesForEvent,
} from '../../src/cad-contract/messages'
import { readFaceTriangleRanges } from '../../src/features/cad/worker-client'
import type { MeshSnapshot } from '../../src/cad-contract/messages'

const BASE_MESH: MeshSnapshot = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
  indices: new Uint32Array([0, 1, 2, 0, 1, 2, 0, 1, 2]).buffer,
  bounds: { min: [0, 0, 0], max: [1, 1, 0] },
  triangleCount: 3,
}

const READY_EVENT = {
  version: PROTOCOL_VERSION,
  kind: 'model.ready' as const,
  requestId: 'response-1',
  operationId: 'operation-1',
  generation: 1,
  modelRevision: 'rev-epoch-r1',
  workerEpoch: 'epoch-1',
  modelId: 'box' as const,
  parameters: { width: 20, depth: 30, height: 40 },
  mesh: BASE_MESH,
  bounds: {
    min: [0, 0, 0] as [number, number, number],
    max: [1, 1, 0] as [number, number, number],
  },
}

describe('mesh contract with optional face triangle ranges', () => {
  it('accepts events without ranges', () => {
    expect(isWorkerEvent({ ...READY_EVENT })).toBe(true)
  })

  it('accepts events with valid ranges', () => {
    const ranges = new Uint32Array([0, 2, 2, 1]).buffer
    expect(
      isWorkerEvent({
        ...READY_EVENT,
        mesh: { ...BASE_MESH, faceTriangleRanges: ranges },
      }),
    ).toBe(true)
  })

  it('treats mistyped ranges as missing instead of rejecting the event', () => {
    const event = {
      ...READY_EVENT,
      mesh: {
        ...BASE_MESH,
        faceTriangleRanges: new Uint32Array([0, 3]) as unknown as ArrayBuffer,
      },
    }
    expect(isWorkerEvent(event)).toBe(true)
    expect(readFaceTriangleRanges(event.mesh)).toBeNull()
  })

  it('includes the ranges buffer in event transferables', () => {
    const ranges = new Uint32Array([0, 2, 2, 1]).buffer
    const withRanges = {
      ...READY_EVENT,
      mesh: { ...BASE_MESH, faceTriangleRanges: ranges },
    }
    const transferables = transferablesForEvent(withRanges)
    expect(transferables).toContain(ranges)
    expect(transferables).toHaveLength(4)
  })
})

describe('readFaceTriangleRanges', () => {
  it('returns null when the field is absent', () => {
    expect(readFaceTriangleRanges(BASE_MESH)).toBeNull()
  })

  it('decodes valid ranges', () => {
    const mesh: MeshSnapshot = {
      ...BASE_MESH,
      faceTriangleRanges: new Uint32Array([0, 2, 2, 1]).buffer,
    }
    expect(Array.from(readFaceTriangleRanges(mesh) ?? [])).toEqual([0, 2, 2, 1])
  })

  it('treats malformed ranges as missing', () => {
    const cases: (ArrayBuffer | undefined)[] = [
      new Uint32Array([]).buffer,
      new Uint32Array([0]).buffer,
      new Uint32Array([0, 0]).buffer,
      new Uint32Array([0, 2, 1, 2]).buffer,
      new Uint32Array([0, 4]).buffer,
    ]
    for (const ranges of cases) {
      const mesh: MeshSnapshot = { ...BASE_MESH, faceTriangleRanges: ranges }
      expect(readFaceTriangleRanges(mesh)).toBeNull()
    }
  })

  it('accepts ranges covering the whole mesh', () => {
    const mesh: MeshSnapshot = {
      ...BASE_MESH,
      faceTriangleRanges: new Uint32Array([0, 3]).buffer,
    }
    expect(readFaceTriangleRanges(mesh)).not.toBeNull()
  })

  it('returns null when the ranges buffer was detached in transit', () => {
    const detached = new Uint32Array([0, 3]).buffer
    structuredClone(detached, { transfer: [detached] })
    const mesh: MeshSnapshot = { ...BASE_MESH, faceTriangleRanges: detached }
    expect(readFaceTriangleRanges(mesh)).toBeNull()
  })
})
