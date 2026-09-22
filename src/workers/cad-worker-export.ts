import { DEFAULT_MODEL_COLORS } from '../cad-contract/model-colors'
import { PROTOCOL_VERSION, type WorkerCommand } from '../cad-contract/messages'
import {
  modelFileName,
  modelStlFileName,
  openGridWallCoverThreeMfFileName,
  openGridStackableCylinderThreeMfFileName,
  openGridStackableBoxThreeMfFileName,
  openGridOrganizerBoxThreeMfFileName,
  openGridDividerThreeMfFileName,
  openGridOpenConnectOrganizerThreeMfFileName,
  isOpenGridWallCoverParameters,
  isOpenGridStackableCylinderParameters,
  isOpenGridStackableBoxParameters,
  isOpenGridOrganizerBoxParameters,
  isOpenGridDividerParameters,
  isOpenGridOpenConnectOrganizerParameters,
  PROTOTYPE_CONFIGURATION,
  validateModelParameters,
} from '../cad-contract/units'
import {
  exportStepBytes,
  exportStlBytes,
  exportThreeMfBytes,
  isThreeMfPackage,
} from '../cad-kernel/export'
import type { CadWorkerLifecycle } from './cad-worker-lifecycle'
import { emitProgress, id } from './cad-worker-events'
import type { EventSink } from './cad-worker-types'

type ExportContext = {
  epoch: string
  lifecycle: Pick<CadWorkerLifecycle, 'pin' | 'unpin'>
  emit: EventSink
}

type StepCommand = Extract<WorkerCommand, { kind: 'export.step' }>
type StlCommand = Extract<WorkerCommand, { kind: 'export.stl' }>
type ThreeMfCommand = Extract<WorkerCommand, { kind: 'export.3mf' }>

const CONTAINER_THREE_MF_NAMING = {
  'opengrid-stackable-box': {
    plateName: 'OpenGrid Stackable Box',
    baseMaterialName: 'Box Body',
    accentMaterialName: 'Box Rim',
  },
  'opengrid-organizer-box': {
    plateName: 'OpenGrid Organizer Box',
    baseMaterialName: 'Organizer Body',
    accentMaterialName: 'Organizer Rim',
  },
  'opengrid-divider': {
    plateName: 'OpenGrid Divider',
    baseMaterialName: 'Divider Body',
    accentMaterialName: 'Divider Rim',
  },
  'opengrid-openconnect-organizer': {
    plateName: 'OpenGrid OpenConnect Organizer',
    baseMaterialName: 'Organizer Body',
    accentMaterialName: 'Organizer Rim',
  },
} as const

type ContainerThreeMfModelId = keyof typeof CONTAINER_THREE_MF_NAMING

function containerThreeMfFileNameOrThrow(fileName: string | null): string {
  if (fileName === null) throw new Error('THREEMF_METADATA_INVALID')
  return fileName
}

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
    if (!validation.valid) {
      throw new Error('THREEMF_METADATA_INVALID')
    }

    let expectedFileName: string
    let expectedAccentName: 'text' | 'rim'
    if (
      revision.modelId === 'opengrid-wall-cover' &&
      isOpenGridWallCoverParameters(validation.value.parameters)
    ) {
      expectedFileName = openGridWallCoverThreeMfFileName(
        validation.value.parameters,
      )
      expectedAccentName = 'text'
    } else if (
      revision.modelId === 'opengrid-stackable-cylinder' &&
      isOpenGridStackableCylinderParameters(validation.value.parameters) &&
      validation.value.parameters.topRimEnabled
    ) {
      expectedFileName = openGridStackableCylinderThreeMfFileName(
        validation.value.parameters,
      )
      expectedAccentName = 'rim'
    } else if (
      revision.modelId === 'opengrid-stackable-box' &&
      isOpenGridStackableBoxParameters(validation.value.parameters) &&
      validation.value.parameters.topRimEnabled
    ) {
      expectedFileName = containerThreeMfFileNameOrThrow(
        openGridStackableBoxThreeMfFileName(validation.value.parameters),
      )
      expectedAccentName = 'rim'
    } else if (
      revision.modelId === 'opengrid-organizer-box' &&
      isOpenGridOrganizerBoxParameters(validation.value.parameters) &&
      validation.value.parameters.topRimEnabled
    ) {
      expectedFileName = containerThreeMfFileNameOrThrow(
        openGridOrganizerBoxThreeMfFileName(validation.value.parameters),
      )
      expectedAccentName = 'rim'
    } else if (
      revision.modelId === 'opengrid-divider' &&
      isOpenGridDividerParameters(validation.value.parameters) &&
      validation.value.parameters.topRimEnabled
    ) {
      expectedFileName = containerThreeMfFileNameOrThrow(
        openGridDividerThreeMfFileName(validation.value.parameters),
      )
      expectedAccentName = 'rim'
    } else if (
      revision.modelId === 'opengrid-openconnect-organizer' &&
      isOpenGridOpenConnectOrganizerParameters(validation.value.parameters) &&
      validation.value.parameters.topRimEnabled
    ) {
      expectedFileName = containerThreeMfFileNameOrThrow(
        openGridOpenConnectOrganizerThreeMfFileName(
          validation.value.parameters,
        ),
      )
      expectedAccentName = 'rim'
    } else {
      throw new Error('THREEMF_METADATA_INVALID')
    }

    if (command.file.name !== expectedFileName) {
      throw new Error('THREEMF_METADATA_INVALID')
    }
    const parts = revision.parts
    if (
      !parts ||
      parts.length !== 2 ||
      parts[0]?.name !== 'body' ||
      parts[1]?.name !== expectedAccentName
    ) {
      throw new Error('THREEMF_PARTS_INVALID')
    }
    const threeMfParts = [
      { name: 'body' as const, shape: parts[0].shape },
      { name: expectedAccentName, shape: parts[1].shape },
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
    const colors = command.colors ?? DEFAULT_MODEL_COLORS
    const containerNaming =
      revision.modelId in CONTAINER_THREE_MF_NAMING
        ? CONTAINER_THREE_MF_NAMING[revision.modelId as ContainerThreeMfModelId]
        : undefined
    const bytes = await exportThreeMfBytes(threeMfParts, {
      baseColor: colors.primary,
      accentColor: colors.secondary,
      tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
      angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
      modelName: revision.modelId,
      sourceFile: command.file.name,
      ...(containerNaming ?? {}),
    })
    if (bytes.byteLength === 0 || !isThreeMfPackage(bytes)) {
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
