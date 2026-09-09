import { describe, expect, it, vi } from 'vitest'
import type {
  MeshSnapshot,
  ProgressEvent,
} from '../../src/cad-contract/messages'
import {
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  type ModelId,
  type ModelParameterValues,
} from '../../src/cad-contract/units'
import { initialCadState } from '../../src/features/cad/state'
import { rawFromParameters } from '../../src/components/cad/workspace/validation'
import { createWorkerEventHandler } from '../../src/components/cad/workspace/runtime/events'
import type {
  RuntimeContext,
  RuntimeRefs,
} from '../../src/components/cad/workspace/runtime/types'

function createContext(
  modelId: ModelId = 'box',
  parameters: ModelParameterValues = { width: 20, depth: 30, height: 40 },
) {
  const state = initialCadState(modelId, parameters)
  const operations = new Map()
  operations.set('operation-2', {
    kind: 'model',
    generation: 2,
    modelId,
    parameters: state.input,
    requestId: 'request-2',
  })
  operations.set('operation-1', {
    kind: 'model',
    generation: 1,
    modelId,
    parameters: state.input,
    requestId: 'request-1',
  })
  const refs: RuntimeRefs = {
    client: { current: null },
    rawParameters: { current: rawFromParameters(state.input) },
    state: { current: state },
    workerEpoch: { current: 'epoch-test' },
    latestGeneration: { current: 2 },
    session: { current: { mode: 'bootstrap', ready: false, pending: null } },
    autoRecoveryAttempts: { current: 0 },
    operations: { current: operations },
    activeProgressOperationId: { current: null },
    exportRequest: { current: null },
    debounce: { current: null },
    timers: { current: new Map() },
    startWorker: { current: vi.fn() },
    recoverWorker: { current: vi.fn() },
    disposed: { current: false },
  }
  const setProgress = vi.fn()
  const setOperationProgress = vi.fn((operationId, progress) => {
    refs.activeProgressOperationId.current = operationId
    setProgress(progress)
  })
  const clearOperationProgress = vi.fn((operationId) => {
    if (refs.activeProgressOperationId.current !== operationId) return
    refs.activeProgressOperationId.current = null
    setProgress(null)
  })
  const clearProgress = vi.fn(() => {
    refs.activeProgressOperationId.current = null
    setProgress(null)
  })
  const context = {
    refs,
    dispatch: vi.fn(),
    setRawParameters: vi.fn(),
    setFieldErrors: vi.fn(),
    setProgress,
    setOperationProgress,
    clearOperationProgress,
    clearProgress,
    clearTimer: vi.fn(),
    setOperationTimeout: vi.fn(),
    recoverWorker: vi.fn(),
    generation: {
      sendGenerate: vi.fn(),
      sendInvalidate: vi.fn(),
      handleModelChange: vi.fn(),
      handleInputChange: vi.fn(),
    },
    exportHandlers: { handleExportReady: vi.fn(), handleExport: vi.fn() },
  } as unknown as RuntimeContext & {
    generation: never
    exportHandlers: never
  }
  return { context, setProgress, refs }
}

function progressEvent(
  generation: number,
  operationId: string,
  booleanOperation?: {
    kind: 'fuse' | 'cut' | 'intersect'
    state: 'running' | 'completed'
    completed?: number
    total?: number
    elapsedMs: number
  },
) {
  const event: ProgressEvent = {
    version: 2 as const,
    kind: 'operation.progress' as const,
    requestId: `progress-request-${generation}`,
    operationId,
    generation,
    stage: 'building' as const,
    completed: 2,
    total: 10,
    unit: 'cells' as const,
  }
  if (booleanOperation) event.booleanOperation = booleanOperation
  return event
}

function faceProgressEvent(
  generation: number,
  operationId: string,
  completed: number,
): ProgressEvent {
  return {
    version: 2,
    kind: 'operation.progress',
    requestId: `face-progress-request-${generation}`,
    operationId,
    generation,
    stage: 'meshing',
    completed,
    total: 100,
    unit: 'faces',
  }
}

describe('CAD Worker progress lifecycle', () => {
  it('ignores an older generation and accepts correlated current progress', () => {
    const { context, setProgress } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(progressEvent(1, 'operation-1'))
    expect(setProgress).not.toHaveBeenCalled()

    handle(progressEvent(2, 'operation-2'))
    expect(setProgress).toHaveBeenCalledWith({
      operationId: 'operation-2',
      stage: 'building',
      completed: 2,
      total: 10,
      unit: 'cells',
    })
  })

  it('ignores stale face progress from an older generation', () => {
    const { context, setProgress } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(faceProgressEvent(1, 'operation-1', 80))
    expect(setProgress).not.toHaveBeenCalled()

    handle(faceProgressEvent(2, 'operation-2', 12))
    expect(setProgress).toHaveBeenCalledWith({
      operationId: 'operation-2',
      stage: 'meshing',
      completed: 12,
      total: 100,
      unit: 'faces',
    })
  })

  it('keeps boolean subprogress on the current operation and clears it at terminal state', () => {
    const { context, setProgress } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(
      progressEvent(2, 'operation-2', {
        kind: 'fuse',
        state: 'running',
        completed: 2,
        total: 7,
        elapsedMs: 1800,
      }),
    )
    expect(setProgress).toHaveBeenLastCalledWith({
      operationId: 'operation-2',
      stage: 'building',
      completed: 2,
      total: 10,
      unit: 'cells',
      booleanOperation: {
        kind: 'fuse',
        state: 'running',
        completed: 2,
        total: 7,
        elapsedMs: 1800,
      },
    })

    handle({
      version: 2,
      kind: 'operation.superseded',
      requestId: 'superseded-response',
      operationId: 'operation-2',
      terminalForRequestId: 'request-2',
      generation: 2,
      reason: 'STALE_GENERATION',
    })
    expect(setProgress).toHaveBeenLastCalledWith(null)
  })

  it('clears current progress on invalidation and superseded/error terminals', () => {
    const { context, setProgress, refs } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(progressEvent(2, 'operation-2'))
    handle({
      version: 2,
      kind: 'model.invalidated',
      requestId: 'invalidate-response',
      operationId: 'invalidate-operation',
      generation: 2,
      workerEpoch: 'epoch-test',
    })
    expect(setProgress).toHaveBeenLastCalledWith(null)

    handle(progressEvent(2, 'operation-2'))
    handle({
      version: 2,
      kind: 'operation.superseded',
      requestId: 'superseded-response',
      operationId: 'operation-2',
      terminalForRequestId: 'request-2',
      generation: 2,
      reason: 'STALE_GENERATION',
    })
    expect(setProgress).toHaveBeenLastCalledWith(null)
    expect(refs.operations.current.has('operation-2')).toBe(false)

    refs.operations.current.set('operation-2', {
      kind: 'model',
      generation: 2,
      modelId: 'box',
      parameters: initialCadState().input,
      requestId: 'request-2',
    })
    handle(progressEvent(2, 'operation-2'))
    handle({
      version: 2,
      kind: 'operation.error',
      requestId: 'error-response',
      operationId: 'operation-2',
      terminalForRequestId: 'request-2',
      stage: 'building',
      code: 'MODEL_BUILD_FAILED',
      messageId: 'diagnostic.modelBuildFailed',
      recoverable: true,
      generation: 2,
    })
    expect(setProgress).toHaveBeenLastCalledWith(null)
  })

  it('does not let an older terminal event clear newer progress', () => {
    const { context, setProgress, refs } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(progressEvent(2, 'operation-2'))
    const callsBeforeOlderTerminals = setProgress.mock.calls.length

    handle({
      version: 2,
      kind: 'operation.error',
      requestId: 'old-error-response',
      operationId: 'operation-1',
      terminalForRequestId: 'request-1',
      stage: 'building',
      code: 'MODEL_BUILD_FAILED',
      messageId: 'diagnostic.modelBuildFailed',
      recoverable: true,
    })
    handle({
      version: 2,
      kind: 'operation.superseded',
      requestId: 'old-superseded-response',
      operationId: 'operation-1',
      terminalForRequestId: 'request-1',
      generation: 1,
      reason: 'STALE_GENERATION',
    })

    expect(setProgress).toHaveBeenCalledTimes(callsBeforeOlderTerminals)
    expect(refs.activeProgressOperationId.current).toBe('operation-2')

    refs.operations.current.set('export-old', {
      kind: 'export',
      modelRevision: 'revision-old',
      requestId: 'request-export-old',
    })
    refs.exportRequest.current = {
      operationId: 'export-current',
      format: 'step',
      revision: 'revision-current',
      workerEpoch: 'epoch-test',
      fileName: 'current.step',
      downloaded: false,
    }
    handle({
      version: 2,
      kind: 'operation.progress',
      requestId: 'old-export-progress',
      operationId: 'export-old',
      stage: 'exporting',
    })
    handle({
      version: 2,
      kind: 'operation.error',
      requestId: 'old-export-error',
      operationId: 'export-old',
      terminalForRequestId: 'request-export-old',
      stage: 'exporting',
      code: 'STEP_EXPORT_FAILED',
      messageId: 'diagnostic.exportInvalid',
      recoverable: true,
    })

    expect(setProgress).toHaveBeenCalledTimes(callsBeforeOlderTerminals)
    expect(refs.activeProgressOperationId.current).toBe('operation-2')
  })

  it('surfaces Wall Cover glyph failures on the text field', () => {
    const { context, refs } = createContext()
    refs.operations.current.set('operation-2', {
      kind: 'model',
      generation: 2,
      modelId: 'opengrid-wall-cover',
      parameters: { text: 'A' },
      requestId: 'request-2',
    })
    const handle = createWorkerEventHandler(context)

    handle({
      version: 2,
      kind: 'operation.error',
      requestId: 'wall-cover-error-response',
      operationId: 'operation-2',
      terminalForRequestId: 'request-2',
      stage: 'building',
      code: 'MODEL_BUILD_FAILED',
      messageId: 'diagnostic.wallCoverGlyphUnsupported',
      recoverable: true,
      generation: 2,
    })

    expect(context.setFieldErrors).toHaveBeenCalledWith({
      text: {
        field: 'text',
        messageId: 'diagnostic.wallCoverGlyphUnsupported',
      },
    })
  })

  it('reuses the candidate mesh when model.ready only transfers the revision', () => {
    const { context, refs } = createContext()
    const send = vi.fn()
    refs.client.current = { send } as never
    const handle = createWorkerEventHandler(context)
    const mesh: MeshSnapshot = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
      indices: new Uint32Array([0, 1, 2]).buffer,
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
      triangleCount: 1,
    }

    handle({
      version: 2,
      kind: 'model.candidate-ready',
      requestId: 'candidate-response',
      operationId: 'operation-2',
      generation: 2,
      candidateId: 'candidate-1',
      workerEpoch: 'epoch-test',
      modelId: 'box',
      parameters: { width: 20, depth: 30, height: 40 },
      mesh,
    })

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'model.commit' }),
    )
    expect(refs.operations.current.get('operation-2')?.candidateMesh).toBe(mesh)

    handle({
      version: 2,
      kind: 'model.ready',
      requestId: 'ready-response',
      operationId: 'operation-2',
      generation: 2,
      modelRevision: 'revision-1',
      workerEpoch: 'epoch-test',
      modelId: 'box',
      parameters: { width: 20, depth: 30, height: 40 },
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
    })

    expect(context.dispatch).toHaveBeenCalledWith({
      type: 'model-ready',
      model: expect.objectContaining({ mesh }),
    })
    expect(refs.operations.current.has('operation-2')).toBe(false)
  })

  it('commits the validated OpenConnect organizer candidate mesh for the current revision', () => {
    const parameters = {
      ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
      holeShape: 'hexagon' as const,
      tiltAngle: 30,
    }
    const { context, refs } = createContext(
      'opengrid-openconnect-organizer',
      parameters,
    )
    const send = vi.fn()
    refs.client.current = { send } as never
    const handle = createWorkerEventHandler(context)
    const mesh: MeshSnapshot = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
      indices: new Uint32Array([0, 1, 2]).buffer,
      bounds: { min: [-28, 0, 0], max: [28, 32, 56] },
      triangleCount: 1,
    }

    handle({
      version: 2,
      kind: 'model.candidate-ready',
      requestId: 'organizer-candidate-response',
      operationId: 'operation-2',
      generation: 2,
      candidateId: 'organizer-candidate-1',
      workerEpoch: 'epoch-test',
      modelId: 'opengrid-openconnect-organizer',
      parameters,
      mesh,
    })
    handle({
      version: 2,
      kind: 'model.ready',
      requestId: 'organizer-ready-response',
      operationId: 'operation-2',
      generation: 2,
      modelRevision: 'organizer-revision-1',
      workerEpoch: 'epoch-test',
      modelId: 'opengrid-openconnect-organizer',
      parameters,
      bounds: mesh.bounds,
    })

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'model.commit',
        candidateId: 'organizer-candidate-1',
      }),
    )
    expect(context.dispatch).toHaveBeenCalledWith({
      type: 'model-ready',
      model: expect.objectContaining({
        revision: 'organizer-revision-1',
        modelId: 'opengrid-openconnect-organizer',
        parameters,
        mesh,
      }),
    })
  })

  it('does not commit a Wall Cover candidate without both named part meshes', () => {
    const { context, refs } = createContext()
    const send = vi.fn()
    refs.client.current = { send } as never
    refs.operations.current.set('operation-2', {
      kind: 'model',
      generation: 2,
      modelId: 'opengrid-wall-cover',
      parameters: { text: 'A' },
      requestId: 'request-2',
    })
    const handle = createWorkerEventHandler(context)
    const mesh: MeshSnapshot = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
      indices: new Uint32Array([0, 1, 2]).buffer,
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
      triangleCount: 1,
    }

    handle({
      version: 2,
      kind: 'model.candidate-ready',
      requestId: 'cover-candidate-response',
      operationId: 'operation-2',
      generation: 2,
      candidateId: 'cover-candidate-1',
      workerEpoch: 'epoch-test',
      modelId: 'opengrid-wall-cover',
      parameters: { text: 'A' },
      mesh,
    })

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'model.discard',
        candidateId: 'cover-candidate-1',
      }),
    )
    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recoverable-error' }),
    )
  })

  it('discards a candidate whose model metadata does not match the operation', () => {
    const { context, refs } = createContext()
    const send = vi.fn()
    refs.client.current = { send } as never
    const handle = createWorkerEventHandler(context)
    const mesh: MeshSnapshot = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
      indices: new Uint32Array([0, 1, 2]).buffer,
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
      triangleCount: 1,
    }

    handle({
      version: 2,
      kind: 'model.candidate-ready',
      requestId: 'mismatched-candidate-response',
      operationId: 'operation-2',
      generation: 2,
      candidateId: 'mismatched-candidate-1',
      workerEpoch: 'epoch-test',
      modelId: 'opengrid-wall-cover',
      parameters: { text: 'A' },
      mesh,
      partMeshes: [
        { name: 'body', mesh },
        { name: 'text', mesh },
      ],
    })

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'model.discard',
        candidateId: 'mismatched-candidate-1',
      }),
    )
    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recoverable-error' }),
    )
  })
})
