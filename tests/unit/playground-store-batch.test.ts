import { afterEach, describe, expect, it, vi } from 'vitest'

import type { WorkerEvent } from '../../src/cad-contract/messages'
import type { PlaygroundStore } from '../../src/features/cad/playground/store'

const harness = vi.hoisted(() => ({
  sentCommands: [] as Array<{ kind?: string; parameters?: unknown }>,
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
      send(command: { kind?: string; parameters?: unknown }) {
        harness.sentCommands.push(command)
      }
      terminate() {}
    },
    newOperationId: (prefix: string) => `${prefix}-${(operationCounter += 1)}`,
  }
})

import { createPlaygroundStore } from '../../src/features/cad/playground/store'

function deliverEngineReady() {
  harness.handler?.({
    kind: 'engine.ready',
    operationId: 'unused',
    engine: { name: 'replicad', wasm: true },
  } as unknown as WorkerEvent)
}

function instanceOf(store: PlaygroundStore, instanceId: string) {
  const instance = store
    .getSnapshot()
    .instances.find((candidate) => candidate.id === instanceId)
  if (!instance) throw new Error(`missing instance ${instanceId}`)
  return instance
}

function generateCommands() {
  return harness.sentCommands.filter(
    (command) => command.kind === 'scene.instance.generate',
  )
}

describe('playground store batch parameter input', () => {
  let store: PlaygroundStore | null = null

  afterEach(() => {
    store?.dispose()
    store = null
    vi.unstubAllGlobals()
    vi.useRealTimers()
    harness.sentCommands.length = 0
    harness.handler = null
  })

  function setupStore(): PlaygroundStore {
    vi.stubGlobal('window', { location: { origin: 'http://test.local' } })
    const next = createPlaygroundStore()
    store = next
    deliverEngineReady()
    return next
  }

  it('applies a batch of raw values as one snapshot', async () => {
    vi.useFakeTimers()
    const next = setupStore()
    next.addInstance('game-box')

    const emissions: number[] = []
    const unsubscribe = next.subscribe(() => emissions.push(emissions.length))
    emissions.length = 0

    next.setParameters('inst-1', {
      module1Type: 'cards',
      module2Type: 'dice',
      module3Type: 'none',
    })
    unsubscribe()

    // The whole snapshot is published once; no intermediate state is shown.
    expect(emissions).toHaveLength(1)
    const instance = instanceOf(next, 'inst-1')
    expect(instance.parameters).toMatchObject({
      module1Type: 'cards',
      module2Type: 'dice',
      module3Type: 'none',
    })
    expect(instance.fieldErrors).toEqual({})
    expect(instance.rawParameters.module2Type).toBe('dice')

    await vi.advanceTimersByTimeAsync(600)
    expect(generateCommands()).toHaveLength(1)
  })

  it('reports an invalid batch once without changing the parameters', () => {
    const next = setupStore()
    next.addInstance('game-box')
    const before = instanceOf(next, 'inst-1').parameters

    next.setParameters('inst-1', {
      module1Type: 'none',
      module2Type: 'dice',
    })

    const instance = instanceOf(next, 'inst-1')
    expect(instance.parameters).toEqual(before)
    expect(instance.fieldErrors.module1Type?.messageId).toBe(
      'validation.gameBoxModuleRequired',
    )
  })

  it('keeps the single-key path working', () => {
    const next = setupStore()
    next.addInstance('game-box')

    next.setParameter('inst-1', 'module2Type', 'dice')

    const instance = instanceOf(next, 'inst-1')
    expect(instance.parameters).toMatchObject({ module2Type: 'dice' })
    expect(instance.fieldErrors).toEqual({})
  })

  it('keeps the raw snapshot complete after a batch write', () => {
    const next = setupStore()
    next.addInstance('game-box')

    next.setParameters('inst-1', { module2Type: 'dice' })

    const instance = instanceOf(next, 'inst-1')
    expect(Object.keys(instance.rawParameters)).toHaveLength(27)
    expect(instance.rawParameters.module2Type).toBe('dice')
  })
})
