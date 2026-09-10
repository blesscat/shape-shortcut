import { describe, expect, it, vi } from 'vitest'
import { PROTOCOL_VERSION } from '../../src/cad-contract/messages'
import { createExportHandlers } from '../../src/components/cad/workspace/runtime/export'
import { initialCadState, type CadState } from '../../src/features/cad/state'
import type {
  RuntimeContext,
  RuntimeRefs,
} from '../../src/components/cad/workspace/runtime/types'
import type { CadWorkerClient } from '../../src/features/cad/worker-client'
import type {
  ModelBounds,
  ModelParameterValues,
  OpenGridSnapParameters,
} from '../../src/cad-contract/units'
import {
  boundsForOpenGridWallCover,
  boundsForOpenGridSnap,
  boundsForPillar,
} from '../../src/cad-contract/units'

function createContext(
  modelId:
    'box' | 'opengrid-pillar' | 'opengrid-snap' | 'opengrid-wall-cover' = 'box',
  pillarMode:
    'detachable-corner-seat' | 'positioning' = 'detachable-corner-seat',
  snapOffset = 0.35,
  snapFootprint: 'full' | 'half' | 'quarter' = 'half',
  snapFlatText = false,
): {
  context: RuntimeContext
  refs: RuntimeRefs
  client: { send: ReturnType<typeof vi.fn> }
  dispatch: ReturnType<typeof vi.fn>
} {
  let parameters: ModelParameterValues
  let rawParameters: Record<string, string>
  let bounds: ModelBounds

  if (modelId === 'opengrid-wall-cover') {
    parameters = { text: 'A' }
    rawParameters = { text: 'A' }
    bounds = boundsForOpenGridWallCover({ text: 'A' })
  } else if (modelId === 'opengrid-snap') {
    const snapParameters: OpenGridSnapParameters = {
      variant: 'Lite',
      profile: snapFlatText ? 'Standard' : 'Directional',
      offset: snapFlatText ? 0 : snapOffset,
      footprint: snapFlatText ? 'full' : snapFootprint,
      fourCornerLocatingHoles: snapFlatText ? false : true,
      centerRemoverHole: snapFlatText ? false : true,
      openConnect: false,
      topText: snapFlatText ? 'SNAP' : 'none',
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    }
    parameters = snapParameters
    rawParameters = {
      variant: 'Lite',
      profile: snapFlatText ? 'Standard' : 'Directional',
      offset: String(snapFlatText ? 0 : snapOffset),
      footprint: snapFlatText ? 'full' : snapFootprint,
      fourCornerLocatingHoles: String(!snapFlatText),
      centerRemoverHole: String(!snapFlatText),
      openConnect: 'false',
      topText: snapFlatText ? 'SNAP' : 'none',
      magnetHoleShape: 'none',
      magnetHoleLength: '0',
      magnetHoleWidth: '0',
      magnetHoleDiameter: '0',
      magnetHoleThickness: '0',
    }
    bounds = boundsForOpenGridSnap(snapParameters)
  } else if (modelId === 'opengrid-pillar') {
    const pillarParameters =
      pillarMode === 'positioning'
        ? { mode: 'positioning' as const, length: 10, offset: 0 }
        : { mode: 'detachable-corner-seat' as const, length: 3.8, offset: 0 }
    parameters = pillarParameters
    rawParameters =
      pillarMode === 'positioning'
        ? { mode: pillarMode, length: '10', offset: '0' }
        : { mode: pillarMode, length: '3.8', offset: '0' }
    bounds = boundsForPillar(pillarParameters)
  } else {
    parameters = { width: 20, depth: 30, height: 40 }
    rawParameters = { width: '20', depth: '30', height: '40' }
    bounds = { min: [-10, -15, 0], max: [10, 15, 40] }
  }
  const state = {
    ...initialCadState(modelId, parameters),
    status: 'ready' as const,
    exportStatus: 'idle' as const,
    workerEpoch: 'epoch-1',
    committed: {
      revision: 'revision-1',
      workerEpoch: 'epoch-1',
      generation: 1,
      modelId,
      parameters,
      mesh: {
        positions: new ArrayBuffer(12),
        normals: new ArrayBuffer(12),
        indices: new ArrayBuffer(12),
        bounds,
        triangleCount: 1,
      },
    },
  } satisfies CadState
  const client = { send: vi.fn(() => 'request-stl') }
  const dispatch = vi.fn()
  const refs = {
    client: { current: client as unknown as CadWorkerClient },
    rawParameters: { current: rawParameters },
    state: { current: state },
    workerEpoch: { current: 'epoch-1' },
    latestGeneration: { current: 1 },
    session: { current: { mode: 'bootstrap', ready: false, pending: null } },
    autoRecoveryAttempts: { current: 0 },
    operations: { current: new Map() },
    activeProgressOperationId: { current: null },
    exportRequest: { current: null },
    debounce: { current: null },
    timers: { current: new Map() },
    startWorker: { current: vi.fn() },
    recoverWorker: { current: vi.fn() },
    disposed: { current: false },
  } as RuntimeRefs
  const context = {
    refs,
    dispatch,
    setRawParameters: vi.fn(),
    setPersistedParameters: vi.fn(),
    setFieldErrors: vi.fn(),
    setProgress: vi.fn(),
    setOperationProgress: vi.fn(),
    clearOperationProgress: vi.fn(),
    clearProgress: vi.fn(),
    clearTimer: vi.fn(),
    setOperationTimeout: vi.fn(),
    recoverWorker: vi.fn(),
  } satisfies RuntimeContext
  return { context, refs, client, dispatch }
}

describe('CAD export runtime', () => {
  it('sends an STL command with the committed model metadata', () => {
    const { context, refs, client } = createContext()
    const handlers = createExportHandlers(context)

    handlers.handleExport('stl')

    expect(client.send).toHaveBeenCalledWith({
      kind: 'export.stl',
      operationId: expect.stringMatching(/^export-stl-/),
      modelRevision: 'revision-1',
      workerEpoch: 'epoch-1',
      file: { name: 'box-20x30x40.stl', mime: 'model/stl' },
    })
    expect(refs.exportRequest.current).toMatchObject({
      format: 'stl',
      revision: 'revision-1',
      workerEpoch: 'epoch-1',
      fileName: 'box-20x30x40.stl',
      downloaded: false,
    })
  })

  it('sends a 3MF command only for the Wall Cover preset', () => {
    const { context, refs, client } = createContext('opengrid-wall-cover')
    createExportHandlers(context).handleExport('3mf')

    expect(client.send).toHaveBeenCalledWith({
      kind: 'export.3mf',
      operationId: expect.stringMatching(/^export-3mf-/),
      modelRevision: 'revision-1',
      workerEpoch: 'epoch-1',
      file: {
        name: 'opengrid-wall-cover.3mf',
        mime: 'model/3mf',
      },
    })
    expect(refs.exportRequest.current).toMatchObject({
      format: '3mf',
      fileName: 'opengrid-wall-cover.3mf',
    })
  })

  it('uses remaining pillar modes in deterministic STEP and STL metadata', () => {
    const step = createContext('opengrid-pillar')
    const stepHandlers = createExportHandlers(step.context)
    stepHandlers.handleExport('step')

    expect(step.client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'export.step',
        file: {
          name: 'pillar-5.2-detachable-corner-seat.step',
          mime: 'model/step',
        },
      }),
    )

    const stl = createContext('opengrid-pillar', 'positioning')
    const stlHandlers = createExportHandlers(stl.context)
    stlHandlers.handleExport('stl')

    expect(stl.client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'export.stl',
        file: { name: 'pillar-10-positioning.stl', mime: 'model/stl' },
      }),
    )
  })

  it('downloads the fixed Half STEP without sending an incremental worker export', () => {
    const { context, refs, client } = createContext('opengrid-snap')
    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    })

    const handlers = createExportHandlers(context)
    handlers.handleExport('step')

    expect(client.send).not.toHaveBeenCalled()
    expect(anchor).toMatchObject({
      href: '/downloads/snap-half.step',
      download: 'Half.step',
    })
    expect(click).toHaveBeenCalledOnce()
    expect(refs.exportRequest.current).toBeNull()

    vi.unstubAllGlobals()
  })

  it('downloads the fixed Quarter STEP without sending an incremental worker export', () => {
    const { context, client } = createContext(
      'opengrid-snap',
      'detachable-corner-seat',
      0.35,
      'quarter',
    )
    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    })

    createExportHandlers(context).handleExport('step')

    expect(client.send).not.toHaveBeenCalled()
    expect(anchor).toMatchObject({
      href: '/downloads/snap-quarter.step',
      download: 'Quarter.step',
    })
    expect(click).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })

  it('rejects a mismatched STL response without triggering a download', () => {
    const { context, refs, dispatch } = createContext()
    const handlers = createExportHandlers(context)
    handlers.handleExport('stl')
    const request = refs.exportRequest.current
    if (!request) throw new Error('export request was not created')

    handlers.handleExportReady({
      version: PROTOCOL_VERSION,
      kind: 'export.ready',
      requestId: 'response-1',
      operationId: request.operationId,
      modelRevision: request.revision,
      workerEpoch: request.workerEpoch,
      format: 'stl',
      mime: 'model/stl',
      fileName: request.fileName,
      bytes: new ArrayBuffer(84),
    })

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recoverable-error',
        error: expect.objectContaining({ code: 'STL_METADATA_INVALID' }),
      }),
    )
    expect(refs.exportRequest.current).toBeNull()
  })
})
