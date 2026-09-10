import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkerCommandInput } from '../../src/cad-contract/messages'
import type {
  ModelId,
  ModelParameterValues,
  OpenGridParameters,
  OpenGridSnapParameters,
} from '../../src/cad-contract/units'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_PREVIEW_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_DIVIDER_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
} from '../../src/cad-contract/units'
import type { CadWorkerClient } from '../../src/features/cad/worker-client'
import { initialCadState } from '../../src/features/cad/state'
import { rawFromParameters } from '../../src/components/cad/workspace/validation'
import { createModelGenerationHandlers } from '../../src/components/cad/workspace/runtime/model-generation'
import { createComponentParameterStore } from '../../src/features/cad/parameters'
import type {
  RuntimeContext,
  RuntimeRefs,
} from '../../src/components/cad/workspace/runtime/types'

function defaultInputForModel(modelId: ModelId): ModelParameterValues {
  if (modelId === 'box') return { width: 20, depth: 30, height: 40 }
  if (modelId === 'modular-grid-base' || modelId === 'hsw-cell') {
    return { rows: 1, columns: 1 }
  }
  if (modelId === 'hexagonal-column') {
    return { height: 8, count: 1, gap: 1, orientation: 'lying' }
  }
  if (modelId === 'opengrid-pillar') {
    return { mode: 'detachable-corner-seat', length: 3.8, offset: 0 }
  }
  if (modelId === 'opengrid') {
    return opengridParameters()
  }
  if (modelId === 'opengrid-stackable-box') {
    return {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    }
  }
  if (modelId === 'opengrid-stackable-cylinder') {
    return { ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS }
  }
  if (modelId === 'opengrid-openconnect-organizer') {
    return { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS }
  }
  if (modelId === 'opengrid-snap') {
    return {
      variant: 'Full',
      profile: 'Standard',
      offset: 0,
      footprint: 'full',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      openConnect: false,
      topText: 'none',
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    }
  }
  if (modelId === 'opengrid-wall-cover') return { text: 'A' }
  if (modelId === 'opengrid-divider') {
    return {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
  }
  throw new Error(`Unknown model: ${modelId}`)
}

function opengridParameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    ...overrides,
  }
}

function createRuntimeContext(
  modelId: ModelId = 'box',
  initialInput: ModelParameterValues = defaultInputForModel(modelId),
) {
  const state = initialCadState(modelId, initialInput)
  let requestNumber = 0
  const send = vi.fn((command: WorkerCommandInput) => {
    void command
    return `request-${++requestNumber}`
  })
  const client = {
    send,
  } as unknown as CadWorkerClient
  const refs: RuntimeRefs = {
    client: { current: client },
    rawParameters: { current: rawFromParameters(state.input) },
    state: { current: state },
    workerEpoch: { current: 'epoch-test' },
    latestGeneration: { current: 0 },
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
  }

  const context = {
    refs,
    dispatch: vi.fn(),
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
  } as unknown as RuntimeContext & {
    setOperationTimeout: ReturnType<typeof vi.fn>
  }

  context.refs.startWorker.current = (_manual, pending) => {
    if (!pending) return
    createModelGenerationHandlers(context).sendGenerate(
      pending.modelId,
      pending.parameters,
      pending.generation,
    )
  }
  return { client, send, context }
}

describe('CAD model generation debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits 500ms after a valid parameter change before generating', () => {
    const { client, send, context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25')

    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.invalidate'),
    ).toBe(false)

    vi.advanceTimersByTime(499)
    expect(
      send.mock.calls.filter(([command]) => command.kind === 'model.generate'),
    ).toHaveLength(0)

    vi.advanceTimersByTime(1)
    expect(client.send).toHaveBeenCalledTimes(1)
    expect(client.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'box',
        generation: 1,
        parameters: { width: 25, depth: 30, height: 40 },
      }),
    )
  })

  it('passes typed valid parameters to persistence before the debounce', () => {
    const { context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25')

    expect(context.setPersistedParameters).toHaveBeenCalledWith('box', {
      width: 25,
      depth: 30,
      height: 40,
    })
  })

  it('dispatches the exact OpenConnect organizer snapshot to generation', () => {
    const initial = {
      ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
      holeShape: 'triangle' as const,
      tiltAngle: 20,
    }
    const { send, context } = createRuntimeContext(
      'opengrid-openconnect-organizer',
      initial,
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('holeDepth', '30')
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-openconnect-organizer',
        parameters: { ...initial, holeDepth: 30 },
      }),
    )
  })

  it('clamps an OpenConnect shelf angle when a deeper row count lowers its limit', () => {
    const { send, context } = createRuntimeContext(
      'opengrid-openconnect-shelf',
      { columns: 3, rows: 2, connectorRows: 1, angle: 19.5 },
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('rows', '3')

    expect(context.setRawParameters).toHaveBeenCalledWith({
      columns: '3',
      rows: '3',
      connectorRows: '1',
      angle: '14',
    })
    expect(context.setPersistedParameters).toHaveBeenCalledWith(
      'opengrid-openconnect-shelf',
      { columns: 3, rows: 3, connectorRows: 1, angle: 14 },
    )
    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'input-valid' }),
    )

    vi.advanceTimersByTime(500)
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        parameters: { columns: 3, rows: 3, connectorRows: 1, angle: 14 },
      }),
    )
  })

  it('clamps an OpenConnect shelf angle when fewer Z connectors lower its limit', () => {
    const { send, context } = createRuntimeContext(
      'opengrid-openconnect-shelf',
      { columns: 3, rows: 3, connectorRows: 2, angle: 29.5 },
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('connectorRows', '1')

    expect(context.setRawParameters).toHaveBeenCalledWith({
      columns: '3',
      rows: '3',
      connectorRows: '1',
      angle: '14',
    })
    expect(context.setPersistedParameters).toHaveBeenCalledWith(
      'opengrid-openconnect-shelf',
      { columns: 3, rows: 3, connectorRows: 1, angle: 14 },
    )

    vi.advanceTimersByTime(500)
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        parameters: { columns: 3, rows: 3, connectorRows: 1, angle: 14 },
      }),
    )
  })

  it('applies a scoped parameter snapshot through the normal invalidation flow', () => {
    const { client, context } = createRuntimeContext('opengrid-snap')
    const handlers = createModelGenerationHandlers(context)
    const parameters = {
      ...defaultInputForModel('opengrid-snap'),
      variant: 'Lite' as const,
      offset: 0.25,
      fourCornerLocatingHoles: true,
      centerRemoverHole: true,
    }

    handlers.handleParametersScopeChange(parameters)

    expect(context.setRawParameters).toHaveBeenCalledWith(
      rawFromParameters(parameters),
    )
    expect(context.setPersistedParameters).toHaveBeenCalledWith(
      'opengrid-snap',
      parameters,
    )
    expect(context.dispatch).toHaveBeenCalledWith({
      type: 'input-valid',
      modelId: 'opengrid-snap',
      input: parameters,
      generation: 1,
    })
    expect(client.send).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'model.invalidate' }),
    )
  })

  it('debounces pillar mode changes and persists the typed mode', () => {
    const { client, send, context } = createRuntimeContext('opengrid-pillar')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('mode', 'positioning')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-pillar',
        parameters: { mode: 'positioning', length: 10, offset: 0 },
      }),
    )
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.invalidate'),
    ).toBe(false)
    expect(context.setPersistedParameters).toHaveBeenLastCalledWith(
      'opengrid-pillar',
      {
        mode: 'positioning',
        length: 10,
        offset: 0,
      },
    )
  })

  it('resets numeric fields to seat defaults when switching back to the locking corner seat', () => {
    const { client, send, context } = createRuntimeContext('opengrid-pillar', {
      mode: 'positioning',
      length: 25,
      offset: 0.2,
    })
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('mode', 'detachable-corner-seat')
    vi.advanceTimersByTime(500)

    expect(context.setRawParameters).toHaveBeenCalledWith({
      mode: 'detachable-corner-seat',
      length: '3.8',
      offset: '0',
    })
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        parameters: {
          mode: 'detachable-corner-seat',
          length: 3.8,
          offset: 0,
        },
      }),
    )
    expect(client.send).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'model.invalidate' }),
    )
  })

  it.each([
    ['empty', ''],
    ['unsupported', 'legacy'],
    ['wrong case', 'STANDARD'],
  ])(
    'invalidates a pillar mode that is %s without generating a snapshot',
    (_label, value) => {
      const { client, send, context } = createRuntimeContext('opengrid-pillar')
      const handlers = createModelGenerationHandlers(context)

      handlers.handleInputChange('mode', value)
      vi.advanceTimersByTime(500)

      expect(context.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'input-invalid' }),
      )
      expect(client.send).toHaveBeenLastCalledWith(
        expect.objectContaining({
          kind: 'model.invalidate',
          reason: 'invalid-input',
        }),
      )
      expect(
        send.mock.calls.some(([command]) => command.kind === 'model.generate'),
      ).toBe(false)
      expect(context.setPersistedParameters).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['fractional-step XY offset', 'offset', '0.03'],
    ['out-of-range XY offset', 'offset', '1.1'],
    ['fractional-step negative XY offset', 'offset', '-0.03'],
  ] as const)(
    'invalidates a pillar %s without generating a snapshot',
    (_label, field, value) => {
      const { client, send, context } = createRuntimeContext(
        'opengrid-pillar',
        {
          mode: 'positioning',
          length: 10,
          offset: 0,
        },
      )
      const handlers = createModelGenerationHandlers(context)

      handlers.handleInputChange(field, value)
      vi.advanceTimersByTime(500)

      expect(context.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'input-invalid' }),
      )
      expect(client.send).toHaveBeenLastCalledWith(
        expect.objectContaining({
          kind: 'model.invalidate',
          reason: 'invalid-input',
        }),
      )
      expect(
        send.mock.calls.some(([command]) => command.kind === 'model.generate'),
      ).toBe(false)
      expect(context.setPersistedParameters).not.toHaveBeenCalled()
    },
  )

  it('rejects a second unsupported pillar mode value without generating a snapshot', () => {
    const { client, send, context } = createRuntimeContext('opengrid-pillar')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('mode', 'yes')
    vi.advanceTimersByTime(500)

    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'input-invalid' }),
    )
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
      }),
    )
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(false)
    expect(context.setPersistedParameters).not.toHaveBeenCalled()
  })

  it('sends nothing for rapid snapshots and generates only the final legal value', () => {
    const { client, send, context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '21')
    handlers.handleInputChange('width', '22')
    handlers.handleInputChange('width', '23')

    expect(client.send).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)

    const generateCalls = send.mock.calls.filter(
      ([command]) => command.kind === 'model.generate',
    )
    expect(generateCalls).toHaveLength(1)
    expect(generateCalls[0]?.[0]).toMatchObject({
      generation: 3,
      parameters: { width: 23, depth: 30, height: 40 },
    })
  })

  it('generates only the latest rapid OpenConnect organizer snapshot', () => {
    const { send, context } = createRuntimeContext(
      'opengrid-openconnect-organizer',
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('tiltAngle', '20')
    handlers.handleInputChange('tiltAngle', '25')
    handlers.handleInputChange('tiltAngle', '30')

    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)

    const generateCalls = send.mock.calls.filter(
      ([command]) => command.kind === 'model.generate',
    )
    expect(generateCalls).toHaveLength(1)
    expect(generateCalls[0]?.[0]).toMatchObject({
      modelId: 'opengrid-openconnect-organizer',
      generation: 3,
      parameters: {
        ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
        tiltAngle: 30,
      },
    })
  })

  it('clears an active progress stage when input becomes invalid', () => {
    const { context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25.5')

    expect(context.clearProgress).toHaveBeenCalledOnce()
    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'input-invalid' }),
    )
    expect(context.setPersistedParameters).not.toHaveBeenCalled()
  })

  it('rejects an overlong Wall Cover label without scheduling generation', () => {
    const { client, send, context } = createRuntimeContext(
      'opengrid-wall-cover',
      { text: 'A' },
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('text', '123456789')

    expect(context.setFieldErrors).toHaveBeenCalledWith({
      text: {
        field: 'text',
        messageId: 'validation.wallCoverTextTooLong',
        params: { max: 8 },
      },
    })
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        generation: 1,
        reason: 'invalid-input',
      }),
    )
    vi.advanceTimersByTime(500)
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(false)
  })

  it('keeps generation flow when persistence storage rejects a write', () => {
    const parameterStore = createComponentParameterStore({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('storage write failed')
        },
      },
    })
    const { context, send } = createRuntimeContext()
    context.setPersistedParameters = (modelId, parameters) => {
      parameterStore.set(modelId, parameters)
    }
    const handlers = createModelGenerationHandlers(context)

    expect(() => handlers.handleInputChange('width', '25')).not.toThrow()
    expect(parameterStore.get('box')).toEqual({
      width: 25,
      depth: 30,
      height: 40,
    })

    vi.advanceTimersByTime(500)
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(true)
    parameterStore.dispose()
  })

  it('keeps an invalid settled snapshot from releasing a queued generate', () => {
    const { client, send, context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25')
    handlers.handleInputChange('width', '25.5')
    vi.advanceTimersByTime(500)

    expect(
      send.mock.calls.filter(([command]) => command.kind === 'model.generate'),
    ).toHaveLength(0)
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        generation: 2,
        reason: 'invalid-input',
      }),
    )
  })

  it('sends an HSW slider snapshot through the same settled-input debounce', () => {
    const { client, send, context } = createRuntimeContext('hsw-cell')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('rows', '2')
    vi.advanceTimersByTime(500)

    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'hsw-cell',
        parameters: { rows: 2, columns: 1 },
      }),
    )
    expect(
      send.mock.calls.filter(([command]) => command.kind === 'model.generate'),
    ).toHaveLength(1)
  })

  it('keeps defensive validation for an out-of-range HSW snapshot', () => {
    const { client, context } = createRuntimeContext('hsw-cell')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('rows', '21')

    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'input-invalid' }),
    )
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
      }),
    )
  })

  it('rejects a programmatic HSW update for a non-HSW parameter key', () => {
    const { client, context, send } = createRuntimeContext('hsw-cell')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '20')
    vi.advanceTimersByTime(500)

    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'input-invalid' }),
    )
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
      }),
    )
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(false)
  })

  it('debounces a complete typed OpenGrid snapshot without scalar serialization', () => {
    const { client, send, context } = createRuntimeContext('opengrid')
    const handlers = createModelGenerationHandlers(context)
    const input = opengridParameters({
      variant: 'Lite',
      rows: 5,
      columns: 7,
      screwKind: 'custom',
      screwMode: 'by-row-column',
      screwEveryRows: 2,
      screwEveryColumns: 3,
      connectorHoles: 'enabled',
    })
    handlers.handleOpenGridParametersChange(input)

    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.invalidate'),
    ).toBe(false)
    vi.advanceTimersByTime(500)
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid',
        generation: 1,
        parameters: input,
      }),
    )
  })

  it('debounces OpenGrid stackable-box half-cell input through its own model id', () => {
    const { client, send, context } = createRuntimeContext(
      'opengrid-stackable-box',
      {
        x: 0.5,
        y: 1,
        height: 10,
        cornerSeatMode: 'detachable-corner-seat',
        fullBottomHoleGrid: false,
        topRimMode: 'stacking-rail',
        bottomMode: 'stacking',
      },
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('x', '1.5')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-stackable-box',
        parameters: {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          x: 1.5,
          y: 1,
          height: 10,
          cornerSeatMode: 'detachable-corner-seat',
          fullBottomHoleGrid: false,
          topRimMode: 'stacking-rail',
        bottomMode: 'stacking',
        },
      }),
    )
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.invalidate'),
    ).toBe(false)

    const generateCommand = send.mock.calls.find(
      ([command]) => command.kind === 'model.generate',
    )?.[0]
    const timeoutCall = (
      context.setOperationTimeout as unknown as {
        mock: { calls: Array<[string, number, () => void]> }
      }
    ).mock.calls.at(-1)
    expect(timeoutCall?.[0]).toBe(generateCommand?.operationId)
    expect(timeoutCall?.[1]).toBe(
      PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs,
    )
    const timeoutCallback = timeoutCall?.[2] as (() => void) | undefined
    expect(timeoutCallback).toBeDefined()
    timeoutCallback?.()
    expect(context.recoverWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'WORKER_TIMEOUT',
        generation: 1,
        operationId: generateCommand?.operationId,
      }),
      client,
    )
  })

  it('debounces organizer-box input with its independent typed snapshot', () => {
    const { send, context } = createRuntimeContext('opengrid-organizer-box', {
      ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    })
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('holeShape', 'hexagon')
    handlers.handleInputChange('holeSpacingMode', 'independent')
    handlers.handleInputChange('holeSpacingY', '4')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-organizer-box',
        parameters: {
          ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
          holeShape: 'hexagon',
          holeSpacingMode: 'independent',
          holeSpacingY: 4,
        },
      }),
    )
  })

  it('debounces divider arm counts with 0.5-grid input support', () => {
    const { client, send, context } = createRuntimeContext('opengrid-divider', {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('up', '1.5')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-divider',
        parameters: {
          ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
          left: 1,
          right: 1,
          up: 1.5,
          down: 0,
          height: 20,
          wallThickness: 2,
        },
      }),
    )
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.invalidate'),
    ).toBe(false)
  })

  it('debounces OpenGrid stackable-cylinder 1 mm input through its own model id', () => {
    const { client, send, context } = createRuntimeContext(
      'opengrid-stackable-cylinder',
      {
        innerDiameter: 56,
        height: 30,
        bottomPlateMode: false,
        bottomSeatMode: 'detachable-corner-seat',
      },
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('innerDiameter', '57')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-stackable-cylinder',
        parameters: {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          innerDiameter: 57,
          height: 30,
        },
      }),
    )
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.invalidate'),
    ).toBe(false)
  })

  it('registers divider generation timeout recovery for the current operation', () => {
    const { client, send, context } = createRuntimeContext('opengrid-divider', {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('height', '24')
    vi.advanceTimersByTime(500)

    const generateCommand = send.mock.calls.find(
      ([command]) => command.kind === 'model.generate',
    )?.[0]
    const timeoutCall = (
      context.setOperationTimeout as unknown as {
        mock: { calls: Array<[string, number, () => void]> }
      }
    ).mock.calls.at(-1)
    expect(timeoutCall?.[0]).toBe(generateCommand?.operationId)
    expect(timeoutCall?.[1]).toBe(
      PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs,
    )
    const timeoutCallback = timeoutCall?.[2] as (() => void) | undefined
    expect(timeoutCallback).toBeDefined()
    timeoutCallback?.()
    expect(context.recoverWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'WORKER_TIMEOUT',
        generation: 1,
        operationId: generateCommand?.operationId,
      }),
      client,
    )
  })

  it('keeps cylinder profile and seat mode in the generation snapshot', () => {
    const { send, context } = createRuntimeContext(
      'opengrid-stackable-cylinder',
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('bottomSeatMode', 'none')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-stackable-cylinder',
        parameters: {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          bottomSeatMode: 'none',
        },
      }),
    )
  })

  it('keeps bottom-plate mode in the generation snapshot', () => {
    const { send, context } = createRuntimeContext(
      'opengrid-stackable-cylinder',
    )
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('bottomPlateMode', 'true')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-stackable-cylinder',
        parameters: {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          bottomPlateMode: true,
        },
      }),
    )
  })

  it('invalidates typed OpenGrid snapshots and disables generation for errors', () => {
    const { client, send, context } = createRuntimeContext('opengrid')
    const handlers = createModelGenerationHandlers(context)
    handlers.handleOpenGridParametersChange(
      opengridParameters({
        variant: 'Full',
        rows: 0,
        columns: 1,
        connectorHoles: 'none',
        screwMode: 'none',
      }) as OpenGridParameters,
    )

    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
        generation: 1,
      }),
    )
    expect(context.setFieldErrors).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.objectContaining({
          field: 'rows',
          messageId: expect.any(String),
        }),
      }),
    )
    vi.advanceTimersByTime(500)
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(false)
  })

  it('invalidates a newer generation when OpenGrid dimension calculation fails', () => {
    const { client, send, context } = createRuntimeContext('opengrid')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleOpenGridDimensionCalculationInvalid()

    expect(context.refs.latestGeneration.current).toBe(1)
    expect(context.clearProgress).toHaveBeenCalled()
    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'input-invalid',
        modelId: 'opengrid',
        input: context.refs.state.current.input,
        generation: 1,
      }),
    )
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        generation: 1,
        reason: 'invalid-input',
      }),
    )

    vi.advanceTimersByTime(500)
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(false)
  })

  it('accepts a legal large official OpenGrid tuple before sending model.generate', () => {
    const { client, send, context } = createRuntimeContext('opengrid')
    const handlers = createModelGenerationHandlers(context)
    const input = opengridParameters({
      variant: 'Heavy',
      rows: 10,
      columns: 10,
      screwKind: 'custom',
      screwMode: 'everywhere',
      connectorHoles: 'enabled',
    })
    handlers.handleOpenGridParametersChange(input)
    vi.advanceTimersByTime(500)
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(true)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        parameters: input,
      }),
    )
  })

  it('uses an independent OpenGrid preview mesh configuration', () => {
    const { send, context } = createRuntimeContext('opengrid')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleOpenGridParametersChange(opengridParameters())
    vi.advanceTimersByTime(500)

    const command = send.mock.calls.find(
      ([value]) => value.kind === 'model.generate',
    )?.[0]
    expect(command).toEqual(
      expect.objectContaining({
        previewConfig: OPENGRID_PREVIEW_CONFIGURATION,
      }),
    )
    if (!command || command.kind !== 'model.generate') {
      throw new Error('MODEL_GENERATE_COMMAND_MISSING')
    }
    command.previewConfig.tolerance = 0.05
    expect(OPENGRID_PREVIEW_CONFIGURATION.tolerance).toBe(0.01)
  })

  it('debounces decimal OpenGrid Snap offsets and invalidates incomplete input', () => {
    const { client, send, context } = createRuntimeContext('opengrid-snap')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('offset', '0.2')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-snap',
        parameters: {
          variant: 'Full',
          profile: 'Standard',
          offset: 0.2,
          footprint: 'full',
          fourCornerLocatingHoles: false,
          centerRemoverHole: false,
          openConnect: false,
          topText: 'none',
          magnetHoleShape: 'none',
          magnetHoleLength: 0,
          magnetHoleWidth: 0,
          magnetHoleDiameter: 0,
          magnetHoleThickness: 0,
        },
      }),
    )

    handlers.handleInputChange('offset', '')
    vi.advanceTimersByTime(PROTOTYPE_CONFIGURATION.inputDebounceMs)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
      }),
    )
    expect(
      send.mock.calls.some(
        ([command]) =>
          command.kind === 'model.generate' &&
          command.parameters &&
          'offset' in command.parameters &&
          (command.parameters as OpenGridSnapParameters).offset === null,
      ),
    ).toBe(false)
  })
})
