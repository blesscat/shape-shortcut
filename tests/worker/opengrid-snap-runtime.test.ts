import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  buildModelBRepWithParts: vi.fn(),
  initialiseCadKernel: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  assertOpenGridSnapShapeQuality: vi.fn(),
  assertOpenGridSnapOpenConnectShapeQuality: vi.fn(),
  assertOpenGridWallCoverShapeQuality: vi.fn(),
  loadOpenGridSnapReference: vi.fn(),
  loadOpenGridWallCoverReference: vi.fn(),
  loadOpenGridSnapFixedFootprint: vi.fn(),
  loadOpenGridSnapOpenConnectHead: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
  exportThreeMfBytes: vi.fn(),
  isThreeMfPackage: vi.fn(),
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))
vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
  buildModelBRepWithParts: mocks.buildModelBRepWithParts,
}))
vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))
vi.mock('../../src/cad-kernel/components/opengrid/quality', () => ({
  assertOpenGridShapeQuality: vi.fn(),
}))
vi.mock('../../src/cad-kernel/components/opengrid-snap/quality', () => ({
  assertOpenGridSnapShapeQuality: mocks.assertOpenGridSnapShapeQuality,
  assertOpenGridSnapOpenConnectShapeQuality:
    mocks.assertOpenGridSnapOpenConnectShapeQuality,
}))
vi.mock('../../src/cad-kernel/components/opengrid-wall-cover/quality', () => ({
  assertOpenGridWallCoverShapeQuality:
    mocks.assertOpenGridWallCoverShapeQuality,
}))
vi.mock('../../src/cad-kernel/components/opengrid-snap/builder', () => ({
  loadOpenGridSnapReference: mocks.loadOpenGridSnapReference,
  loadOpenGridSnapFixedFootprint: mocks.loadOpenGridSnapFixedFootprint,
  loadOpenGridSnapOpenConnectHead: mocks.loadOpenGridSnapOpenConnectHead,
}))
vi.mock('../../src/cad-kernel/components/opengrid-wall-cover/builder', () => ({
  loadOpenGridWallCoverReference: mocks.loadOpenGridWallCoverReference,
}))
vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
  exportThreeMfBytes: mocks.exportThreeMfBytes,
  isThreeMfPackage: mocks.isThreeMfPackage,
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'
import {
  openGridSnapFileName,
  openGridSnapStlFileName,
  openGridWallCoverThreeMfFileName,
  type OpenGridSnapParameters,
} from '../../src/cad-contract/units'

const base = {
  version: 2 as const,
  requestId: 'request-base',
  operationId: 'operation-base',
}

function snapParameters(
  variant: 'Full' | 'Lite',
  offset: number,
  footprint: 'full' | 'half' | 'quarter' = 'full',
  overrides: Partial<
    Pick<
      OpenGridSnapParameters,
      | 'profile'
      | 'fourCornerLocatingHoles'
      | 'centerRemoverHole'
      | 'openConnect'
      | 'topText'
      | 'magnetHoleShape'
      | 'magnetHoleLength'
      | 'magnetHoleWidth'
      | 'magnetHoleDiameter'
      | 'magnetHoleThickness'
    >
  > = {},
): OpenGridSnapParameters {
  const fixedFootprintOpenConnect = footprint === 'full'
  return {
    variant,
    profile: 'Standard',
    offset,
    footprint,
    fourCornerLocatingHoles: false,
    centerRemoverHole: false,
    openConnect: fixedFootprintOpenConnect,
    topText: 'none',
    magnetHoleShape: 'none',
    magnetHoleLength: 0,
    magnetHoleWidth: 0,
    magnetHoleDiameter: 0,
    magnetHoleThickness: 0,
    ...overrides,
  }
}

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function generateCommand(
  parameters: OpenGridSnapParameters = {
    ...snapParameters('Full', 0),
  },
  generation = 1,
) {
  return {
    ...base,
    requestId: `snap-request-${generation}`,
    operationId: `snap-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-snap' as const,
    parameters,
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function generateWallCoverCommand(generation = 1) {
  return {
    ...base,
    requestId: `wall-cover-request-${generation}`,
    operationId: `wall-cover-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-wall-cover' as const,
    parameters: { text: 'A' },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.meshBRep.mockImplementation((shape: { bounds?: unknown }) => ({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: shape.bounds ?? { min: [0, 0, 0], max: [1, 1, 1] },
    triangleCount: 1,
  }))
  mocks.serializeMesh.mockImplementation((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  }))
  mocks.buildModelBRep.mockImplementation(async () => ({ delete: vi.fn() }))
  mocks.buildModelBRepWithParts.mockImplementation(async () => ({
    shape: { delete: vi.fn() },
    qualityShape: { delete: vi.fn() },
    parts: [
      { name: 'body', shape: { delete: vi.fn() } },
      { name: 'text', shape: { delete: vi.fn() } },
    ],
  }))
  mocks.loadOpenGridSnapReference.mockImplementation(async () => ({
    delete: vi.fn(),
  }))
  mocks.loadOpenGridWallCoverReference.mockImplementation(async () => ({
    delete: vi.fn(),
  }))
  mocks.loadOpenGridSnapFixedFootprint.mockImplementation(async () => ({
    delete: vi.fn(),
  }))
  mocks.loadOpenGridSnapOpenConnectHead.mockImplementation(async () => ({
    delete: vi.fn(),
  }))
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([4, 5, 6]).buffer)
  mocks.exportThreeMfBytes.mockResolvedValue(
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
  )
  mocks.isThreeMfPackage.mockReturnValue(true)
}

describe('OpenGrid Snap Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
  })

  it('dispatches Snap independently, caches each profile/variant, and quality-gates it', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateCommand(snapParameters('Full', 0.2)))
    await runtime.handle(generateCommand(snapParameters('Full', 0), 2))
    await runtime.handle(generateCommand(snapParameters('Lite', 0), 3))
    await runtime.handle(
      generateCommand(
        snapParameters('Full', 0, 'full', {
          profile: 'Directional',
        }),
        4,
      ),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-snap',
      expect.objectContaining({ variant: 'Full', offset: 0.2 }),
      expect.objectContaining({
        getOpenGridSnapReference: expect.any(Function),
      }),
    )
    expect(mocks.loadOpenGridSnapReference).toHaveBeenCalledTimes(3)
    expect(mocks.loadOpenGridSnapReference).toHaveBeenNthCalledWith(
      1,
      'Full',
      'Standard',
    )
    expect(mocks.loadOpenGridSnapReference).toHaveBeenNthCalledWith(
      3,
      'Full',
      'Directional',
    )
    expect(
      mocks.assertOpenGridSnapOpenConnectShapeQuality,
    ).toHaveBeenCalledTimes(4)
    expect(mocks.assertOpenGridSnapShapeQuality).not.toHaveBeenCalled()
    const snapCandidates = events.filter(
      (
        event,
      ): event is { kind: 'model.candidate-ready'; partMeshes?: unknown } =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.candidate-ready',
    )
    expect(
      snapCandidates.every((event) => event.partMeshes === undefined),
    ).toBe(true)
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid-snap',
        parameters: snapParameters('Lite', 0),
      }),
    )
  })

  it('normalizes a legacy Snap text command before protocol validation', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap-legacy-text', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand(snapParameters('Lite', 0, 'full', { topText: 'SNAP' })),
    )

    expect(events).not.toContainEqual(
      expect.objectContaining({
        kind: 'operation.error',
        code: 'PROTOCOL_INVALID',
      }),
    )
    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-snap',
      expect.objectContaining({ topText: 'none' }),
      expect.anything(),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid-snap',
        parameters: expect.objectContaining({ topText: 'none' }),
      }),
    )
    const candidate = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.candidate-ready',
    ) as { partMeshes?: unknown } | undefined
    expect(candidate?.partMeshes).toBeUndefined()
  })

  it('uses fixed footprint assets for Half and Quarter previews', async () => {
    const fixedShapes = [{ delete: vi.fn() }, { delete: vi.fn() }]
    mocks.loadOpenGridSnapFixedFootprint
      .mockResolvedValueOnce(fixedShapes[0])
      .mockResolvedValueOnce(fixedShapes[1])
    mocks.buildModelBRep.mockImplementation(
      async (
        _modelId: string,
        parameters: OpenGridSnapParameters,
        context: {
          getOpenGridSnapFixedFootprint?: (
            footprint: 'half' | 'quarter',
          ) => Promise<unknown>
        },
      ) => {
        if (parameters.footprint !== 'full') {
          await context.getOpenGridSnapFixedFootprint?.(parameters.footprint)
        }
        return { delete: vi.fn() }
      },
    )

    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap-fixed-preview', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateCommand(snapParameters('Full', 0, 'half')))
    await runtime.handle(
      generateCommand(snapParameters('Lite', 0.4, 'quarter'), 2),
    )

    expect(mocks.loadOpenGridSnapFixedFootprint).toHaveBeenNthCalledWith(
      1,
      'half',
    )
    expect(mocks.loadOpenGridSnapFixedFootprint).toHaveBeenNthCalledWith(
      2,
      'quarter',
    )
    expect(mocks.loadOpenGridSnapReference).not.toHaveBeenCalled()
    expect(mocks.assertOpenGridSnapShapeQuality).not.toHaveBeenCalled()
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'model.candidate-ready' }),
      ]),
    )
  })

  it('loads and quality-gates the OpenConnect head without scaling it', async () => {
    const head = { delete: vi.fn() }
    mocks.loadOpenGridSnapOpenConnectHead.mockResolvedValue(head)
    mocks.buildModelBRep.mockImplementation(
      async (
        _modelId: string,
        parameters: OpenGridSnapParameters,
        context: {
          getOpenGridSnapOpenConnectHead?: () => Promise<unknown>
        },
      ) => {
        if (parameters.footprint === 'full') {
          await context.getOpenGridSnapOpenConnectHead?.()
        }
        return { delete: vi.fn() }
      },
    )

    const runtime = new CadWorkerRuntime(
      'epoch-snap-openconnect',
      () => undefined,
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand(
        snapParameters('Full', 0.2, 'full', {
          profile: 'Directional',
          openConnect: true,
        }),
      ),
    )

    expect(mocks.loadOpenGridSnapOpenConnectHead).toHaveBeenCalledOnce()
    expect(
      mocks.assertOpenGridSnapOpenConnectShapeQuality,
    ).toHaveBeenCalledOnce()
    expect(mocks.assertOpenGridSnapShapeQuality).not.toHaveBeenCalled()

    await runtime.handle({
      ...base,
      requestId: 'snap-openconnect-dispose-request',
      operationId: 'snap-openconnect-dispose-operation',
      kind: 'worker.dispose' as const,
    })
    expect(head.delete).toHaveBeenCalledOnce()
  })

  it('quality-gates a full Snap without OpenConnect as a plain Snap', async () => {
    const runtime = new CadWorkerRuntime(
      'epoch-snap-without-openconnect',
      () => undefined,
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand(
        snapParameters('Lite', 0, 'full', { openConnect: false }),
      ),
    )

    expect(mocks.assertOpenGridSnapShapeQuality).toHaveBeenCalledOnce()
    expect(
      mocks.assertOpenGridSnapOpenConnectShapeQuality,
    ).not.toHaveBeenCalled()
    expect(mocks.loadOpenGridSnapOpenConnectHead).not.toHaveBeenCalled()
  })

  it('removes a failed reference promise so the next generation can retry', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap-retry', (event) =>
      events.push(event),
    )
    mocks.loadOpenGridSnapReference
      .mockRejectedValueOnce(new Error('OPENGRID_SNAP_ASSET_LOAD_FAILED'))
      .mockResolvedValueOnce({ delete: vi.fn() })

    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())
    await runtime.handle(generateCommand(snapParameters('Full', 0.1), 2))

    expect(mocks.loadOpenGridSnapReference).toHaveBeenCalledTimes(2)
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid-snap',
      }),
    )
  })

  it('disposes fixed footprint assets once', async () => {
    const fixedShape = { delete: vi.fn() }
    mocks.loadOpenGridSnapFixedFootprint.mockResolvedValue(fixedShape)
    mocks.buildModelBRep.mockImplementation(
      async (
        _modelId: string,
        parameters: OpenGridSnapParameters,
        context: {
          getOpenGridSnapFixedFootprint?: (
            footprint: 'half' | 'quarter',
          ) => Promise<unknown>
        },
      ) => {
        if (parameters.footprint !== 'full') {
          await context.getOpenGridSnapFixedFootprint?.(parameters.footprint)
        }
        return { delete: vi.fn() }
      },
    )

    const runtime = new CadWorkerRuntime(
      'epoch-snap-fixed-dispose',
      () => undefined,
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateCommand(snapParameters('Full', 0, 'half')))
    await runtime.handle({
      ...base,
      requestId: 'snap-fixed-dispose-request',
      operationId: 'snap-fixed-dispose-operation',
      kind: 'worker.dispose' as const,
    })

    expect(fixedShape.delete).toHaveBeenCalledOnce()
  })

  it('discards a quality-failed Snap candidate while retaining the next valid one', async () => {
    const events: unknown[] = []
    mocks.assertOpenGridSnapOpenConnectShapeQuality.mockImplementationOnce(
      () => {
        throw new Error('OPENGRID_SNAP_QUALITY_INVALID')
      },
    )
    const runtime = new CadWorkerRuntime('epoch-snap-quality', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand(
        snapParameters('Full', 0, 'full', {
          magnetHoleShape: 'square',
          magnetHoleLength: 6,
          magnetHoleWidth: 4,
          magnetHoleThickness: 2,
        }),
        1,
      ),
    )
    await runtime.handle(generateCommand(snapParameters('Full', 0.05), 2))

    expect(
      events.filter(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          'kind' in event &&
          event.kind === 'model.candidate-ready',
      ),
    ).toHaveLength(1)
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.error',
      }),
    )
  })

  it('keeps the latest Snap generation and disposes the stale candidate', async () => {
    let releaseFirst: () => void = () => undefined
    const firstReleased = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const generatedShapes: Array<{ delete: ReturnType<typeof vi.fn> }> = []
    let builds = 0
    mocks.buildModelBRep.mockImplementation(
      async (
        _modelId: string,
        _parameters: OpenGridSnapParameters,
        context: { isGenerationCurrent?: () => boolean },
      ) => {
        builds += 1
        if (builds === 1) await firstReleased
        if (!context.isGenerationCurrent?.())
          throw new Error('STALE_GENERATION')
        const shape = { delete: vi.fn() }
        generatedShapes.push(shape)
        return shape
      },
    )

    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap-latest', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())

    const first = runtime.handle(
      generateCommand(snapParameters('Full', 0.2), 1),
    )
    await Promise.resolve()
    const second = runtime.handle(
      generateCommand(snapParameters('Full', 0.3, 'quarter'), 2),
    )
    await second
    releaseFirst()
    await first

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.superseded',
        generation: 1,
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        generation: 2,
        parameters: snapParameters('Full', 0.3, 'quarter'),
      }),
    )
    expect(generatedShapes).toHaveLength(1)
  })

  it('exports the committed Snap revision with deterministic filenames', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap-export', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand(snapParameters('Lite', 0.2, 'quarter')),
    )
    const candidate = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.candidate-ready',
    ) as { candidateId: string } | undefined
    expect(candidate).toBeDefined()
    await runtime.handle({
      ...base,
      requestId: 'snap-commit-request',
      operationId: 'snap-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-snap-export',
    })
    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as
      { modelRevision: string; parameters: OpenGridSnapParameters } | undefined
    expect(ready).toBeDefined()

    await runtime.handle({
      ...base,
      requestId: 'snap-export-step-request',
      operationId: 'snap-export-step-operation',
      kind: 'export.step' as const,
      modelRevision: ready!.modelRevision,
      workerEpoch: 'epoch-snap-export',
      file: {
        name: openGridSnapFileName(ready!.parameters),
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      requestId: 'snap-export-stl-request',
      operationId: 'snap-export-stl-operation',
      kind: 'export.stl' as const,
      modelRevision: ready!.modelRevision,
      workerEpoch: 'epoch-snap-export',
      file: {
        name: openGridSnapStlFileName(ready!.parameters),
        mime: 'model/stl' as const,
      },
    })

    expect(mocks.exportStepBytes).toHaveBeenCalledOnce()
    expect(mocks.exportStlBytes).toHaveBeenCalledOnce()
    expect(
      events.filter(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          'kind' in event &&
          event.kind === 'export.ready',
      ),
    ).toHaveLength(2)
  })

  it('exports the committed Wall Cover revision as multipart 3MF', async () => {
    const events: unknown[] = []
    const wallCoverReference = { delete: vi.fn() }
    mocks.loadOpenGridWallCoverReference.mockResolvedValue(wallCoverReference)
    mocks.buildModelBRepWithParts.mockImplementationOnce(
      async (
        _modelId: string,
        _parameters: unknown,
        context: {
          getOpenGridWallCoverReference?: () => Promise<unknown>
        },
      ) => {
        await context.getOpenGridWallCoverReference?.()
        return {
          shape: { delete: vi.fn() },
          qualityShape: { delete: vi.fn() },
          parts: [
            { name: 'body', shape: { delete: vi.fn() } },
            { name: 'text', shape: { delete: vi.fn() } },
          ],
        }
      },
    )
    const runtime = new CadWorkerRuntime('epoch-wall-cover-3mf', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateWallCoverCommand())

    const candidate = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.candidate-ready',
    ) as
      | {
          candidateId: string
          partMeshes?: Array<{ name: string }>
        }
      | undefined
    expect(candidate).toBeDefined()
    expect(candidate?.partMeshes?.map((part) => part.name)).toEqual([
      'body',
      'text',
    ])
    await runtime.handle({
      ...base,
      requestId: 'wall-cover-3mf-commit-request',
      operationId: 'wall-cover-3mf-commit-operation',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-wall-cover-3mf',
    })

    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as
      | {
          modelRevision: string
          mesh?: unknown
          partMeshes?: Array<{ name: string }>
        }
      | undefined
    expect(ready).toBeDefined()
    expect(ready?.mesh).toBeDefined()
    expect(ready?.partMeshes?.map((part) => part.name)).toEqual([
      'body',
      'text',
    ])

    await runtime.handle({
      ...base,
      requestId: 'wall-cover-3mf-export-request',
      colors: { primary: '#123456', secondary: '#abcdef' },
      operationId: 'wall-cover-3mf-export-operation',
      kind: 'export.3mf' as const,
      modelRevision: ready!.modelRevision,
      workerEpoch: 'epoch-wall-cover-3mf',
      file: {
        name: openGridWallCoverThreeMfFileName({ text: 'A' }),
        mime: 'model/3mf' as const,
      },
    })

    expect(mocks.buildModelBRepWithParts).toHaveBeenCalledOnce()
    expect(mocks.loadOpenGridWallCoverReference).toHaveBeenCalledOnce()
    expect(mocks.exportThreeMfBytes).toHaveBeenCalledOnce()
    expect(mocks.exportThreeMfBytes).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ baseColor: '#123456', accentColor: '#abcdef' }),
    )
    expect(
      events.filter(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          'kind' in event &&
          event.kind === 'export.ready',
      ),
    ).toHaveLength(1)
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: '3mf',
        mime: 'model/3mf',
        fileName: 'opengrid-wall-cover.3mf',
      }),
    )

    await runtime.handle({
      ...base,
      requestId: 'wall-cover-3mf-dispose-request',
      operationId: 'wall-cover-3mf-dispose-operation',
      kind: 'worker.dispose' as const,
    })
    expect(wallCoverReference.delete).toHaveBeenCalledOnce()
  })

  it.each([
    [
      'OPENGRID_WALL_COVER_TEXT_GLYPH_UNSUPPORTED',
      'diagnostic.wallCoverGlyphUnsupported',
    ],
    [
      'OPENGRID_WALL_COVER_FONT_LOAD_FAILED',
      'diagnostic.wallCoverFontLoadFailed',
    ],
  ] as const)(
    'maps %s to a localized recoverable diagnostic',
    async (message, messageId) => {
      const events: unknown[] = []
      mocks.buildModelBRepWithParts.mockRejectedValueOnce(new Error(message))
      const runtime = new CadWorkerRuntime(
        `epoch-wall-cover-${message}`,
        (event) => events.push(event),
      )

      await runtime.handle(initCommand())
      await runtime.handle(generateWallCoverCommand())

      expect(events).toContainEqual(
        expect.objectContaining({
          kind: 'operation.error',
          stage: 'building',
          code: 'MODEL_BUILD_FAILED',
          messageId,
          recoverable: true,
        }),
      )
    },
  )

  it('disposes loaded variant references once', async () => {
    const events: unknown[] = []
    const references = [
      { delete: vi.fn() },
      { delete: vi.fn() },
      { delete: vi.fn() },
    ]
    mocks.loadOpenGridSnapReference
      .mockResolvedValueOnce(references[0])
      .mockResolvedValueOnce(references[1])
      .mockResolvedValueOnce(references[2])
    const runtime = new CadWorkerRuntime('epoch-snap-dispose', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateCommand(snapParameters('Full', 0)))
    await runtime.handle(generateCommand(snapParameters('Lite', 0), 2))
    await runtime.handle(
      generateCommand(
        snapParameters('Full', 0, 'full', {
          profile: 'Directional',
        }),
        3,
      ),
    )
    await runtime.handle({
      ...base,
      requestId: 'snap-dispose-request',
      operationId: 'snap-dispose-operation',
      kind: 'worker.dispose' as const,
    })

    expect(references[0].delete).toHaveBeenCalledOnce()
    expect(references[1].delete).toHaveBeenCalledOnce()
    expect(references[2].delete).toHaveBeenCalledOnce()
  })
})
