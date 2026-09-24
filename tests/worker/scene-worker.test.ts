import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  initialiseCadKernel: vi.fn(),
  buildProxyBRep: vi.fn(),
  buildModelBRep: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))
vi.mock('../../src/cad-kernel/scene/proxy', () => ({
  buildProxyBRep: mocks.buildProxyBRep,
}))
vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
}))
vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))
vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'

const PROXY_MESH = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
  bounds: { min: [0, 0, 0], max: [1, 1, 1] },
  triangleCount: 1,
}

const base = {
  version: 2 as const,
  requestId: 'scene-base-request',
  operationId: 'scene-base-operation',
}

function configureMocks(): void {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.buildProxyBRep.mockReturnValue({ delete: vi.fn() })
  mocks.meshBRep.mockReturnValue(PROXY_MESH)
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

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function sceneGenerateCommand() {
  return {
    ...base,
    requestId: 'scene-generate-request',
    operationId: 'scene-generate-operation',
    kind: 'scene.instance.generate' as const,
    instanceId: 'inst-1',
    modelId: 'box' as const,
    parameters: { width: 20, depth: 30, height: 40 },
    previewConfig: { tolerance: 0.1, angularTolerance: 0.5 },
  }
}

function sceneExportCommand(format: 'step' | 'stl') {
  return {
    ...base,
    requestId: `scene-export-request-${format}`,
    operationId: `scene-export-operation-${format}`,
    kind:
      format === 'step'
        ? ('scene.instance.export.step' as const)
        : ('scene.instance.export.stl' as const),
    instanceId: 'inst-1',
    modelId: 'box' as const,
    parameters: { width: 20, depth: 30, height: 40 },
    format,
    file: {
      name: `box-20x30x40-1.${format}`,
      mime: format === 'step' ? 'model/step' : 'model/stl',
    },
  }
}

describe('scene Worker commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
  })

  it('generates a planning proxy mesh for a scene instance', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-scene', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(sceneGenerateCommand())

    expect(mocks.buildProxyBRep).toHaveBeenCalledWith('box', {
      width: 20,
      depth: 30,
      height: 40,
    })
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'scene.instance.ready',
        instanceId: 'inst-1',
        workerEpoch: 'epoch-scene',
        bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      }),
    )
  })

  it('exports full-detail STEP and STL for a scene instance without revision pinning', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-scene', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(sceneExportCommand('step'))
    await runtime.handle(sceneExportCommand('stl'))

    expect(mocks.buildModelBRep).toHaveBeenCalledTimes(2)
    expect(mocks.exportStepBytes).toHaveBeenCalledOnce()
    expect(mocks.exportStlBytes).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'scene.instance.export.ready',
        format: 'step',
        fileName: 'box-20x30x40-1.step',
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'scene.instance.export.ready',
        format: 'stl',
        fileName: 'box-20x30x40-1.stl',
      }),
    )
  })

  it('rejects scene commands with invalid parameters at the protocol boundary', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-scene', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle({
      ...sceneGenerateCommand(),
      requestId: 'scene-invalid-request',
      operationId: 'scene-invalid-operation',
      parameters: { width: -5, depth: 30, height: 40 },
    })

    expect(mocks.buildProxyBRep).not.toHaveBeenCalled()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.error',
        code: 'PROTOCOL_INVALID',
      }),
    )
  })
})
