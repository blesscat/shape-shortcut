import { PROTOCOL_VERSION, type WorkerCommand } from '../cad-contract/messages'
import { PROTOTYPE_CONFIGURATION } from '../cad-contract/units'
import { buildModelBRep, type KernelBuildContext } from '../cad-kernel/model'
import { meshBRep, serializeMesh } from '../cad-kernel/mesh'
import { buildScenePreviewBRep } from '../cad-kernel/scene/proxy'
import { exportStepBytes, exportStlBytes } from '../cad-kernel/export'
import type { CadWorkerAssetCache } from './cad-worker-assets'
import { emitProgress, id } from './cad-worker-events'
import type { CadWorkerBuildOptions, EventSink } from './cad-worker-types'

export type SceneWorkerContext = {
  epoch: string
  assets: CadWorkerAssetCache
  buildOptions: CadWorkerBuildOptions
  emit: EventSink
}

type GenerateCommand = Extract<
  WorkerCommand,
  { kind: 'scene.instance.generate' }
>
type ExportCommand = Extract<
  WorkerCommand,
  { kind: 'scene.instance.export.step' | 'scene.instance.export.stl' }
>

function yieldToWorkerEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function kernelBuildContext(
  command: GenerateCommand | ExportCommand,
  context: SceneWorkerContext,
): KernelBuildContext {
  const {
    useOpenGridCanonicalTileCache: _canonicalTileCache,
    useOpenGridHalfCellPrototypeCache: _halfCellCache,
    ...openGridBuildOptions
  } = context.buildOptions
  return {
    ...openGridBuildOptions,
    getModularGridBaseTemplate: () =>
      context.assets.getModularGridBaseTemplate(),
    getHswCellTemplate: () => context.assets.getHswCellTemplate(),
    getHexagonalColumnReference: () =>
      context.assets.getHexagonalColumnReference(),
    getOpenGridPrototype: (variant) =>
      context.assets.getOpenGridPrototype(variant),
    getOpenGridSnapReference: (variant, profile) =>
      context.assets.getOpenGridSnapReference(variant, profile),
    getOpenGridWallCoverReference: () =>
      context.assets.getOpenGridWallCoverReference(),
    getOpenGridSnapFixedFootprint: (footprint) =>
      context.assets.getOpenGridSnapFixedFootprint(footprint),
    getOpenGridSnapOpenConnectHead: () =>
      context.assets.getOpenGridSnapOpenConnectHead(),
    getOpenGridSnapRemoverAsset: () =>
      context.assets.getOpenGridSnapRemoverAsset(),
    getOpenGridOpenConnectShelfLockedSlot: () =>
      context.assets.getOpenGridOpenConnectShelfLockedSlot(),
    getOpenGridDetachableCornerSeatReference: () =>
      context.assets.getOpenGridDetachableCornerSeatReference(),
    getOpenGridDetachableCornerSeatHolderReference: () =>
      context.assets.getOpenGridDetachableCornerSeatHolderReference(),
    yieldToEventLoop: yieldToWorkerEventLoop,
    isGenerationCurrent: () => true,
  }
}

export async function sceneInstanceGenerateCommand(
  command: GenerateCommand,
  context: SceneWorkerContext,
): Promise<void> {
  emitProgress(context.emit, command, 'building')
  const shape = await buildScenePreviewBRep(
    command.modelId,
    command.parameters,
    kernelBuildContext(command, context),
  )
  try {
    const mesh = meshBRep(shape, command.previewConfig)
    const meshSnapshot = serializeMesh(mesh)
    context.emit(
      {
        version: PROTOCOL_VERSION,
        kind: 'scene.instance.ready',
        requestId: id(),
        operationId: command.operationId,
        instanceId: command.instanceId,
        workerEpoch: context.epoch,
        modelId: command.modelId,
        parameters: command.parameters,
        mesh: meshSnapshot,
        bounds: meshSnapshot.bounds,
      },
      [
        meshSnapshot.positions,
        meshSnapshot.normals,
        meshSnapshot.indices,
        ...(meshSnapshot.faceTriangleRanges
          ? [meshSnapshot.faceTriangleRanges]
          : []),
      ],
    )
  } finally {
    try {
      shape.delete()
    } catch {
      // Keep the primary error when native cleanup fails.
    }
  }
}

export async function sceneInstanceExportCommand(
  command: ExportCommand,
  context: SceneWorkerContext,
): Promise<void> {
  emitProgress(context.emit, command, 'exporting')
  const buildContext = kernelBuildContext(command, context)
  const shape = await buildModelBRep(
    command.modelId,
    command.parameters,
    buildContext,
  )
  try {
    const bytes =
      command.format === 'step'
        ? await exportStepBytes(shape)
        : await exportStlBytes(shape, {
            tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
            angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
          })
    if (bytes.byteLength === 0) {
      throw new Error(command.format === 'step' ? 'STEP_EMPTY' : 'STL_EMPTY')
    }
    context.emit(
      {
        version: PROTOCOL_VERSION,
        kind: 'scene.instance.export.ready',
        requestId: id(),
        operationId: command.operationId,
        instanceId: command.instanceId,
        workerEpoch: context.epoch,
        bytes,
        fileName: command.file.name,
        format: command.format,
        mime:
          command.format === 'step'
            ? PROTOTYPE_CONFIGURATION.stepMime
            : PROTOTYPE_CONFIGURATION.stlMime,
      },
      [bytes],
    )
  } finally {
    try {
      shape.delete()
    } catch {
      // Keep the primary error when native cleanup fails.
    }
  }
}
