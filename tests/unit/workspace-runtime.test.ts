import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  WorkerCommandInput,
  WorkerEvent,
  MeshSnapshot,
} from '../../src/cad-contract/messages'
import type { WorkerClientError } from '../../src/features/cad/worker-client'
import { PROTOTYPE_CONFIGURATION } from '../../src/cad-contract/units'
import { initialCadState, type CadState } from '../../src/features/cad/state'
import { rawFromParameters } from '../../src/components/cad/workspace/validation'
import { createCadWorkerRuntime } from '../../src/components/cad/workspace/createCadWorkerRuntime'

const fixture = vi.hoisted(() => ({
  clients: [] as FakeClient[],
  lifecycle: [] as string[],
}))

class FakeClient {
  id = fixture.clients.length
  event: (event: WorkerEvent) => void = () => {}
  error: (error: WorkerClientError) => void = () => {}
  send = vi.fn((_command: WorkerCommandInput) => 'request')
  terminate = vi.fn(() => fixture.lifecycle.push('terminate-' + this.id))
  constructor() {
    fixture.lifecycle.push('create-' + this.id)
    fixture.clients.push(this)
  }
  onEvent(callback: typeof this.event) {
    this.event = callback
  }
  onError(callback: typeof this.error) {
    this.error = callback
  }
  commands(kind: WorkerCommandInput['kind']) {
    return this.send.mock.calls
      .map(([command]) => command)
      .filter((command) => command.kind === kind)
  }
  ready() {
    const init = this.commands('engine.init')[0]!
    this.event({
      version: 2,
      requestId: 'ready',
      kind: 'engine.ready',
      operationId: init.operationId,
      workerEpoch: 'epoch-' + this.id,
      engine: { name: 'replicad', wasm: true },
    })
  }
  fail() {
    this.error({ kind: 'worker-error', error: new Error('worker failed') })
  }
}

vi.mock('../../src/features/cad/worker-client', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../src/features/cad/worker-client')
  >()),
  CadWorkerClient: class {
    constructor() {
      return new FakeClient()
    }
  },
}))
vi.mock(
  '../../src/components/cad/workspace/validation',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../../src/components/cad/workspace/validation')
    >()),
    supportsCadBrowser: () => ({ supported: true }),
  }),
)

const mesh: MeshSnapshot = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
  indices: new Uint32Array([0, 1, 2]).buffer,
  triangleCount: 1,
  bounds: { min: [0, 0, 0], max: [1, 1, 0] },
}

function result(
  client: FakeClient,
): Extract<WorkerEvent, { kind: 'model.ready' }> {
  const command = client.commands('model.generate')[0]!
  if (command.kind !== 'model.generate') throw new Error('missing generation')
  return {
    version: 2,
    requestId: 'model-result',
    kind: 'model.ready',
    operationId: command.operationId,
    generation: command.generation,
    modelId: command.modelId,
    parameters: command.parameters,
    workerEpoch: 'epoch-' + client.id,
    modelRevision: 'revision-' + client.id,
    mesh,
    bounds: mesh.bounds,
  }
}

function setup() {
  let state: CadState = initialCadState('box', {
    width: 20,
    depth: 30,
    height: 40,
  })
  const states: CadState[] = []
  const runtime = createCadWorkerRuntime({
    initialState: state,
    initialRawParameters: rawFromParameters(state.input),
    setState: (next) => {
      state = next
      states.push(next)
    },
    setRawParameters: vi.fn(),
    setPersistedParameters: vi.fn(),
    setFieldErrors: vi.fn(),
    setProgress: vi.fn(),
  })
  return { runtime, states, state: () => state }
}
function settle() {
  vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
}
function latest() {
  return fixture.clients.at(-1)!
}

describe('workspace Worker sessions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fixture.clients.length = 0
    fixture.lifecycle.length = 0
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('bootstraps one model and treats repeated ready as idempotent', () => {
    const { runtime, state } = setup()
    latest().ready()
    latest().ready()
    expect(latest().commands('model.generate')).toHaveLength(1)
    latest().event(result(latest()))
    expect(state()).toMatchObject({
      status: 'ready',
      stale: false,
      exportStatus: 'idle',
    })
    runtime.dispose()
  })

  it('replaces the bootstrap with only the settled pending snapshot', () => {
    const { runtime } = setup()
    const bootstrap = latest()
    runtime.handleInputChange('width', '21')
    runtime.handleInputChange('width', '22')
    settle()
    expect(fixture.lifecycle).toEqual(['create-0', 'terminate-0', 'create-1'])
    bootstrap.ready()
    expect(bootstrap.commands('model.generate')).toHaveLength(0)
    latest().ready()
    latest().ready()
    expect(latest().commands('model.generate')).toEqual([
      expect.objectContaining({
        generation: 2,
        parameters: { width: 22, depth: 30, height: 40 },
      }),
    ])
    runtime.dispose()
  })

  it.each(['21', ''])(
    'does not generate unsettled input %j on bootstrap ready',
    (value) => {
      const { runtime, state } = setup()
      runtime.handleInputChange('width', value)
      latest().ready()
      expect(latest().commands('model.generate')).toHaveLength(0)
      if (!value) expect(state().status).toBe('invalid-input')
      settle()
      if (value) {
        expect(fixture.clients).toHaveLength(2)
        latest().ready()
        expect(latest().commands('model.generate')).toHaveLength(1)
      } else {
        expect(fixture.clients).toHaveLength(1)
        expect(latest().commands('model.invalidate')).toHaveLength(1)
      }
      runtime.dispose()
    },
  )

  it('supersedes replacement pending input before ready without generating it', () => {
    const { runtime } = setup()
    latest().ready()
    runtime.handleInputChange('width', '21')
    settle()
    const replacement = latest()
    runtime.handleInputChange('width', '22')
    replacement.ready()
    expect(replacement.commands('model.generate')).toHaveLength(0)
    settle()
    latest().ready()
    expect(latest().commands('model.generate')).toEqual([
      expect.objectContaining({
        generation: 3,
        parameters: { width: 22, depth: 30, height: 40 },
      }),
    ])
    runtime.dispose()
  })

  it('retains preview and dimensions through every replacement and restores exports only on commit', () => {
    const { runtime, state } = setup()
    latest().ready()
    latest().event(result(latest()))
    for (const width of ['21', '22']) {
      const committed = state().committed
      const old = latest()
      runtime.handleInputChange('width', width)
      settle()
      expect(old.terminate).toHaveBeenCalledOnce()
      expect(state().committed).toBe(committed)
      expect(state()).toMatchObject({
        status: 'loading-engine',
        stale: true,
        exportStatus: 'disabled',
      })
      runtime.handleExport('step')
      runtime.handleExport('stl')
      expect(latest().commands('export.step')).toHaveLength(0)
      expect(latest().commands('export.stl')).toHaveLength(0)
      latest().ready()
      expect(state().committed).toBe(committed)
      latest().event(result(latest()))
      expect(state()).toMatchObject({
        status: 'ready',
        stale: false,
        exportStatus: 'idle',
      })
      expect(state().committed?.parameters).toMatchObject({
        width: Number(width),
      })
      expect(state().workerEpoch).not.toBe(committed?.workerEpoch)
      runtime.handleExport('step')
      expect(latest().commands('export.step')).toHaveLength(1)
    }
    runtime.dispose()
  })

  it('debounces valid/invalid bursts to one invalidation without a replacement', () => {
    const { runtime, state } = setup()
    latest().ready()
    latest().event(result(latest()))
    const committed = state().committed
    runtime.handleInputChange('width', '21')
    runtime.handleInputChange('width', '')
    runtime.handleInputChange('width', 'bad')
    expect(state().status).toBe('invalid-input')
    expect(latest().commands('model.invalidate')).toHaveLength(0)
    settle()
    expect(latest().commands('model.invalidate')).toHaveLength(1)
    expect(fixture.clients).toHaveLength(1)
    expect(state().committed).toBe(committed)
    runtime.handleExport('step')
    runtime.handleExport('stl')
    expect(latest().commands('export.step')).toHaveLength(0)
    expect(latest().commands('export.stl')).toHaveLength(0)
    runtime.handleInputChange('width', '23')
    settle()
    latest().ready()
    expect(latest().commands('model.generate')).toHaveLength(1)
    runtime.dispose()
  })

  it('ignores superseded client ready, candidate, export, progress and errors', () => {
    const { runtime, state, states } = setup()
    const old = latest()
    old.ready()
    const oldResult = result(old)
    old.event(oldResult)
    runtime.handleExport('step')
    const exportCommand = old.commands('export.step')[0]!
    runtime.handleInputChange('width', '21')
    settle()
    latest().ready()
    const current = state()
    const count = states.length
    old.ready()
    old.event(oldResult)
    old.event({
      ...oldResult,
      kind: 'model.candidate-ready',
      candidateId: 'old-candidate',
      mesh,
    })
    old.event({
      version: 2,
      requestId: 'late',
      operationId: exportCommand.operationId,
      kind: 'export.accepted',
      workerEpoch: 'epoch-0',
      modelRevision: 'revision-0',
    })
    old.event({
      version: 2,
      requestId: 'late',
      operationId: oldResult.operationId,
      kind: 'operation.progress',
      stage: 'building',
      generation: oldResult.generation,
    })
    old.event({
      version: 2,
      requestId: 'late',
      operationId: exportCommand.operationId,
      kind: 'export.ready',
      workerEpoch: 'epoch-0',
      modelRevision: 'revision-0',
      bytes: new ArrayBuffer(0),
      fileName: 'old.step',
      mime: 'model/step',
      format: 'step',
    })
    old.event({
      version: 2,
      requestId: 'late',
      operationId: oldResult.operationId,
      kind: 'operation.error',
      terminalForRequestId: 'request',
      stage: 'building',
      code: 'MODEL_BUILD_FAILED',
      messageId: 'diagnostic.modelBuildFailed',
      recoverable: true,
      generation: oldResult.generation,
    })
    old.fail()
    expect(state()).toBe(current)
    expect(states).toHaveLength(count)
    expect(fixture.clients).toHaveLength(2)
    expect(latest().terminate).not.toHaveBeenCalled()
    latest().event(result(latest()))
    expect(state().committed?.revision).toBe('revision-1')
    runtime.dispose()
  })

  it('retries failed initialization with the same pending request and no default', () => {
    const { runtime } = setup()
    runtime.handleInputChange('width', '25')
    settle()
    latest().fail()
    latest().ready()
    expect(latest().commands('model.generate')).toEqual([
      expect.objectContaining({
        generation: 1,
        parameters: { width: 25, depth: 30, height: 40 },
      }),
    ])
    runtime.dispose()
  })

  it('recovers bootstrap timeout and ignores the replaced initialization timer', () => {
    const { runtime } = setup()
    vi.advanceTimersByTime(
      PROTOTYPE_CONFIGURATION.engineInitializationTimeoutMs,
    )
    expect(fixture.clients).toHaveLength(2)
    latest().ready()
    latest().event(result(latest()))
    vi.advanceTimersByTime(
      PROTOTYPE_CONFIGURATION.engineInitializationTimeoutMs,
    )
    expect(fixture.clients).toHaveLength(2)
    runtime.dispose()
  })

  it('keeps preview disabled after exhausted recovery and manually retries the same generation', () => {
    const { runtime, state } = setup()
    latest().ready()
    latest().event(result(latest()))
    const committed = state().committed
    runtime.handleInputChange('width', '25')
    settle()
    for (let i = 0; i <= PROTOTYPE_CONFIGURATION.recoveryRetries; i++)
      latest().fail()
    expect(state()).toMatchObject({
      status: 'recoverable-error',
      exportStatus: 'disabled',
      stale: true,
    })
    expect(state().committed).toBe(committed)
    runtime.handleRetry()
    latest().ready()
    expect(latest().commands('model.generate')).toEqual([
      expect.objectContaining({
        generation: 2,
        parameters: { width: 25, depth: 30, height: 40 },
      }),
    ])
    latest().event(result(latest()))
    expect(state().exportStatus).toBe('idle')
    runtime.dispose()
  })

  it('delivers settled invalidation once when initialization finally becomes ready', () => {
    const { runtime, state } = setup()
    runtime.handleInputChange('width', '')
    settle()
    const error = state().error
    expect(latest().commands('model.invalidate')).toHaveLength(0)
    latest().ready()
    latest().ready()
    expect(latest().commands('model.invalidate')).toHaveLength(1)
    expect(latest().commands('model.generate')).toHaveLength(0)
    expect(state()).toMatchObject({ status: 'invalid-input', error })
    runtime.handleRetry()
    expect(fixture.clients).toHaveLength(1)
    runtime.dispose()
  })

  it('preserves invalid diagnostics after Worker failure without automatic or manual initialization', () => {
    const { runtime, state } = setup()
    runtime.handleInputChange('width', '')
    settle()
    const error = state().error
    latest().fail()
    runtime.handleRetry()
    expect(fixture.clients).toHaveLength(1)
    expect(state()).toMatchObject({
      status: 'invalid-input',
      error,
      exportStatus: 'disabled',
    })
    runtime.handleInputChange('width', '25')
    settle()
    latest().ready()
    expect(latest().commands('model.generate')).toHaveLength(1)
    runtime.dispose()
  })

  it.each(['building', 'exporting'] as const)(
    'cancels obsolete %s timers when input becomes invalid',
    (stage) => {
      const { runtime, state } = setup()
      latest().ready()
      if (stage === 'exporting') {
        latest().event(result(latest()))
        runtime.handleExport('stl')
      }
      runtime.handleInputChange('width', '')
      const error = state().error
      vi.advanceTimersByTime(
        PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs +
          PROTOTYPE_CONFIGURATION.inputDebounceMs,
      )
      expect(fixture.clients).toHaveLength(1)
      expect(latest().terminate).not.toHaveBeenCalled()
      expect(state()).toMatchObject({
        status: 'invalid-input',
        error,
        exportStatus: 'disabled',
      })
      runtime.dispose()
    },
  )

  it('retries a model timeout with the same pending generation', () => {
    const { runtime } = setup()
    latest().ready()
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs)
    expect(fixture.clients).toHaveLength(2)
    latest().ready()
    expect(latest().commands('model.generate')).toEqual([
      expect.objectContaining({
        generation: 1,
        parameters: { width: 20, depth: 30, height: 40 },
      }),
    ])
    runtime.dispose()
  })

  it('allows a slow generation past the short operation deadline and clears its timer on success', () => {
    const { runtime, state } = setup()
    latest().ready()
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.operationTimeoutMs + 1)
    expect(fixture.clients).toHaveLength(1)
    expect(latest().terminate).not.toHaveBeenCalled()
    latest().event(result(latest()))
    expect(state().status).toBe('ready')
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs)
    expect(fixture.clients).toHaveLength(1)
    runtime.dispose()
  })

  it('does not let progress extend the absolute generation deadline', () => {
    const { runtime } = setup()
    latest().ready()
    const currentResult = result(latest())
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs - 1)
    latest().event({
      version: 2,
      requestId: 'progress',
      kind: 'operation.progress',
      operationId: currentResult.operationId,
      generation: currentResult.generation,
      stage: 'building',
    })
    vi.advanceTimersByTime(1)
    expect(fixture.clients).toHaveLength(2)
    runtime.dispose()
  })

  it.each(['commit', 'export'] as const)(
    'retains the short %s deadline',
    (stage) => {
      const { runtime } = setup()
      latest().ready()
      const currentResult = result(latest())
      if (stage === 'commit') {
        latest().event({
          ...currentResult,
          kind: 'model.candidate-ready',
          candidateId: 'candidate',
          mesh,
        })
        expect(latest().commands('model.commit')).toHaveLength(1)
      } else {
        latest().event(currentResult)
        runtime.handleExport('stl')
      }
      vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.operationTimeoutMs)
      expect(fixture.clients).toHaveLength(2)
      runtime.dispose()
    },
  )

  it.each(['initializing', 'building'] as const)(
    'ignores an already queued old %s timeout after replacement',
    (stage) => {
      const timers = vi.spyOn(globalThis, 'setTimeout')
      const { runtime } = setup()
      if (stage === 'building') latest().ready()
      const timeout = timers.mock.calls.at(-1)?.[0]
      if (typeof timeout !== 'function')
        throw new Error('missing operation timeout')
      runtime.handleInputChange('width', '25')
      settle()
      timeout()
      expect(fixture.clients).toHaveLength(2)
      expect(latest().terminate).not.toHaveBeenCalled()
      latest().ready()
      expect(latest().commands('model.generate')).toHaveLength(1)
      runtime.dispose()
      timers.mockRestore()
    },
  )

  it('rejects a mismatched epoch on the active client before accepting the current commit', () => {
    const { runtime, state } = setup()
    latest().ready()
    const currentResult = result(latest())
    latest().event({ ...currentResult, workerEpoch: 'unrelated-epoch' })
    expect(state().committed).toBeNull()
    latest().event(currentResult)
    expect(state().committed?.revision).toBe(currentResult.modelRevision)
    runtime.dispose()
  })

  it('cancels timers and ignores callbacks after disposal', () => {
    const { runtime, states } = setup()
    runtime.handleInputChange('width', '21')
    runtime.dispose()
    const count = states.length
    latest().ready()
    latest().fail()
    vi.runAllTimers()
    expect(states).toHaveLength(count)
    expect(fixture.clients).toHaveLength(1)
  })
})
