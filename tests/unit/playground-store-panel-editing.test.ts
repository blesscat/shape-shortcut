import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MeshSnapshot, WorkerEvent } from '../../src/cad-contract/messages'
import type {
  ModelBounds,
  ModelParameterValues,
} from '../../src/cad-contract/units'
import type { OpenGridParameters } from '../../src/cad-contract/units'
import type { PlaygroundStore } from '../../src/features/cad/playground/store'

type SentWorkerCommand = {
  kind?: string
  parameters?: ModelParameterValues
}

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
      // Worker send payloads are a command union; tests only inspect the
      // kind discriminator and generation parameters.
      send(command: { kind?: string; parameters?: unknown }) {
        harness.sentCommands.push(command)
      }
      terminate() {}
    },
    newOperationId: (prefix: string) => `${prefix}-${(operationCounter += 1)}`,
  }
})

import { createPlaygroundStore } from '../../src/features/cad/playground/store'
import { getModelDefinition } from '../../src/features/cad/model-catalog'

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

function deliverEngineReady() {
  harness.handler?.({
    kind: 'engine.ready',
    operationId: 'unused',
    engine: { name: 'replicad', wasm: true },
  } as unknown as WorkerEvent)
}

/** The instance's known concrete parameter shape for its modelId. */
function parametersOf(
  store: PlaygroundStore,
  instanceId: string,
): OpenGridParameters {
  const instance = store
    .getSnapshot()
    .instances.find((candidate) => candidate.id === instanceId)
  if (!instance) throw new Error(`missing instance ${instanceId}`)
  return instance.parameters as OpenGridParameters
}

describe('playground store panel-driven parameter editing', () => {
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

  it('edits a typed-parameter component through the full-parameters setter', async () => {
    vi.useFakeTimers()
    const next = setupStore()
    next.addInstance('opengrid')
    const before = parametersOf(next, 'inst-1')

    next.setInstanceParameters('inst-1', { ...before, rows: 7 })

    const snapshot = next.getSnapshot()
    expect(snapshot.instances[0]?.parameters).toMatchObject({ rows: 7 })
    expect(snapshot.instances[0]?.fieldErrors).toEqual({})

    await vi.advanceTimersByTimeAsync(600)
    const generate = harness.sentCommands.find(
      (command) => command.kind === 'scene.instance.generate',
    )
    expect(generate?.parameters).toMatchObject({ rows: 7 })
  })

  it('rejects an invalid typed parameter set with a diagnostic and keeps values', () => {
    const next = setupStore()
    next.addInstance('opengrid')
    const before = parametersOf(next, 'inst-1')

    next.setInstanceParameters('inst-1', { ...before, rows: 0 })

    const snapshot = next.getSnapshot()
    expect(snapshot.instances[0]?.parameters).toEqual(before)
    expect(Object.keys(snapshot.instances[0]?.fieldErrors ?? {}).length).toBe(1)
  })

  it('applies a preset to the selected instance only and bumps the reset version', () => {
    const next = setupStore()
    next.addInstance('opengrid-stackable-box')
    next.addInstance('opengrid-stackable-box')
    const versionBefore = next.getSnapshot().panelResetVersion

    next.applyPreset('inst-1', '3x3-desk-style')

    const snapshot = next.getSnapshot()
    expect(snapshot.panelResetVersion).toBe(versionBefore + 1)
    expect(snapshot.instances[0]?.parameters).toMatchObject({ x: 3, y: 3 })
    const definition = getModelDefinition('opengrid-stackable-box')
    expect(snapshot.instances[1]?.parameters).toMatchObject(
      definition!.defaultParameters,
    )
  })

  it('leaves the instance untouched for an unknown preset id', () => {
    const next = setupStore()
    next.addInstance('opengrid-stackable-box')
    const parametersBefore = next.getSnapshot().instances[0]?.parameters
    const versionBefore = next.getSnapshot().panelResetVersion

    next.applyPreset('inst-1', 'no-such-preset')

    const snapshot = next.getSnapshot()
    expect(snapshot.instances[0]?.parameters).toEqual(parametersBefore)
    expect(snapshot.instances[0]?.fieldErrors).toEqual({})
    expect(snapshot.panelResetVersion).toBe(versionBefore)
  })

  it('restores defaults honoring the per-instance system context', () => {
    const next = setupStore()
    next.addInstance('opengrid-snap')
    expect(next.getSnapshot().instances[0]?.systemContext).toBe('desk')

    next.restoreInstanceParameters('inst-1')
    expect(next.getSnapshot().instances[0]?.parameters).toMatchObject({
      variant: 'Lite',
    })

    next.setInstanceSystemContext('inst-1', 'wall')
    next.restoreInstanceParameters('inst-1')
    expect(next.getSnapshot().instances[0]?.parameters).toMatchObject({
      variant: 'Full',
    })
  })

  it('derives imported instances context from orientation and never persists it', () => {
    const source = setupStore()
    source.addInstance('box')
    const sceneJson = source.exportSceneJson()
    expect(sceneJson).not.toContain('systemContext')
    source.dispose()
    store = null

    const target = setupStore()
    expect(target.importScene(sceneJson)).toBe(true)
    expect(target.getSnapshot().instances[0]?.systemContext).toBe('desk')
  })

  it('marks dimension-calculation invalid and re-arms the pending placeholder', async () => {
    vi.useFakeTimers()
    const next = setupStore()
    next.addInstance('box')

    next.markDimensionCalculationInvalid('inst-1')
    const snapshot = next.getSnapshot()
    expect(snapshot.instances[0]?.fieldErrors.parameters?.messageId).toBe(
      'validation.invalid',
    )

    // The cancelled debounce must not strand the pending placeholder:
    // generation for the still-valid parameters is re-armed.
    await vi.advanceTimersByTimeAsync(600)
    expect(
      harness.sentCommands.some(
        (command) => command.kind === 'scene.instance.generate',
      ),
    ).toBe(true)

    // The next valid edit clears the diagnostic through commitParameters.
    next.setParameter('inst-1', 'width', '56')
    expect(next.getSnapshot().instances[0]?.fieldErrors).toEqual({})
  })
})
