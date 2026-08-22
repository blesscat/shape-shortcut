import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  buildOpenGridCanonicalTile: vi.fn(),
  initialiseCadKernel: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  assertOpenGridShapeQuality: vi.fn(),
  assertOpenGridDividerShapeQuality: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))
vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
}))
vi.mock('../../src/cad-kernel/components/opengrid/builder', () => ({
  buildOpenGridCanonicalTile: mocks.buildOpenGridCanonicalTile,
  loadOpenGridPrototypeTemplate: vi.fn(),
}))
vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))
vi.mock('../../src/cad-kernel/components/opengrid/quality', () => ({
  assertOpenGridShapeQuality: mocks.assertOpenGridShapeQuality,
}))
vi.mock('../../src/cad-kernel/components/opengrid-divider/quality', () => ({
  assertOpenGridDividerShapeQuality: mocks.assertOpenGridDividerShapeQuality,
}))
vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'
import {
  OPENGRID_CONFIGURATION,
  openGridStackableBoxFileName,
  openGridStackableBoxStlFileName,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  openGridFileName,
  openGridStlFileName,
  openGridDividerFileName,
  openGridDividerStlFileName,
  openGridStackableCylinderFileName,
  openGridStackableCylinderStlFileName,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  type OpenGridParameters,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'

const base = {
  version: 2 as const,
  requestId: 'request-base',
  operationId: 'operation-base',
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
    customScrewPositions: [],
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

function generateCommand(overrides: Record<string, unknown> = {}) {
  return {
    ...base,
    requestId: 'opengrid-request-1',
    operationId: 'opengrid-operation-1',
    kind: 'model.generate' as const,
    generation: 1,
    modelId: 'opengrid' as const,
    parameters: opengridParameters(),
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    ...overrides,
  }
}

function stackableBoxGenerateCommand(
  generation = 1,
  overrides: Record<string, unknown> = {},
) {
  return {
    ...base,
    requestId: `stackable-request-${generation}`,
    operationId: `stackable-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-stackable-box' as const,
    parameters: {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 0.5,
      y: 1.5,
      height: 20,
      cornerSeatMode: 'hole',
      fullBottomHoleGrid: false,
      basePlateMode: false,
    },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    ...overrides,
  }
}

function dividerGenerateCommand(generation = 1) {
  return {
    ...base,
    requestId: `divider-request-${generation}`,
    operationId: `divider-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-divider' as const,
    parameters: {
      left: 1,
      right: 1,
      up: 2,
      down: 0,
      height: 20,
      wallThickness: 2,
    },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function stackableCylinderGenerateCommand(
  generation = 1,
  overrides: Record<string, unknown> = {},
) {
  return {
    ...base,
    requestId: `stackable-cylinder-request-${generation}`,
    operationId: `stackable-cylinder-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-stackable-cylinder' as const,
    parameters: {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    ...overrides,
  }
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.meshBRep.mockReturnValue({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    triangleCount: 1,
  })
  mocks.serializeMesh.mockImplementation((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  }))
  mocks.buildModelBRep.mockResolvedValue({ delete: vi.fn() })
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([4, 5, 6]).buffer)
}

describe('OpenGrid Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
  })

  it('accepts the former blocked-size tuple when it uses official parameters', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-opengrid', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand({
        parameters: {
          variant: 'Lite',
          rows: 10,
          columns: 10,
          halfCellX: 'none',
          halfCellY: 'none',
          screwKind: 'custom',
          screwMode: 'everywhere',
          screwCenter: false,
          screwEvery: 0,
          customScrewPositions: [],
          connectorHoles: 'enabled',
          chamfers: 'none',
          chamferCorners: {
            topLeft: true,
            topRight: true,
            bottomLeft: true,
            bottomRight: true,
          },
          connectorSides: {
            top: true,
            right: true,
            bottom: true,
            left: true,
          },
          screwEveryRows: 1,
          screwEveryColumns: 2,
          screwDiameter: 4.1,
          screwHeadDiameter: 7.2,
          screwHeadInset: 1,
          screwHeadIsCountersunk: true,
          screwHeadCountersunkDegree: 90,
        },
      }),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid',
      }),
    )
  })

  it('routes a valid typed command through the product builder and quality gate', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-opengrid', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand({
        parameters: {
          variant: 'Heavy',
          rows: 2,
          columns: 2,
          halfCellX: 'right',
          halfCellY: 'top',
          screwKind: 'custom',
          screwMode: 'custom',
          screwCenter: false,
          screwEvery: 0,
          customScrewPositions: [{ row: 0, column: 0 }],
          connectorHoles: 'enabled',
          chamfers: 'corners',
          chamferCorners: {
            topLeft: true,
            topRight: true,
            bottomLeft: true,
            bottomRight: true,
          },
          connectorSides: {
            top: true,
            right: true,
            bottom: true,
            left: true,
          },
          screwEveryRows: 1,
          screwEveryColumns: 2,
          screwDiameter: 5,
          screwHeadDiameter: 8,
          screwHeadInset: 1,
          screwHeadIsCountersunk: true,
          screwHeadCountersunkDegree: 90,
        },
      }),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid',
      expect.objectContaining({
        variant: 'Heavy',
        customScrewPositions: [{ row: 0, column: 0 }],
      }),
      expect.any(Object),
    )
    expect(mocks.assertOpenGridShapeQuality).toHaveBeenCalledOnce()
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
      requestId: 'opengrid-commit-request',
      operationId: 'opengrid-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-opengrid',
    })

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid',
        parameters: expect.objectContaining({ variant: 'Heavy' }),
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.ready',
        modelId: 'opengrid',
        parameters: expect.objectContaining({ variant: 'Heavy' }),
        bounds: expect.any(Object),
      }),
    )
    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as {
      modelRevision: string
      parameters: Parameters<typeof openGridFileName>[0]
      workerEpoch: string
    }
    await runtime.handle({
      ...base,
      requestId: 'opengrid-export-step-request',
      operationId: 'opengrid-export-step-operation',
      kind: 'export.step' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridFileName(ready.parameters),
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      requestId: 'opengrid-export-stl-request',
      operationId: 'opengrid-export-stl-operation',
      kind: 'export.stl' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridStlFileName(ready.parameters),
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

  it('publishes all boolean operation boundaries from the shared build context', async () => {
    mocks.buildModelBRep.mockImplementation(
      async (_modelId, _parameters, context) => {
        const scope = context.booleanOperations.createScope(3)
        scope.measure('fuse', () => undefined)
        scope.measure('cut', () => undefined)
        scope.measure('intersect', () => undefined)
        return { delete: vi.fn() }
      },
    )
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-opengrid-boolean', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())

    const progressEvents = events.filter(
      (event) =>
        event.kind === 'operation.progress' &&
        event.operationId === 'opengrid-operation-1' &&
        event.booleanOperation,
    )
    expect(progressEvents).toHaveLength(6)
    expect(
      progressEvents
        .filter((event) => event.booleanOperation.state === 'running')
        .map((event) => event.booleanOperation.kind),
    ).toEqual(['fuse', 'cut', 'intersect'])
    expect(
      progressEvents
        .filter((event) => event.booleanOperation.state === 'completed')
        .map((event) => event.booleanOperation.kind),
    ).toEqual(['fuse', 'cut', 'intersect'])
    expect(
      progressEvents
        .filter((event) => event.booleanOperation.state === 'completed')
        .map((event) => event.booleanOperation.completed),
    ).toEqual([1, 2, 3])
  })

  it('reports boolean work performed while populating the canonical tile cache', async () => {
    mocks.buildOpenGridCanonicalTile.mockImplementation(
      async (_variant, context) => {
        const scope = context.booleanOperations?.createScope(1)
        scope?.measure('intersect', () => undefined)
        return { delete: vi.fn() }
      },
    )
    mocks.buildModelBRep.mockImplementation(
      async (_modelId, _parameters, context) => {
        const canonical = await context.getOpenGridCanonicalTile?.(
          'Full',
          3,
          context.booleanOperations,
        )
        canonical?.delete()
        return { delete: vi.fn() }
      },
    )
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-opengrid-canonical', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.progress',
        operationId: 'opengrid-operation-1',
        booleanOperation: expect.objectContaining({
          kind: 'intersect',
          state: 'completed',
          completed: 1,
          total: 1,
        }),
      }),
    )
  })

  it('routes Hybrid parameters through the worker quality gate', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-opengrid-hybrid', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand({
        parameters: opengridParameters({
          variant: 'Hybrid',
          rows: 3,
          columns: 3,
          chamfers: 'none',
          connectorHoles: 'none',
          screwMode: 'none',
        }),
      }),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid',
      expect.objectContaining({ variant: 'Hybrid', rows: 3, columns: 3 }),
      expect.any(Object),
    )
    expect(mocks.assertOpenGridShapeQuality).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid',
        parameters: expect.objectContaining({ variant: 'Hybrid' }),
      }),
    )
  })

  it('routes stackable-box commands independently and keeps export names typed', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-stackable', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      stackableBoxGenerateCommand(1, {
        parameters: {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          x: 0.5,
          y: 1.5,
          height: 20,
          cornerSeatMode: 'hole',
          fullBottomHoleGrid: true,
          basePlateMode: false,
        },
      }),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-stackable-box',
      {
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: 0.5,
        y: 1.5,
        height: 20,
        cornerSeatMode: 'hole',
        fullBottomHoleGrid: true,
        basePlateMode: false,
      },
      expect.any(Object),
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
      requestId: 'stackable-commit-request',
      operationId: 'stackable-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-stackable',
    })
    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as {
      modelRevision: string
      parameters: OpenGridStackableBoxParameters
      workerEpoch: string
    }
    expect(ready.parameters).toEqual({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 0.5,
      y: 1.5,
      height: 20,
      cornerSeatMode: 'hole',
      fullBottomHoleGrid: true,
      basePlateMode: false,
    })

    await runtime.handle({
      ...base,
      requestId: 'stackable-export-step-request',
      operationId: 'stackable-export-step-operation',
      kind: 'export.step' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridStackableBoxFileName(ready.parameters),
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      requestId: 'stackable-export-stl-request',
      operationId: 'stackable-export-stl-operation',
      kind: 'export.stl' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridStackableBoxStlFileName(ready.parameters),
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

  it('routes honeycomb snapshots through Worker commit and export identity', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-stackable-honeycomb', (event) =>
      events.push(event),
    )
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      honeycombMode: true,
    }

    await runtime.handle(initCommand())
    await runtime.handle(
      stackableBoxGenerateCommand(1, {
        parameters,
      }),
    )
    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-stackable-box',
      parameters,
      expect.any(Object),
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
      requestId: 'stackable-honeycomb-commit-request',
      operationId: 'stackable-honeycomb-commit-operation',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-stackable-honeycomb',
    })
    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as {
      modelRevision: string
      parameters: typeof parameters
      workerEpoch: string
    }
    expect(ready.parameters.honeycombMode).toBe(true)

    await runtime.handle({
      ...base,
      requestId: 'stackable-honeycomb-export-step-request',
      operationId: 'stackable-honeycomb-export-step-operation',
      kind: 'export.step' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridStackableBoxFileName(ready.parameters),
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      requestId: 'stackable-honeycomb-export-stl-request',
      operationId: 'stackable-honeycomb-export-stl-operation',
      kind: 'export.stl' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridStackableBoxStlFileName(ready.parameters),
        mime: 'model/stl' as const,
      },
    })
    expect(mocks.exportStepBytes).toHaveBeenCalledOnce()
    expect(mocks.exportStlBytes).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        fileName: 'opengrid-stackable-box-3x3-h60-seats-hole-honeycomb.step',
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        fileName: 'opengrid-stackable-box-3x3-h60-seats-hole-honeycomb.stl',
      }),
    )
  })

  it('routes divider commands through its own quality gate and exports', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-divider', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(dividerGenerateCommand())

    const parameters = {
      left: 1,
      right: 1,
      up: 2,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-divider',
      parameters,
      expect.any(Object),
    )
    expect(mocks.assertOpenGridDividerShapeQuality).toHaveBeenCalledOnce()
    expect(mocks.assertOpenGridShapeQuality).not.toHaveBeenCalled()

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
      requestId: 'divider-commit-request',
      operationId: 'divider-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-divider',
    })
    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as { modelRevision: string; workerEpoch: string }

    await runtime.handle({
      ...base,
      requestId: 'divider-export-step-request',
      operationId: 'divider-export-step-operation',
      kind: 'export.step' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridDividerFileName(parameters),
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      requestId: 'divider-export-stl-request',
      operationId: 'divider-export-stl-operation',
      kind: 'export.stl' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridDividerStlFileName(parameters),
        mime: 'model/stl' as const,
      },
    })
    expect(mocks.exportStepBytes).toHaveBeenCalledOnce()
    expect(mocks.exportStlBytes).toHaveBeenCalledOnce()
  })

  it('routes stackable-cylinder commands and keeps its export names typed', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-stackable-cylinder', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(stackableCylinderGenerateCommand())

    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    }
    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-stackable-cylinder',
      parameters,
      expect.any(Object),
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
      requestId: 'stackable-cylinder-commit-request',
      operationId: 'stackable-cylinder-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-stackable-cylinder',
    })
    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as { modelRevision: string; workerEpoch: string }

    await runtime.handle({
      ...base,
      requestId: 'stackable-cylinder-export-step-request',
      operationId: 'stackable-cylinder-export-step-operation',
      kind: 'export.step' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridStackableCylinderFileName(parameters),
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      requestId: 'stackable-cylinder-export-stl-request',
      operationId: 'stackable-cylinder-export-stl-operation',
      kind: 'export.stl' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridStackableCylinderStlFileName(parameters),
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

  it('routes bottom-plate cylinder mode through the typed Worker snapshot', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime(
      'epoch-bottom-plate-cylinder',
      (event) => events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      stackableCylinderGenerateCommand(1, {
        parameters: {
          diameter: 56,
          height: 30,
          thinBottomMode: false,
          bottomPlateMode: true,
          bottomSeatMode: 'none',
        },
      }),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-stackable-cylinder',
      {
        diameter: 56,
        height: 30,
        thinBottomMode: false,
        bottomPlateMode: true,
        bottomSeatMode: 'none',
      },
      expect.any(Object),
    )
    expect(
      events.some(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          'kind' in event &&
          event.kind === 'model.candidate-ready',
      ),
    ).toBe(true)
  })

  it('routes the cylinder center-hook mode through the typed Worker snapshot', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime(
      'epoch-center-hook-cylinder',
      (event) => events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      stackableCylinderGenerateCommand(1, {
        parameters: {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          bottomSeatMode: 'center-hook',
        },
      }),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-stackable-cylinder',
      {
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        bottomSeatMode: 'center-hook',
      },
      expect.any(Object),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid-stackable-cylinder',
      }),
    )
  })

  it('keeps latest-wins invalidation for divider generations', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-divider-latest', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(dividerGenerateCommand(1))
    await runtime.handle(dividerGenerateCommand(2))

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.superseded',
        operationId: 'divider-operation-1',
        reason: 'STALE_GENERATION',
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        operationId: 'divider-operation-2',
        modelId: 'opengrid-divider',
      }),
    )
  })

  it('rejects malformed stackable-box parameters at the Worker protocol boundary', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-stackable-invalid', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      stackableBoxGenerateCommand(1, {
        parameters: {
          x: 0.25,
          y: 1.5,
          height: 20,
          cornerSeatMode: 'hole',
          fullBottomHoleGrid: false,
          basePlateMode: false,
        },
      }),
    )

    expect(mocks.buildModelBRep).not.toHaveBeenCalled()
    expect(events.at(-1)).toMatchObject({
      kind: 'operation.error',
      code: 'PROTOCOL_INVALID',
    })
  })

  it('rejects dispatch for the removed box-normal model', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-box-normal-removed', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle({
      ...stackableBoxGenerateCommand(1),
      modelId: 'box-normal',
      parameters: {
        x: 2,
        y: 2,
        height: 10,
        cornerPosts: true,
      },
    } as never)

    expect(mocks.buildModelBRep).not.toHaveBeenCalled()
    expect(events.at(-1)).toMatchObject({
      kind: 'operation.error',
      code: 'PROTOCOL_INVALID',
    })
  })

  it('keeps latest-wins candidate invalidation for stackable-box generations', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-stackable-latest', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(stackableBoxGenerateCommand(1))
    await runtime.handle(
      stackableBoxGenerateCommand(2, {
        requestId: 'stackable-request-2',
        operationId: 'stackable-operation-2',
        parameters: {
          x: 1,
          y: 1,
          height: 20,
          cornerSeatMode: 'hole',
          fullBottomHoleGrid: false,
          basePlateMode: false,
        },
      }),
    )

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.superseded',
        operationId: 'stackable-operation-1',
        reason: 'STALE_GENERATION',
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        operationId: 'stackable-operation-2',
        modelId: 'opengrid-stackable-box',
      }),
    )
  })

  it('discards a divider candidate exactly once', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-divider-discard', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(dividerGenerateCommand())

    const candidate = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.candidate-ready',
    ) as { candidateId: string } | undefined
    expect(candidate).toBeDefined()

    const discard = {
      ...base,
      requestId: 'divider-discard-request-1',
      operationId: 'divider-operation-1',
      kind: 'model.discard' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-divider-discard',
    }
    await runtime.handle(discard)
    await runtime.handle({ ...discard, requestId: 'divider-discard-request-2' })

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.superseded',
        operationId: 'divider-operation-1',
        terminalForRequestId: 'divider-request-1',
        reason: 'CANDIDATE_ORPHANED',
      }),
    )
    expect(
      events.filter(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          'kind' in event &&
          event.kind === 'operation.superseded',
      ),
    ).toHaveLength(1)
    expect(
      events.some(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          'kind' in event &&
          event.kind === 'model.ready',
      ),
    ).toBe(false)
  })
  // Divider candidate terminal coverage is also exercised in lifecycle suite.
})
