import { PROTOCOL_VERSION, type WorkerCommand } from '../cad-contract/messages'
import {
  modelFileName,
  modelStlFileName,
  openGridWallCoverThreeMfFileName,
  openGridLabelTagThreeMfFileName,
  isOpenGridWallCoverParameters,
  isOpenGridLabelTagParameters,
  PROTOTYPE_CONFIGURATION,
  validateModelParameters,
  type ModelId,
} from '../cad-contract/units'
import {
  exportStepBytes,
  exportStlBytes,
  exportThreeMfBytes,
  isThreeMfPackage,
  threeMfExpectationFor,
  threeMfMetaFor,
} from '../cad-kernel/export'
import type { CadWorkerLifecycle } from './cad-worker-lifecycle'
import { emitProgress, id } from './cad-worker-events'
import type { EventSink } from './cad-worker-types'

/**
 * Models supporting the two-color 3MF export and the part pair they must
 * carry on the committed revision.
 */
const THREE_MF_SUPPORTED_MODELS: Partial<
  Record<ModelId, readonly ['body', 'text' | 'icon']>
> = {
  'opengrid-wall-cover': ['body', 'text'],
  'opengrid-label-tag': ['body', 'icon'],
}

type ExportContext = {
  epoch: string
  lifecycle: Pick<CadWorkerLifecycle, 'pin' | 'unpin'>
  emit: EventSink
}

type StepCommand = Extract<WorkerCommand, { kind: 'export.step' }>
type StlCommand = Extract<WorkerCommand, { kind: 'export.stl' }>
type ThreeMfCommand = Extract<WorkerCommand, { kind: 'export.3mf' }>

export async function exportStepCommand(
  command: StepCommand,
  context: ExportContext,
): Promise<void> {
  if (command.workerEpoch !== context.epoch) throw new Error('WORKER_RESTARTED')
  const revision = context.lifecycle.pin(command.modelRevision)
  try {
    const validation = validateModelParameters(
      revision.modelId,
      revision.parameters,
    )
    if (!validation.valid) throw new Error('STEP_METADATA_INVALID')
    if (command.file.name !== modelFileName(validation.value)) {
      throw new Error('STEP_METADATA_INVALID')
    }
    context.emit({
      version: PROTOCOL_VERSION,
      kind: 'export.accepted',
      requestId: id(),
      operationId: command.operationId,
      modelRevision: revision.modelRevision,
      workerEpoch: context.epoch,
    })
    emitProgress(context.emit, command, 'exporting', revision.modelRevision)
    const bytes = await exportStepBytes(revision.shape)
    if (bytes.byteLength === 0) throw new Error('STEP_EMPTY')
    context.emit(
      {
        version: PROTOCOL_VERSION,
        kind: 'export.ready',
        requestId: id(),
        operationId: command.operationId,
        modelRevision: revision.modelRevision,
        workerEpoch: context.epoch,
        format: 'step',
        bytes,
        mime: 'model/step',
        fileName: command.file.name,
      },
      [bytes],
    )
  } finally {
    context.lifecycle.unpin(revision.modelRevision)
  }
}

export async function exportStlCommand(
  command: StlCommand,
  context: ExportContext,
): Promise<void> {
  if (command.workerEpoch !== context.epoch) throw new Error('WORKER_RESTARTED')
  const revision = context.lifecycle.pin(command.modelRevision)
  try {
    const validation = validateModelParameters(
      revision.modelId,
      revision.parameters,
    )
    if (!validation.valid) throw new Error('STL_METADATA_INVALID')
    if (command.file.name !== modelStlFileName(validation.value)) {
      throw new Error('STL_METADATA_INVALID')
    }
    context.emit({
      version: PROTOCOL_VERSION,
      kind: 'export.accepted',
      requestId: id(),
      operationId: command.operationId,
      modelRevision: revision.modelRevision,
      workerEpoch: context.epoch,
    })
    emitProgress(context.emit, command, 'exporting', revision.modelRevision)
    const bytes = await exportStlBytes(revision.shape, {
      tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
      angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
    })
    if (bytes.byteLength === 0) throw new Error('STL_EMPTY')
    context.emit(
      {
        version: PROTOCOL_VERSION,
        kind: 'export.ready',
        requestId: id(),
        operationId: command.operationId,
        modelRevision: revision.modelRevision,
        workerEpoch: context.epoch,
        format: 'stl',
        bytes,
        mime: PROTOTYPE_CONFIGURATION.stlMime,
        fileName: command.file.name,
      },
      [bytes],
    )
  } finally {
    context.lifecycle.unpin(revision.modelRevision)
  }
}

export async function exportThreeMfCommand(
  command: ThreeMfCommand,
  context: ExportContext,
): Promise<void> {
  if (command.workerEpoch !== context.epoch) throw new Error('WORKER_RESTARTED')
  const revision = context.lifecycle.pin(command.modelRevision)
  try {
    const validation = validateModelParameters(
      revision.modelId,
      revision.parameters,
    )
    const expectedParts = THREE_MF_SUPPORTED_MODELS[revision.modelId]
    if (!validation.valid || !expectedParts) {
      throw new Error('THREEMF_METADATA_INVALID')
    }
    if (
      revision.modelId === 'opengrid-wall-cover' &&
      (!isOpenGridWallCoverParameters(validation.value.parameters) ||
        command.file.name !==
          openGridWallCoverThreeMfFileName(validation.value.parameters))
    ) {
      throw new Error('THREEMF_METADATA_INVALID')
    }
    if (
      revision.modelId === 'opengrid-label-tag' &&
      (!isOpenGridLabelTagParameters(validation.value.parameters) ||
        command.file.name !==
          openGridLabelTagThreeMfFileName(validation.value.parameters))
    ) {
      throw new Error('THREEMF_METADATA_INVALID')
    }
    const parts = revision.parts
    if (
      !parts ||
      parts.length !== 2 ||
      parts[0]?.name !== expectedParts[0] ||
      parts[1]?.name !== expectedParts[1]
    ) {
      throw new Error('THREEMF_PARTS_INVALID')
    }
    const meta = threeMfMetaFor(
      revision.modelId as 'opengrid-wall-cover' | 'opengrid-label-tag',
      command.file.name,
    )
    const threeMfParts = [
      { name: 'body' as const, shape: parts[0].shape },
      {
        name: expectedParts[1] as 'text' | 'icon',
        shape: parts[1].shape,
      },
    ]
    context.emit({
      version: PROTOCOL_VERSION,
      kind: 'export.accepted',
      requestId: id(),
      operationId: command.operationId,
      modelRevision: revision.modelRevision,
      workerEpoch: context.epoch,
    })
    emitProgress(context.emit, command, 'exporting', revision.modelRevision)
    const bytes = await exportThreeMfBytes(
      threeMfParts,
      {
        tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
        angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
      },
      meta,
    )
    if (
      bytes.byteLength === 0 ||
      !isThreeMfPackage(bytes, threeMfExpectationFor(meta))
    ) {
      throw new Error('THREEMF_EXPORT_FAILED')
    }
    context.emit(
      {
        version: PROTOCOL_VERSION,
        kind: 'export.ready',
        requestId: id(),
        operationId: command.operationId,
        modelRevision: revision.modelRevision,
        workerEpoch: context.epoch,
        format: '3mf',
        bytes,
        mime: PROTOTYPE_CONFIGURATION.threeMfMime,
        fileName: command.file.name,
      },
      [bytes],
    )
  } finally {
    context.lifecycle.unpin(revision.modelRevision)
  }
}
