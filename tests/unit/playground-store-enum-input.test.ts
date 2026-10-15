import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MeshSnapshot, WorkerEvent } from '../../src/cad-contract/messages'
import type {
  ModelBounds,
  ModelParameterValues,
} from '../../src/cad-contract/units'
import type { PlaygroundStore } from '../../src/features/cad/playground/store'
import { formatValidationIssue } from '../../src/i18n/diagnostics'

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
      send(command: { kind?: string; parameters?: unknown }) {
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

function lastGenerateParameters(): ModelParameterValues | undefined {
  const generate = [...harness.sentCommands]
    .reverse()
    .find((command) => command.kind === 'scene.instance.generate')
  return generate?.parameters as ModelParameterValues | undefined
}

describe('playground store enum and boolean parameter input', () => {
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

  it('adopts a valid enum selection into typed parameters and regenerates', async () => {
    vi.useFakeTimers()
    const next = setupStore()
    next.addInstance('opengrid-organizer-box')

    next.setParameter('inst-1', 'wallThickness', '3')
    next.setParameter('inst-1', 'boxMode', 'stackable')

    const instance = instanceOf(next, 'inst-1')
    expect(instance.parameters).toMatchObject({
      boxMode: 'stackable',
      wallThickness: 3,
    })
    expect(instance.rawParameters.boxMode).toBe('stackable')
    expect(instance.fieldErrors).toEqual({})

    await vi.advanceTimersByTimeAsync(600)
    expect(lastGenerateParameters()).toMatchObject({ boxMode: 'stackable' })
  })

  it('accumulates the two-step stackable switch with the wall raise', async () => {
    vi.useFakeTimers()
    const next = setupStore()
    next.addInstance('opengrid-organizer-box')
    expect(instanceOf(next, 'inst-1').parameters).toMatchObject({
      boxMode: 'normal',
      wallThickness: 2,
    })

    next.setParameter('inst-1', 'boxMode', 'stackable')

    const intermediate = instanceOf(next, 'inst-1')
    expect(intermediate.parameters).toMatchObject({ boxMode: 'normal' })
    expect(intermediate.rawParameters.boxMode).toBe('stackable')
    expect(intermediate.fieldErrors.wallThickness?.messageId).toBe(
      'validation.invalid',
    )

    next.setParameter('inst-1', 'wallThickness', '3')

    const instance = instanceOf(next, 'inst-1')
    expect(instance.parameters).toMatchObject({
      boxMode: 'stackable',
      wallThickness: 3,
    })
    expect(instance.rawParameters.boxMode).toBe('stackable')
    expect(instance.fieldErrors).toEqual({})

    await vi.advanceTimersByTimeAsync(600)
    expect(lastGenerateParameters()).toMatchObject({
      boxMode: 'stackable',
      wallThickness: 3,
    })
  })

  it('keeps boolean literals as booleans', () => {
    const next = setupStore()
    next.addInstance('opengrid-organizer-box')

    next.setParameter('inst-1', 'topRimEnabled', 'true')

    const instance = instanceOf(next, 'inst-1')
    expect(instance.parameters).toMatchObject({ topRimEnabled: true })
    expect(instance.fieldErrors).toEqual({})
  })

  it('keeps the last valid model on invalid input and clears on recovery', () => {
    const next = setupStore()
    next.addInstance('opengrid-organizer-box')
    const before = instanceOf(next, 'inst-1').parameters

    next.setParameter('inst-1', 'holeDiameter', '300')
    const overflowing = instanceOf(next, 'inst-1')
    expect(overflowing.parameters).toEqual(before)
    // A field-less rejection (derived footprint overflow) surfaces on the
    // edited control, matching the workspace input handler convention.
    expect(overflowing.fieldErrors.holeDiameter?.messageId).toBe(
      'validation.invalid',
    )

    next.setParameter('inst-1', 'holeDiameter', '20')
    const recovered = instanceOf(next, 'inst-1')
    expect(recovered.fieldErrors).toEqual({})
    expect(recovered.parameters).toEqual(before)

    next.setParameter('inst-1', 'wallThickness', '500')
    const overRange = instanceOf(next, 'inst-1')
    expect(overRange.parameters).toEqual(before)
    expect(overRange.fieldErrors.wallThickness?.messageId).toBe(
      'validation.invalid',
    )

    next.setParameter('inst-1', 'wallThickness', '3')
    expect(instanceOf(next, 'inst-1').fieldErrors).toEqual({})
  })

  it('never coerces enum values through Number()', () => {
    const next = setupStore()
    next.addInstance('opengrid-organizer-box')

    next.setParameter('inst-1', 'holeShape', 'hexagon')

    const instance = instanceOf(next, 'inst-1')
    expect(instance.parameters).toMatchObject({ holeShape: 'hexagon' })
    expect(instance.fieldErrors).toEqual({})
  })

  it('keeps numeric typed merging for models without raw-parser support', () => {
    const next = setupStore()
    next.addInstance('opengrid')

    expect(() => next.setParameter('inst-1', 'rows', '7')).not.toThrow()

    const instance = instanceOf(next, 'inst-1')
    expect(instance.parameters).toMatchObject({ rows: 7 })
    expect(instance.fieldErrors).toEqual({})
  })
})

describe('parameter validation field labels', () => {
  it('names the box mode field instead of the generic parameter label', () => {
    const message = formatValidationIssue('zh-Hant', {
      field: 'boxMode',
      messageId: 'validation.invalid',
    })
    expect(message.startsWith('盒體模式')).toBe(true)
    expect(message.startsWith('參數')).toBe(false)
  })
})
