import type { Shape3D } from 'replicad'
import { PreviewTimingRecorder } from '../cad-contract/preview-timing'
import {
  isWorkerEvent,
  PROTOCOL_VERSION,
  transferablesForEvent,
  type ModelPartMeshSnapshot,
  type WorkerCommand,
  type WorkerEvent,
} from '../cad-contract/messages'
import {
  boundsForOpenGridWallCover,
  boundsForOpenGridLabelTag,
  boundsForOpenGridLabelCard,
  boundsForOpenGridLabelHolder,
  isHswCellParameters,
  isOpenGridDividerModelParameters,
  isOpenGridOpenConnectShelfParameters,
  isOpenGridOpenConnectOrganizerParameters,
  isOpenGridOpenShelfParameters,
  isOpenGridOrganizerBoxParameters,
  isOpenGridParameters,
  isOpenGridSnapParameters,
  isOpenGridStackableCylinderParameters,
  isOpenGridLabelTagParameters,
  isOpenGridLabelCardParameters,
  isOpenGridLabelHolderParameters,
  isPillarParameters,
  normalizeOpenGridDividerParameters,
  normalizeOpenGridParameters,
  normalizeOpenGridSnapParameters,
  validateModelParameters,
  type ModelParameterValues,
  isOpenGridWallCoverParameters,
  validateOpenGridGenerationSupport,
} from '../cad-contract/units'
import { createBooleanOperationReporter } from '../cad-kernel/boolean-progress'
import type {
  CandidateRecord,
  NativeModelPart,
  NativeModelPartMesh,
} from '../cad-kernel/lifetime'
import {
  buildModelBRep,
  buildModelBRepWithParts,
  type KernelBuildContext,
  type KernelModelBuildResult,
} from '../cad-kernel/model'
import { meshBRep, serializeMesh, type MeshData } from '../cad-kernel/mesh'
import { assertOpenGridDividerShapeQuality } from '../cad-kernel/components/opengrid-divider/quality'
import { assertOpenGridOpenConnectShelfShapeQuality } from '../cad-kernel/components/opengrid-openconnect-shelf/quality'
import { assertOpenGridOpenConnectOrganizerShapeQuality } from '../cad-kernel/components/opengrid-openconnect-organizer/quality'
import { assertOpenGridOpenShelfShapeQuality } from '../cad-kernel/components/opengrid-open-shelf/quality'
import { assertOpenGridOrganizerBoxGeometry } from '../cad-kernel/components/opengrid-organizer-box/quality'
import { assertOpenGridShapeQuality } from '../cad-kernel/components/opengrid/quality'
import { assertPillarShapeQuality } from '../cad-kernel/components/opengrid-pillar/quality'
import { assertOpenGridWallCoverShapeQuality } from '../cad-kernel/components/opengrid-wall-cover/quality'
import { assertOpenGridLabelTagShapeQuality } from '../cad-kernel/components/opengrid-label-tag/quality'
import { assertOpenGridLabelCardShapeQuality } from '../cad-kernel/components/opengrid-label-card/quality'
import { assertOpenGridLabelHolderShapeQuality } from '../cad-kernel/components/opengrid-label-holder/quality'
import {
  assertOpenGridSnapOpenConnectShapeQuality,
  assertOpenGridSnapShapeQuality,
} from '../cad-kernel/components/opengrid-snap/quality'
import { createThrottledMeshProgressReporter } from './mesh-progress'
import { id } from './cad-worker-events'
import type { CadWorkerAssetCache } from './cad-worker-assets'
import type {
  CadWorkerBuildOptions,
  EventSink,
  ProgressEmitter,
  SupersededReason,
} from './cad-worker-types'

type GenerateCommand = Extract<WorkerCommand, { kind: 'model.generate' }>

export type CadWorkerGenerationContext = {
  epoch: string
  assets: CadWorkerAssetCache
  buildOptions: CadWorkerBuildOptions
  emit: EventSink
  emitProgress: ProgressEmitter
  isGenerationCurrent: (generation: number) => boolean
  registerCandidate: (candidate: CandidateRecord) => () => void
  supersede: (
    command: { operationId: string; requestId: string; generation?: number },
    reason: SupersededReason,
  ) => void
}

function yieldToWorkerEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Keep the original Worker error when native cleanup is already incomplete.
  }
}

function deleteBuildShapes(
  shape: Shape3D | null | undefined,
  qualityShape: Shape3D | null | undefined,
  parts: readonly NativeModelPart[] | undefined,
): void {
  const deleted = new Set<Shape3D>()
  for (const candidate of [
    shape,
    qualityShape,
    ...(parts ?? []).map((part) => part.shape),
  ]) {
    if (!candidate || deleted.has(candidate)) continue
    deleted.add(candidate)
    deleteShape(candidate)
  }
}

export async function generateCadCandidate(
  command: GenerateCommand,
  context: CadWorkerGenerationContext,
): Promise<void> {
  const timing = new PreviewTimingRecorder()
  const booleanOperations = createBooleanOperationReporter(
    (progress) =>
      context.emitProgress(command, 'building', undefined, undefined, progress),
    (kind, durationMs) => timing.recordBoolean(kind, durationMs),
  )
  let generationParameters: ModelParameterValues = command.parameters
  if (command.modelId === 'opengrid') {
    const normalizedParameters = normalizeOpenGridParameters(command.parameters)
    generationParameters = normalizedParameters
    const support = validateOpenGridGenerationSupport(normalizedParameters)
    if (!support.valid) throw new Error('OPENGRID_UNSUPPORTED_CONFIGURATION')
  }
  if (command.modelId === 'opengrid-divider') {
    generationParameters = normalizeOpenGridDividerParameters(
      command.parameters,
    )
  }
  if (command.modelId === 'opengrid-snap') {
    const normalizedParameters = normalizeOpenGridSnapParameters(
      command.parameters,
    )
    if (!isOpenGridSnapParameters(normalizedParameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
    }
    generationParameters = normalizedParameters
  }
  if (command.modelId === 'opengrid-wall-cover') {
    const validation = validateModelParameters(
      command.modelId,
      command.parameters,
    )
    if (!validation.valid) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
    }
    generationParameters = validation.value.parameters
  }
  if (command.modelId === 'opengrid-label-tag') {
    const validation = validateModelParameters(
      command.modelId,
      command.parameters,
    )
    if (!validation.valid) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
    }
    generationParameters = validation.value.parameters
  }
  if (
    command.modelId === 'opengrid-label-card' ||
    command.modelId === 'opengrid-label-holder'
  ) {
    const validation = validateModelParameters(
      command.modelId,
      command.parameters,
    )
    if (!validation.valid) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:' + command.modelId)
    }
    generationParameters = validation.value.parameters
  }
  const hswProgress =
    command.modelId === 'hsw-cell' && isHswCellParameters(command.parameters)
      ? {
          completed: 0,
          total: command.parameters.rows * command.parameters.columns,
          unit: 'cells' as const,
        }
      : undefined
  context.emitProgress(command, 'building', undefined, hswProgress)

  let shape: Shape3D
  let qualityShape: Shape3D | null = null
  let nativeParts: NativeModelPart[] | undefined
  let nativePartMeshes: NativeModelPartMesh[] | undefined
  try {
    const {
      useOpenGridCanonicalTileCache = true,
      useOpenGridHalfCellPrototypeCache = true,
      ...openGridBuildOptions
    } = context.buildOptions
    const buildContext: KernelBuildContext = {
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
      isGenerationCurrent: () =>
        context.isGenerationCurrent(command.generation),
      booleanOperations,
      reportProgress: (progress) =>
        context.emitProgress(command, progress.stage, undefined, {
          completed: progress.completed,
          total: progress.total,
          unit: progress.unit,
        }),
    }
    if (useOpenGridCanonicalTileCache) {
      buildContext.getOpenGridCanonicalTile = (
        variant,
        thickness,
        canonicalBooleanOperations,
      ) =>
        context.assets.getOpenGridCanonicalTile(
          variant,
          thickness,
          () => context.isGenerationCurrent(command.generation),
          canonicalBooleanOperations,
        )
    }
    if (useOpenGridHalfCellPrototypeCache) {
      buildContext.getOpenGridHalfCellPrototype = (key, factory) =>
        context.assets.getOpenGridHalfCellPrototype(key, factory)
    }
    const usesMultipart =
      command.modelId === 'opengrid-wall-cover' ||
      command.modelId === 'opengrid-label-tag' ||
      command.modelId === 'opengrid-label-card' ||
      command.modelId === 'opengrid-label-holder' ||
      (command.modelId === 'opengrid-stackable-cylinder' &&
        Boolean(
          (generationParameters as Record<string, unknown>).topRimEnabled,
        )) ||
      ((command.modelId === 'opengrid-stackable-box' ||
        command.modelId === 'opengrid-organizer-box' ||
        command.modelId === 'opengrid-divider' ||
        command.modelId === 'opengrid-openconnect-organizer') &&
        Boolean(
          (generationParameters as Record<string, unknown>).topRimEnabled,
        ))
    const buildResult: KernelModelBuildResult = await timing.measure(
      'build',
      async () => {
        if (usesMultipart) {
          return buildModelBRepWithParts(
            command.modelId,
            generationParameters,
            buildContext,
          )
        }
        return {
          shape: await buildModelBRep(
            command.modelId,
            generationParameters,
            buildContext,
          ),
        }
      },
    )
    shape = buildResult.shape
    qualityShape = buildResult.qualityShape ?? shape
    nativeParts = buildResult.parts
  } catch (error) {
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      context.supersede(command, 'STALE_GENERATION')
      return
    }
    throw error
  }

  if (!context.isGenerationCurrent(command.generation)) {
    deleteBuildShapes(shape, qualityShape, nativeParts)
    context.supersede(command, 'STALE_GENERATION')
    return
  }

  let mesh: MeshData
  try {
    const reportFaceProgress = createThrottledMeshProgressReporter(
      ({ completed, total }) =>
        context.emitProgress(command, 'meshing', undefined, {
          completed,
          total,
          unit: 'faces',
        }),
    )
    context.emitProgress(command, 'meshing')
    const qualityMesh =
      qualityShape && qualityShape !== shape
        ? meshBRep(qualityShape, {
            ...command.previewConfig,
            reportFaceProgress,
          })
        : null
    try {
      mesh = timing.measureSync('mesh', () =>
        meshBRep(shape, {
          ...command.previewConfig,
          reportFaceProgress,
        }),
      )
    } catch (error) {
      reportFaceProgress.flush()
      throw error
    }
    if (command.modelId === 'opengrid-snap') {
      if (!isOpenGridSnapParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
      }
    }
    if (command.modelId === 'opengrid') {
      if (!isOpenGridParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
      }
      timing.measureSync('quality', () =>
        assertOpenGridShapeQuality(shape, generationParameters, mesh),
      )
    }
    if (command.modelId === 'opengrid-snap') {
      if (!isOpenGridSnapParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
      }
      if (generationParameters.footprint === 'full') {
        const reference = await context.assets.getOpenGridSnapReference(
          generationParameters.variant,
          generationParameters.profile,
        )
        timing.measureSync('quality', () => {
          if (generationParameters.openConnect) {
            assertOpenGridSnapOpenConnectShapeQuality(
              qualityShape ?? shape,
              generationParameters,
              qualityMesh ?? mesh,
              reference,
            )
            return
          }
          assertOpenGridSnapShapeQuality(
            qualityShape ?? shape,
            generationParameters,
            qualityMesh ?? mesh,
            reference,
          )
        })
      }
    }

    if (command.modelId === 'opengrid-wall-cover') {
      if (!isOpenGridWallCoverParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
      }
      const bodyPart = nativeParts?.find((part) => part.name === 'body')
      const textPart = nativeParts?.find((part) => part.name === 'text')
      if (!bodyPart || !textPart) {
        throw new Error('OPENGRID_WALL_COVER_PARTS_INVALID')
      }
      const bodyMesh = meshBRep(bodyPart.shape, command.previewConfig)
      const textMesh = meshBRep(textPart.shape, command.previewConfig)
      nativePartMeshes = [
        { name: 'body', mesh: bodyMesh },
        { name: 'text', mesh: textMesh },
      ]
      mesh.bounds = boundsForOpenGridWallCover(generationParameters)
      const reference = await context.assets.getOpenGridWallCoverReference()
      timing.measureSync('quality', () =>
        assertOpenGridWallCoverShapeQuality(
          qualityShape ?? shape,
          bodyPart.shape,
          textPart.shape,
          bodyMesh,
          textMesh,
          reference,
          generationParameters,
        ),
      )
    }

    if (command.modelId === 'opengrid-stackable-cylinder') {
      if (!isOpenGridStackableCylinderParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
      }
      if (nativeParts && nativeParts.length > 0) {
        const bodyPart = nativeParts.find((part) => part.name === 'body')
        const rimPart = nativeParts.find((part) => part.name === 'rim')
        if (!bodyPart || !rimPart) {
          throw new Error('OPENGRID_STACKABLE_CYLINDER_PARTS_INVALID')
        }
        const bodyMesh = meshBRep(bodyPart.shape, command.previewConfig)
        const rimMesh = meshBRep(rimPart.shape, command.previewConfig)
        nativePartMeshes = [
          { name: 'body', mesh: bodyMesh },
          { name: 'rim', mesh: rimMesh },
        ]
      }
    }

    if (
      command.modelId === 'opengrid-stackable-box' ||
      command.modelId === 'opengrid-organizer-box' ||
      command.modelId === 'opengrid-divider' ||
      command.modelId === 'opengrid-openconnect-organizer'
    ) {
      if (nativeParts && nativeParts.length > 0) {
        const bodyPart = nativeParts.find((part) => part.name === 'body')
        const rimPart = nativeParts.find((part) => part.name === 'rim')
        if (!bodyPart || !rimPart) {
          throw new Error(
            `OPENGRID_${command.modelId
              .replace('opengrid-', '')
              .replace(/-/g, '_')
              .toUpperCase()}_PARTS_INVALID`,
          )
        }
        const bodyMesh = meshBRep(bodyPart.shape, command.previewConfig)
        const rimMesh = meshBRep(rimPart.shape, command.previewConfig)
        nativePartMeshes = [
          { name: 'body', mesh: bodyMesh },
          { name: 'rim', mesh: rimMesh },
        ]
      }
    }

    if (command.modelId === 'opengrid-label-tag') {
      if (!isOpenGridLabelTagParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
      }
      const bodyPart = nativeParts?.find((part) => part.name === 'body')
      const iconPart = nativeParts?.find((part) => part.name === 'icon')
      if (!bodyPart || !iconPart) {
        throw new Error('OPENGRID_LABEL_TAG_PARTS_INVALID')
      }
      const bodyMesh = meshBRep(bodyPart.shape, command.previewConfig)
      const iconMesh = meshBRep(iconPart.shape, command.previewConfig)
      nativePartMeshes = [
        { name: 'body', mesh: bodyMesh },
        { name: 'icon', mesh: iconMesh },
      ]
      mesh.bounds = boundsForOpenGridLabelTag(generationParameters)
      timing.measureSync('quality', () =>
        assertOpenGridLabelTagShapeQuality(
          nativeParts ?? [],
          generationParameters,
        ),
      )
    }

    if (command.modelId === 'opengrid-label-card') {
      if (!isOpenGridLabelCardParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
      }
      const bodyPart = nativeParts?.find((part) => part.name === 'body')
      const accentPart = nativeParts?.find((part) => part.name === 'accent')
      if (!bodyPart || !accentPart) {
        throw new Error('OPENGRID_LABEL_CARD_PARTS_INVALID')
      }
      const bodyMesh = meshBRep(bodyPart.shape, command.previewConfig)
      const accentMesh = meshBRep(accentPart.shape, command.previewConfig)
      nativePartMeshes = [
        { name: 'body', mesh: bodyMesh },
        { name: 'accent', mesh: accentMesh },
      ]
      mesh.bounds = boundsForOpenGridLabelCard(generationParameters)
      timing.measureSync('quality', () =>
        assertOpenGridLabelCardShapeQuality(
          nativeParts ?? [],
          generationParameters,
        ),
      )
    }

    if (command.modelId === 'opengrid-label-holder') {
      if (!isOpenGridLabelHolderParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-holder')
      }
      timing.measureSync('quality', () =>
        assertOpenGridLabelHolderShapeQuality(shape, generationParameters),
      )
    }

    if (command.modelId === 'opengrid-divider') {
      if (!isOpenGridDividerModelParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
      }
      timing.measureSync('quality', () =>
        assertOpenGridDividerShapeQuality(shape, generationParameters, mesh),
      )
    }
    if (command.modelId === 'opengrid-pillar') {
      if (!isPillarParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
      }
      timing.measureSync('quality', () =>
        assertPillarShapeQuality(shape, generationParameters, mesh),
      )
    }
    if (command.modelId === 'opengrid-open-shelf') {
      if (!isOpenGridOpenShelfParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
      }
      timing.measureSync('quality', () =>
        assertOpenGridOpenShelfShapeQuality(shape, generationParameters, mesh),
      )
    }
    if (command.modelId === 'opengrid-openconnect-shelf') {
      if (!isOpenGridOpenConnectShelfParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
      }
      const lockedSlot =
        await context.assets.getOpenGridOpenConnectShelfLockedSlot()
      timing.measureSync('quality', () =>
        assertOpenGridOpenConnectShelfShapeQuality(
          shape,
          generationParameters,
          mesh,
          lockedSlot,
        ),
      )
    }
    if (command.modelId === 'opengrid-openconnect-organizer') {
      if (!isOpenGridOpenConnectOrganizerParameters(generationParameters)) {
        throw new Error(
          'MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer',
        )
      }
      const lockedSlot =
        await context.assets.getOpenGridOpenConnectShelfLockedSlot()
      await timing.measure('quality', () =>
        assertOpenGridOpenConnectOrganizerShapeQuality(
          shape,
          generationParameters,
          mesh,
          lockedSlot,
          {
            yieldToEventLoop: yieldToWorkerEventLoop,
            isGenerationCurrent: () =>
              context.isGenerationCurrent(command.generation),
          },
        ),
      )
    }
    if (command.modelId === 'opengrid-organizer-box') {
      if (!isOpenGridOrganizerBoxParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
      }
      let maleReference: Shape3D | undefined
      let holderReference: Shape3D | undefined
      if (generationParameters.cornerSeatMode === 'detachable-corner-seat') {
        ;[maleReference, holderReference] = await Promise.all([
          context.assets.getOpenGridDetachableCornerSeatReference(),
          context.assets.getOpenGridDetachableCornerSeatHolderReference(),
        ])
      }
      timing.measureSync('quality', () =>
        assertOpenGridOrganizerBoxGeometry(
          shape,
          generationParameters,
          holderReference,
          maleReference,
        ),
      )
    }
  } catch (error) {
    deleteBuildShapes(shape, qualityShape, nativeParts)
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      context.supersede(command, 'STALE_GENERATION')
      return
    }
    throw error
  }

  if (qualityShape && qualityShape !== shape) {
    deleteShape(qualityShape)
    qualityShape = null
  }

  const candidate: CandidateRecord = {
    candidateId: `candidate-${context.epoch}-${id()}`,
    operationId: command.operationId,
    requestId: command.requestId,
    generation: command.generation,
    workerEpoch: context.epoch,
    modelId: command.modelId,
    parameters: generationParameters,
    shape,
    parts: nativeParts,
    partMeshes: nativePartMeshes,
    mesh,
    previewTiming: timing.snapshot(),
    createdAt: Date.now(),
  }

  const unregisterCandidate = timing.measureSync('candidate', () =>
    context.registerCandidate(candidate),
  )
  let meshSnapshot: ReturnType<typeof serializeMesh>
  let partMeshSnapshots: ModelPartMeshSnapshot[] | undefined
  try {
    meshSnapshot = timing.measureSync('serialization', () =>
      serializeMesh(mesh),
    )
    partMeshSnapshots = candidate.partMeshes?.map((part) => ({
      name: part.name as 'body' | 'text' | 'rim' | 'icon' | 'accent',
      mesh: serializeMesh(part.mesh),
    }))
    candidate.previewTiming = timing.snapshot()
  } catch (error) {
    unregisterCandidate()
    throw error
  }
  const candidateEvent: WorkerEvent = {
    version: PROTOCOL_VERSION,
    kind: 'model.candidate-ready',
    requestId: id(),
    operationId: command.operationId,
    generation: command.generation,
    candidateId: candidate.candidateId,
    workerEpoch: context.epoch,
    modelId: candidate.modelId,
    parameters: candidate.parameters,
    mesh: meshSnapshot,
    partMeshes: partMeshSnapshots,
    previewTiming: candidate.previewTiming,
  }
  if (!isWorkerEvent(candidateEvent)) {
    unregisterCandidate()
    throw new Error('MESH_INVALID')
  }
  context.emit(candidateEvent, transferablesForEvent(candidateEvent))
}
