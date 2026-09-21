import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  WorkerCommand,
  WorkerEvent,
} from '../../src/cad-contract/messages'
import type { ModelId } from '../../src/cad-contract/units'
import type { CandidateRecord } from '../../src/cad-kernel/lifetime'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'

const RIM_ENABLED_CONTAINER_PARAMETERS = {
  stackableBox: {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    topRimEnabled: true,
    topRimHeight: 3,
  },
  organizerBox: {
    ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    topRimEnabled: true,
    topRimHeight: 3,
  },
  divider: {
    ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
    topRimEnabled: true,
    topRimHeight: 3,
  },
  openConnectOrganizer: {
    ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    topRimEnabled: true,
    topRimHeight: 3,
  },
}
import { generateCadCandidate } from '../../src/workers/cad-worker-generation'
import type { CadWorkerGenerationContext } from '../../src/workers/cad-worker-generation'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  buildModelBRepWithParts: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  assertOpenGridDividerShapeQuality: vi.fn(),
  assertOpenGridOpenConnectOrganizerShapeQuality: vi.fn(),
  assertOpenGridOrganizerBoxGeometry: vi.fn(),
  assertOpenGridStackableBoxGeometry: vi.fn(),
}))

vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
  buildModelBRepWithParts: mocks.buildModelBRepWithParts,
}))
vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))
vi.mock('../../src/cad-kernel/components/opengrid-divider/quality', () => ({
  assertOpenGridDividerShapeQuality: mocks.assertOpenGridDividerShapeQuality,
}))
vi.mock(
  '../../src/cad-kernel/components/opengrid-organizer-box/quality',
  () => ({
    assertOpenGridOrganizerBoxGeometry:
      mocks.assertOpenGridOrganizerBoxGeometry,
  }),
)
vi.mock(
  '../../src/cad-kernel/components/opengrid-stackable-box/quality',
  () => ({
    assertOpenGridStackableBoxGeometry:
      mocks.assertOpenGridStackableBoxGeometry,
  }),
)
vi.mock(
  '../../src/cad-kernel/components/opengrid-openconnect-organizer/quality',
  () => ({
    assertOpenGridOpenConnectOrganizerShapeQuality:
      mocks.assertOpenGridOpenConnectOrganizerShapeQuality,
  }),
)

const command: Extract<WorkerCommand, { kind: 'model.generate' }> = {
  version: 2,
  kind: 'model.generate',
  requestId: 'generate-request',
  operationId: 'generate-operation',
  generation: 1,
  modelId: 'box',
  parameters: { width: 20, depth: 30, height: 40 },
  previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
}

describe('CAD Worker generation seam', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.assertOpenGridOpenConnectOrganizerShapeQuality.mockResolvedValue(
      undefined,
    )
    mocks.assertOpenGridDividerShapeQuality.mockReturnValue(undefined)
    mocks.assertOpenGridOrganizerBoxGeometry.mockReturnValue(undefined)
    mocks.assertOpenGridStackableBoxGeometry.mockReturnValue(undefined)
  })

  it('builds, meshes, serializes, and registers a candidate', async () => {
    const shape = { delete: vi.fn() }
    const mesh = {
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      triangleCount: 1,
    }
    const meshSnapshot = {
      positions: new ArrayBuffer(4),
      normals: new ArrayBuffer(4),
      indices: new ArrayBuffer(4),
      bounds: mesh.bounds,
      triangleCount: mesh.triangleCount,
    }
    mocks.buildModelBRep.mockResolvedValue(shape)
    mocks.meshBRep.mockReturnValue(mesh)
    mocks.serializeMesh.mockReturnValue(meshSnapshot)

    const events: WorkerEvent[] = []
    const unregister = vi.fn()
    const registerCandidate = vi.fn((_candidate: CandidateRecord) => unregister)
    const context = {
      epoch: 'epoch-1',
      assets: {},
      buildOptions: {},
      emit: (event: WorkerEvent) => events.push(event),
      emitProgress: vi.fn(),
      isGenerationCurrent: vi.fn(() => true),
      registerCandidate,
      supersede: vi.fn(),
    } as unknown as CadWorkerGenerationContext

    await generateCadCandidate(command, context)

    expect(registerCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: command.operationId,
        generation: command.generation,
        modelId: command.modelId,
        shape,
        mesh,
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        operationId: command.operationId,
        generation: command.generation,
        modelId: 'box',
        mesh: meshSnapshot,
      }),
    )
    expect(unregister).not.toHaveBeenCalled()
    expect(mocks.serializeMesh).toHaveBeenCalledWith(mesh)
  })

  it('runs the OpenConnect organizer through shared-asset quality before registration', async () => {
    const parameters = {
      ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    }
    const organizerCommand = {
      ...command,
      modelId: 'opengrid-openconnect-organizer' as const,
      parameters,
    }
    const shape = { delete: vi.fn() }
    const lockedSlot = { delete: vi.fn() }
    const mesh = {
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      triangleCount: 1,
    }
    const meshSnapshot = {
      positions: new ArrayBuffer(4),
      normals: new ArrayBuffer(4),
      indices: new ArrayBuffer(4),
      bounds: mesh.bounds,
      triangleCount: mesh.triangleCount,
    }
    mocks.buildModelBRep.mockResolvedValue(shape)
    mocks.meshBRep.mockReturnValue(mesh)
    mocks.serializeMesh.mockReturnValue(meshSnapshot)

    const registerCandidate = vi.fn(() => vi.fn())
    const getLockedSlot = vi.fn(async () => lockedSlot)
    const context = {
      epoch: 'epoch-organizer',
      assets: {
        getOpenGridOpenConnectShelfLockedSlot: getLockedSlot,
      },
      buildOptions: {},
      emit: vi.fn(),
      emitProgress: vi.fn(),
      isGenerationCurrent: vi.fn(() => true),
      registerCandidate,
      supersede: vi.fn(),
    } as unknown as CadWorkerGenerationContext

    await generateCadCandidate(organizerCommand, context)

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-openconnect-organizer',
      parameters,
      expect.objectContaining({
        getOpenGridOpenConnectShelfLockedSlot: expect.any(Function),
      }),
    )
    expect(getLockedSlot).toHaveBeenCalledOnce()
    expect(
      mocks.assertOpenGridOpenConnectOrganizerShapeQuality,
    ).toHaveBeenCalledWith(
      shape,
      parameters,
      mesh,
      lockedSlot,
      expect.objectContaining({
        isGenerationCurrent: expect.any(Function),
        yieldToEventLoop: expect.any(Function),
      }),
    )
    expect(registerCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'opengrid-openconnect-organizer',
        parameters,
        shape,
      }),
    )
  })

  it('cleans up and supersedes a generation cancelled during organizer quality checks', async () => {
    const organizerCommand = {
      ...command,
      modelId: 'opengrid-openconnect-organizer' as const,
      parameters: { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
    }
    const shape = { delete: vi.fn() }
    const lockedSlot = { delete: vi.fn() }
    const mesh = {
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      triangleCount: 1,
    }
    mocks.buildModelBRep.mockResolvedValue(shape)
    mocks.meshBRep.mockReturnValue(mesh)
    mocks.assertOpenGridOpenConnectOrganizerShapeQuality.mockRejectedValue(
      new Error('STALE_GENERATION'),
    )
    const context = {
      epoch: 'epoch-cancelled-quality',
      assets: {
        getOpenGridOpenConnectShelfLockedSlot: vi.fn(async () => lockedSlot),
      },
      buildOptions: {},
      emit: vi.fn(),
      emitProgress: vi.fn(),
      isGenerationCurrent: vi.fn(() => true),
      registerCandidate: vi.fn(),
      supersede: vi.fn(),
    } as unknown as CadWorkerGenerationContext

    await generateCadCandidate(organizerCommand, context)

    expect(shape.delete).toHaveBeenCalledOnce()
    expect(context.supersede).toHaveBeenCalledWith(
      organizerCommand,
      'STALE_GENERATION',
    )
    expect(context.registerCandidate).not.toHaveBeenCalled()
  })

  it.each([
    ['opengrid-stackable-box', RIM_ENABLED_CONTAINER_PARAMETERS.stackableBox],
    ['opengrid-organizer-box', RIM_ENABLED_CONTAINER_PARAMETERS.organizerBox],
    ['opengrid-divider', RIM_ENABLED_CONTAINER_PARAMETERS.divider],
    [
      'opengrid-openconnect-organizer',
      RIM_ENABLED_CONTAINER_PARAMETERS.openConnectOrganizer,
    ],
  ] as const)(
    'routes rim-enabled %s generations through the multipart build',
    async (modelId, parameters) => {
      const dividerCommand = {
        ...command,
        modelId,
        parameters,
      } as unknown as typeof command
      const shape = { delete: vi.fn() }
      const bodyShape = { delete: vi.fn() }
      const rimShape = { delete: vi.fn() }
      const mesh = {
        positions: new Float32Array([0, 0, 0]),
        normals: new Float32Array([0, 0, 1]),
        indices: new Uint32Array([0, 0, 0]),
        bounds: { min: [0, 0, 0], max: [1, 1, 1] },
        triangleCount: 1,
      }
      const meshSnapshot = {
        positions: new ArrayBuffer(4),
        normals: new ArrayBuffer(4),
        indices: new ArrayBuffer(4),
        bounds: mesh.bounds,
        triangleCount: mesh.triangleCount,
      }
      mocks.buildModelBRepWithParts.mockResolvedValue({
        shape,
        parts: [
          { name: 'body', shape: bodyShape },
          { name: 'rim', shape: rimShape },
        ],
      })
      mocks.meshBRep.mockReturnValue(mesh)
      mocks.serializeMesh.mockReturnValue(meshSnapshot)

      const events: WorkerEvent[] = []
      const registerCandidate = vi.fn(() => vi.fn())
      const context = {
        epoch: 'epoch-divider',
        assets: {
          getOpenGridDetachableCornerSeatReference: vi.fn(async () => ({
            delete: vi.fn(),
          })),
          getOpenGridDetachableCornerSeatHolderReference: vi.fn(async () => ({
            delete: vi.fn(),
          })),
          getOpenGridOpenConnectShelfLockedSlot: vi.fn(async () => ({
            delete: vi.fn(),
          })),
        },
        buildOptions: {},
        emit: (event: WorkerEvent) => events.push(event),
        emitProgress: vi.fn(),
        isGenerationCurrent: vi.fn(() => true),
        registerCandidate,
        supersede: vi.fn(),
      } as unknown as CadWorkerGenerationContext

      await generateCadCandidate(dividerCommand, context)

      expect(mocks.buildModelBRepWithParts).toHaveBeenCalledWith(
        modelId,
        parameters,
        expect.anything(),
      )
      expect(mocks.buildModelBRep).not.toHaveBeenCalled()
      expect(registerCandidate).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId,
          shape,
          partMeshes: [
            { name: 'body', mesh },
            { name: 'rim', mesh },
          ],
        }),
      )
      expect(events).toContainEqual(
        expect.objectContaining({
          kind: 'model.candidate-ready',
          modelId,
          partMeshes: [
            { name: 'body', mesh: meshSnapshot },
            { name: 'rim', mesh: meshSnapshot },
          ],
        }),
      )
    },
  )

  it('keeps rim-disabled container generations on the single-solid build', async () => {
    const parameters = {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      topRimEnabled: false,
      topRimHeight: 2,
    }
    const dividerCommand = {
      ...command,
      modelId: 'opengrid-divider' as const,
      parameters,
    }
    const shape = { delete: vi.fn() }
    const mesh = {
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      triangleCount: 1,
    }
    const meshSnapshot = {
      positions: new ArrayBuffer(4),
      normals: new ArrayBuffer(4),
      indices: new ArrayBuffer(4),
      bounds: mesh.bounds,
      triangleCount: mesh.triangleCount,
    }
    mocks.buildModelBRep.mockResolvedValue(shape)
    mocks.meshBRep.mockReturnValue(mesh)
    mocks.serializeMesh.mockReturnValue(meshSnapshot)

    const registerCandidate = vi.fn(() => vi.fn())
    const context = {
      epoch: 'epoch-divider-single',
      assets: {},
      buildOptions: {},
      emit: vi.fn(),
      emitProgress: vi.fn(),
      isGenerationCurrent: vi.fn(() => true),
      registerCandidate,
      supersede: vi.fn(),
    } as unknown as CadWorkerGenerationContext

    await generateCadCandidate(dividerCommand, context)

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-divider',
      parameters,
      expect.anything(),
    )
    expect(mocks.buildModelBRepWithParts).not.toHaveBeenCalled()
    expect(registerCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'opengrid-divider',
        shape,
        partMeshes: undefined,
      }),
    )
  })
})
