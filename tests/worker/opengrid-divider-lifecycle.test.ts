import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
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

import {
  OPENGRID_DIVIDER_CONFIGURATION,
  openGridDividerFileName,
} from '../../src/cad-contract/units'
import { CadWorkerRuntime } from '../../src/workers/cad.worker'

const base = {
  version: 2 as const,
  requestId: 'divider-lifecycle-base-request',
  operationId: 'divider-lifecycle-base-operation',
}

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function dividerGenerateCommand(generation = 1) {
  return {
    ...base,
    requestId: `divider-lifecycle-request-${generation}`,
    operationId: `divider-lifecycle-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-divider' as const,
    parameters: {
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function configureMocks(): void {
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

describe('OpenGrid divider Worker lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
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
      operationId: 'divider-lifecycle-operation-1',
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
        operationId: 'divider-lifecycle-operation-1',
        terminalForRequestId: 'divider-lifecycle-request-1',
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
  })

  it('keeps a committed divider revision pinned while a newer generation starts', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-divider-revision', (event) =>
      events.push(event),
    )
    const firstShape = { delete: vi.fn() }
    const secondShape = { delete: vi.fn() }
    mocks.buildModelBRep
      .mockResolvedValueOnce(firstShape)
      .mockResolvedValueOnce(secondShape)

    await runtime.handle(initCommand())
    await runtime.handle(dividerGenerateCommand(1))
    const firstCandidate = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.candidate-ready',
    ) as { candidateId: string } | undefined
    expect(firstCandidate).toBeDefined()
    await runtime.handle({
      ...base,
      requestId: 'divider-revision-commit-1',
      operationId: 'divider-lifecycle-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: firstCandidate!.candidateId,
      workerEpoch: 'epoch-divider-revision',
    })
    const firstReady = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as { modelRevision: string }

    let finishExport: ((bytes: ArrayBuffer) => void) | null = null
    mocks.exportStepBytes.mockImplementationOnce(
      () =>
        new Promise<ArrayBuffer>((resolve) => {
          finishExport = resolve
        }),
    )
    const exportPromise = runtime.handle({
      ...base,
      requestId: 'divider-revision-export',
      operationId: 'divider-revision-export-operation',
      kind: 'export.step' as const,
      modelRevision: firstReady.modelRevision,
      workerEpoch: 'epoch-divider-revision',
      file: {
        name: openGridDividerFileName({
          ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
          left: 1,
          right: 1,
          up: 0,
          down: 0,
          height: 20,
          wallThickness: 2,
        }),
        mime: 'model/step' as const,
      },
    })
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.accepted',
        modelRevision: firstReady.modelRevision,
      }),
    )

    await runtime.handle(dividerGenerateCommand(2))
    expect(firstShape.delete).not.toHaveBeenCalled()
    const releaseExport = finishExport as ((bytes: ArrayBuffer) => void) | null
    expect(releaseExport).not.toBeNull()
    if (!releaseExport) throw new Error('export promise was not captured')
    releaseExport(new Uint8Array([7]).buffer)
    await exportPromise
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        modelRevision: firstReady.modelRevision,
      }),
    )

    const secondCandidate = events
      .filter(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          'kind' in event &&
          event.kind === 'model.candidate-ready',
      )
      .at(-1) as { candidateId: string } | undefined
    expect(secondCandidate).toBeDefined()
    await runtime.handle({
      ...base,
      requestId: 'divider-revision-commit-2',
      operationId: 'divider-lifecycle-operation-2',
      kind: 'model.commit' as const,
      generation: 2,
      candidateId: secondCandidate!.candidateId,
      workerEpoch: 'epoch-divider-revision',
    })
    expect(firstShape.delete).toHaveBeenCalledOnce()
  })
})
