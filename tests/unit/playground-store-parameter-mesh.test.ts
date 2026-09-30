import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MeshSnapshot } from '../../src/cad-contract/messages'
import type { WorkerEvent } from '../../src/cad-contract/messages'
import type { ModelBounds } from '../../src/cad-contract/units'

const harness = vi.hoisted(() => ({
  sentCommands: [] as unknown[],
  handler: null as ((event: WorkerEvent) => void) | null,
}))

vi.mock('../../src/features/cad/worker-client', () => {
  let operationCounter = 0
  return {
    CadWorkerClient: class {
      onEvent(handler: (event: WorkerEvent) => void) {
        harness.handler = handler
        return () => {}
      }
      onError() {
        return () => {}
      }
      send(command: unknown) {
        harness.sentCommands.push(command)
      }
      terminate() {}
    },
    newOperationId: (prefix: string) => `${prefix}-${(operationCounter += 1)}`,
  }
})

import { createPlaygroundStore } from '../../src/features/cad/playground/store'

let meshCounter = 0

function meshSnapshot(): MeshSnapshot {
  meshCounter += 1
  const bounds: ModelBounds = { min: [0, 0, 0], max: [20, 20, 20] }
  return {
    positions: new ArrayBuffer(0),
    normals: new ArrayBuffer(0),
    indices: new ArrayBuffer(0),
    bounds,
    triangleCount: meshCounter,
  } as unknown as MeshSnapshot
}

function deliverInstanceReady(
  modelId: string,
  parameters: Record<string, unknown>,
): MeshSnapshot {
  const mesh = meshSnapshot()
  harness.handler?.({
    kind: 'scene.instance.ready',
    operationId: 'unused',
    modelId,
    parameters,
    mesh,
    bounds: mesh.bounds,
  } as unknown as WorkerEvent)
  return mesh
}

function deliverEngineReady() {
  harness.handler?.({
    kind: 'engine.ready',
    operationId: 'unused',
    engine: { name: 'replicad', wasm: true },
  } as unknown as WorkerEvent)
}

describe('playground store parameter edits', () => {
  let store: ReturnType<typeof createPlaygroundStore> | null = null

  afterEach(() => {
    store?.dispose()
    store = null
    vi.unstubAllGlobals()
    harness.sentCommands.length = 0
    harness.handler = null
  })

  function setupStore() {
    vi.stubGlobal('window', { location: { origin: 'http://test.local' } })
    const next = createPlaygroundStore()
    store = next
    return next
  }

  it('drops a ready instance to the placeholder on a parameter edit', async () => {
    vi.useFakeTimers()
    const next = setupStore()
    deliverEngineReady()
    next.addInstance('box')
    deliverInstanceReady('box', {
      width: 20,
      depth: 30,
      height: 40,
    })
    let snapshot = next.getSnapshot()
    expect(snapshot.instances[0]?.meshState).toBe('ready')

    next.setParameter('inst-1', 'width', '56')
    // The previous mesh was authored for the old parameters; mounting it
    // under the new display plan would mis-seat the piece, so the edit must
    // fall to the parameter-consistent placeholder immediately.
    snapshot = next.getSnapshot()
    expect(snapshot.instances[0]?.meshState).toBe('pending')
    expect(snapshot.instances[0]?.parameters).toMatchObject({ width: 56 })

    await vi.advanceTimersByTimeAsync(600)
    const generate = harness.sentCommands.find(
      (command) =>
        (command as { kind?: string }).kind === 'scene.instance.generate',
    )
    expect(generate).toMatchObject({
      modelId: 'box',
      parameters: { width: 56 },
    })
    vi.useRealTimers()
  })

  it('adopts a cached mesh instantly when the parameters were generated before', async () => {
    vi.useFakeTimers()
    const next = setupStore()
    deliverEngineReady()
    next.addInstance('box')
    next.addInstance('box')
    deliverInstanceReady('box', {
      width: 20,
      depth: 30,
      height: 40,
    })

    next.setParameter('inst-1', 'width', '56')
    const widened = deliverInstanceReady('box', {
      width: 56,
      depth: 30,
      height: 40,
    })
    expect(next.getSnapshot().instances[0]?.meshState).toBe('ready')

    // inst-2 adopts the already-cached widened mesh without a regeneration
    // round trip.
    next.setParameter('inst-2', 'width', '56')
    const snapshot = next.getSnapshot()
    const second = snapshot.instances[1]
    expect(second?.meshState).toBe('ready')
    expect(second?.mesh).toBe(widened)
    await vi.advanceTimersByTimeAsync(600)
    const generates = harness.sentCommands.filter(
      (command) =>
        (command as { kind?: string }).kind === 'scene.instance.generate',
    )
    // inst-1's edit also resolved from the cache by the time its debounce
    // fired, so neither instance needed a worker generation.
    expect(generates).toHaveLength(0)
    expect(next.getSnapshot().instances[1]?.meshState).toBe('ready')
    vi.useRealTimers()
  })
})
