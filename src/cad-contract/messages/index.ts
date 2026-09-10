import type { CadError, CadErrorCode, CadErrorStage } from '../errors'
import { isDiagnosticParams, type DiagnosticParams } from '../diagnostics'
import type { PreviewTiming } from '../preview-timing'
import {
  PROTOTYPE_CONFIGURATION,
  validateModelParameters,
  type ModelId,
  type ModelParameterValues,
  type ModelParameters,
  type BoxBounds,
} from '../units'

export const PROTOCOL_VERSION = 2 as const

export type ProtocolVersion = typeof PROTOCOL_VERSION

export type MeshSnapshot = {
  positions: ArrayBuffer
  normals: ArrayBuffer
  indices: ArrayBuffer
  bounds: BoxBounds
  triangleCount: number
}

export type ModelPartMeshSnapshot = {
  name: 'body' | 'text'
  mesh: MeshSnapshot
}

export type AssetMetadata = {
  wasmUrl: string
}

type Envelope<K extends string> = {
  version: ProtocolVersion
  kind: K
  requestId: string
}

export type EngineInitCommand = Envelope<'engine.init'> & {
  operationId: string
  asset: AssetMetadata
}

export type PreviewConfig = {
  tolerance: number
  angularTolerance: number
  faceMeshingThreshold?: number
}

export type ModelGenerateCommand = Envelope<'model.generate'> &
  ModelParameters & {
    operationId: string
    generation: number
    previewConfig: PreviewConfig
  }

export type ModelInvalidateCommand = Envelope<'model.invalidate'> & {
  operationId: string
  generation: number
  workerEpoch: string
  reason: 'invalid-input' | 'superseded'
}

export type ModelCommitCommand = Envelope<'model.commit'> & {
  operationId: string
  generation: number
  candidateId: string
  workerEpoch: string
}

export type ModelDiscardCommand = Envelope<'model.discard'> & {
  operationId: string
  generation: number
  candidateId: string
  workerEpoch: string
}

export type ExportStepCommand = Envelope<'export.step'> & {
  operationId: string
  modelRevision: string
  workerEpoch: string
  file: { name: string; mime: 'model/step' }
}

export type ExportStlCommand = Envelope<'export.stl'> & {
  operationId: string
  modelRevision: string
  workerEpoch: string
  file: { name: string; mime: 'model/stl' }
}

export type ExportThreeMfCommand = Envelope<'export.3mf'> & {
  operationId: string
  modelRevision: string
  workerEpoch: string
  file: { name: string; mime: 'model/3mf' }
}

export type WorkerDisposeCommand = Envelope<'worker.dispose'> & {
  operationId: string
}

export type WorkerCommand =
  | EngineInitCommand
  | ModelGenerateCommand
  | ModelInvalidateCommand
  | ModelCommitCommand
  | ModelDiscardCommand
  | ExportStepCommand
  | ExportStlCommand
  | ExportThreeMfCommand
  | WorkerDisposeCommand

export type WorkerCommandInput =
  | (Omit<EngineInitCommand, 'version' | 'requestId'> &
      Partial<Pick<EngineInitCommand, 'version' | 'requestId'>>)
  | (Omit<ModelGenerateCommand, 'version' | 'requestId'> &
      Partial<Pick<ModelGenerateCommand, 'version' | 'requestId'>>)
  | (Omit<ModelInvalidateCommand, 'version' | 'requestId'> &
      Partial<Pick<ModelInvalidateCommand, 'version' | 'requestId'>>)
  | (Omit<ModelCommitCommand, 'version' | 'requestId'> &
      Partial<Pick<ModelCommitCommand, 'version' | 'requestId'>>)
  | (Omit<ModelDiscardCommand, 'version' | 'requestId'> &
      Partial<Pick<ModelDiscardCommand, 'version' | 'requestId'>>)
  | (Omit<ExportStepCommand, 'version' | 'requestId'> &
      Partial<Pick<ExportStepCommand, 'version' | 'requestId'>>)
  | (Omit<ExportStlCommand, 'version' | 'requestId'> &
      Partial<Pick<ExportStlCommand, 'version' | 'requestId'>>)
  | (Omit<ExportThreeMfCommand, 'version' | 'requestId'> &
      Partial<Pick<ExportThreeMfCommand, 'version' | 'requestId'>>)
  | (Omit<WorkerDisposeCommand, 'version' | 'requestId'> &
      Partial<Pick<WorkerDisposeCommand, 'version' | 'requestId'>>)

export type EngineReadyEvent = Envelope<'engine.ready'> & {
  operationId: string
  workerEpoch: string
  engine: { name: 'replicad'; wasm: true }
}

export type BooleanOperationKind = 'fuse' | 'cut' | 'intersect'

export type BooleanOperationState = 'running' | 'completed'

export type BooleanOperationProgress = {
  kind: BooleanOperationKind
  state: BooleanOperationState
  completed?: number
  total?: number
  unit?: ProgressUnit
  elapsedMs: number
}

export type ProgressEvent = Envelope<'operation.progress'> & {
  operationId: string
  stage: 'loading' | 'building' | 'meshing' | 'exporting'
  generation?: number
  modelRevision?: string
  completed?: number
  total?: number
  unit?: ProgressUnit
  booleanOperation?: BooleanOperationProgress
}

export type ProgressUnit = 'cells' | 'batches' | 'steps' | 'columns' | 'faces'

export type ModelInvalidatedEvent = Envelope<'model.invalidated'> & {
  operationId: string
  generation: number
  workerEpoch: string
}

export type ModelCandidateReadyEvent = Envelope<'model.candidate-ready'> & {
  operationId: string
  generation: number
  candidateId: string
  workerEpoch: string
  modelId: ModelId
  parameters: ModelParameterValues
  mesh: MeshSnapshot
  partMeshes?: ModelPartMeshSnapshot[]
  previewTiming?: PreviewTiming
}

export type ModelReadyEvent = Envelope<'model.ready'> & {
  operationId: string
  generation: number
  modelRevision: string
  workerEpoch: string
  modelId: ModelId
  parameters: ModelParameterValues
  mesh?: MeshSnapshot
  partMeshes?: ModelPartMeshSnapshot[]
  bounds: BoxBounds
  previewTiming?: PreviewTiming
}

export type ExportAcceptedEvent = Envelope<'export.accepted'> & {
  operationId: string
  modelRevision: string
  workerEpoch: string
}

export type SupersededEvent = Envelope<'operation.superseded'> & {
  operationId: string
  terminalForRequestId: string
  generation: number
  reason:
    | 'STALE_GENERATION'
    | 'CANDIDATE_CAPACITY'
    | 'CANDIDATE_EXPIRED'
    | 'CANDIDATE_ORPHANED'
}

export type OperationErrorEvent = Envelope<'operation.error'> & {
  operationId: string
  terminalForRequestId: string
  stage: CadErrorStage
  code: CadErrorCode
  messageId: string
  messageParams?: DiagnosticParams
  recoverable: boolean
  generation?: number
  modelRevision?: string
}

type ExportReadyEventBase = Envelope<'export.ready'> & {
  operationId: string
  modelRevision: string
  workerEpoch: string
  bytes: ArrayBuffer
  fileName: string
}

export type ExportStepReadyEvent = ExportReadyEventBase & {
  format: 'step'
  mime: 'model/step'
}

export type ExportStlReadyEvent = ExportReadyEventBase & {
  format: 'stl'
  mime: 'model/stl'
}

export type ExportThreeMfReadyEvent = ExportReadyEventBase & {
  format: '3mf'
  mime: 'model/3mf'
}

export type ExportReadyEvent =
  ExportStepReadyEvent | ExportStlReadyEvent | ExportThreeMfReadyEvent

export type WorkerEvent =
  | EngineReadyEvent
  | ProgressEvent
  | ModelInvalidatedEvent
  | ModelCandidateReadyEvent
  | ModelReadyEvent
  | ExportAcceptedEvent
  | SupersededEvent
  | OperationErrorEvent
  | ExportReadyEvent

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isEnvelope(
  value: unknown,
  kind: string,
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.version === PROTOCOL_VERSION &&
    value.kind === kind &&
    isNonEmptyString(value.requestId)
  )
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

const PROGRESS_UNITS: readonly ProgressUnit[] = [
  'cells',
  'batches',
  'steps',
  'columns',
  'faces',
]

const BOOLEAN_OPERATION_KINDS: readonly BooleanOperationKind[] = [
  'fuse',
  'cut',
  'intersect',
]

const BOOLEAN_OPERATION_STATES: readonly BooleanOperationState[] = [
  'running',
  'completed',
]

function isProgressCounters(value: Record<string, unknown>): boolean {
  const hasCompleted = value.completed !== undefined
  const hasTotal = value.total !== undefined
  const hasUnit = value.unit !== undefined
  const hasCounters = hasCompleted || hasTotal || hasUnit

  if (!hasCounters) return true
  return (
    hasCompleted &&
    hasTotal &&
    hasUnit &&
    isNonNegativeInteger(value.completed) &&
    isPositiveInteger(value.total) &&
    value.completed <= value.total &&
    PROGRESS_UNITS.includes(value.unit as ProgressUnit)
  )
}

function isBooleanOperationProgress(
  value: unknown,
): value is BooleanOperationProgress {
  if (!isRecord(value)) return false
  const hasCompleted = value.completed !== undefined
  const hasTotal = value.total !== undefined
  const hasCounts = hasCompleted || hasTotal
  if (hasCompleted !== hasTotal) return false
  if (
    !BOOLEAN_OPERATION_KINDS.includes(value.kind as BooleanOperationKind) ||
    !BOOLEAN_OPERATION_STATES.includes(value.state as BooleanOperationState) ||
    !isFiniteNumber(value.elapsedMs) ||
    value.elapsedMs < 0
  ) {
    return false
  }
  if (!hasCounts) return true
  if (
    !isNonNegativeInteger(value.completed) ||
    !isPositiveInteger(value.total) ||
    value.completed > value.total
  ) {
    return false
  }
  return (
    value.unit === undefined ||
    PROGRESS_UNITS.includes(value.unit as ProgressUnit)
  )
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer
}

function isExportCommand(
  value: Record<string, unknown>,
  extension: string,
  mime: string,
): boolean {
  return (
    isNonEmptyString(value.modelRevision) &&
    isNonEmptyString(value.workerEpoch) &&
    isRecord(value.file) &&
    isNonEmptyString(value.file.name) &&
    value.file.name.endsWith(extension) &&
    value.file.mime === mime
  )
}

function isExportReadyEvent(value: Record<string, unknown>): boolean {
  if (
    !isEnvelope(value, 'export.ready') ||
    !isNonEmptyString(value.operationId) ||
    !isNonEmptyString(value.modelRevision) ||
    !isNonEmptyString(value.workerEpoch) ||
    !isArrayBuffer(value.bytes) ||
    value.bytes.byteLength === 0 ||
    !isNonEmptyString(value.fileName)
  ) {
    return false
  }

  if (value.format === 'step') {
    return (
      value.mime === PROTOTYPE_CONFIGURATION.stepMime &&
      value.fileName.endsWith(PROTOTYPE_CONFIGURATION.stepExtension)
    )
  }
  if (value.format === 'stl') {
    return (
      value.mime === PROTOTYPE_CONFIGURATION.stlMime &&
      value.fileName.endsWith(PROTOTYPE_CONFIGURATION.stlExtension)
    )
  }
  if (value.format === '3mf') {
    return (
      value.mime === PROTOTYPE_CONFIGURATION.threeMfMime &&
      value.fileName.endsWith(PROTOTYPE_CONFIGURATION.threeMfExtension)
    )
  }
  return false
}

function isBounds(value: unknown): boolean {
  if (!isRecord(value)) return false
  const min = value.min
  const max = value.max
  return (
    Array.isArray(min) &&
    Array.isArray(max) &&
    min.length === 3 &&
    max.length === 3 &&
    [...min, ...max].every(isFiniteNumber) &&
    min.every((coordinate, index) => coordinate <= max[index])
  )
}

function isMesh(value: unknown): value is MeshSnapshot {
  return (
    isRecord(value) &&
    isArrayBuffer(value.positions) &&
    isArrayBuffer(value.normals) &&
    isArrayBuffer(value.indices) &&
    isBounds(value.bounds) &&
    isNonNegativeInteger(value.triangleCount) &&
    value.triangleCount > 0
  )
}

function isPartMeshes(value: unknown): value is ModelPartMeshSnapshot[] {
  if (!Array.isArray(value) || value.length === 0) return false
  const names = new Set<string>()
  for (const item of value) {
    if (
      !isRecord(item) ||
      (item.name !== 'body' && item.name !== 'text') ||
      names.has(item.name) ||
      !isMesh(item.mesh)
    ) {
      return false
    }
    names.add(item.name)
  }
  return true
}

function isPreviewTiming(value: unknown): value is PreviewTiming {
  if (!isRecord(value)) return false
  const durationKeys = [
    'buildMs',
    'meshMs',
    'qualityMs',
    'candidateMs',
    'serializationMs',
  ] as const
  const booleanDurationKeys = [
    'booleanMs',
    'booleanFuseMs',
    'booleanCutMs',
    'booleanIntersectMs',
  ] as const
  const validDuration = (duration: unknown): boolean =>
    duration === null || (isFiniteNumber(duration) && duration >= 0)
  return (
    durationKeys.every((key) => validDuration(value[key])) &&
    booleanDurationKeys.every(
      (key) => value[key] === undefined || validDuration(value[key]),
    ) &&
    isFiniteNumber(value.totalMs) &&
    value.totalMs >= 0
  )
}

function isOptionalPreviewTiming(value: unknown): boolean {
  return value === undefined || isPreviewTiming(value)
}

const CAD_ERROR_STAGES: readonly CadErrorStage[] = [
  'protocol',
  'initializing',
  'building',
  'meshing',
  'exporting',
  'worker',
  'validation',
]

const CAD_ERROR_CODES: readonly CadErrorCode[] = [
  'PROTOCOL_UNSUPPORTED',
  'PROTOCOL_INVALID',
  'ENGINE_INIT_FAILED',
  'ENGINE_TIMEOUT',
  'WORKER_TIMEOUT',
  'WORKER_RESTARTED',
  'WORKER_TERMINATED',
  'BROWSER_UNSUPPORTED',
  'INVALID_INPUT',
  'OPENGRID_UNSUPPORTED_CONFIGURATION',
  'OPENGRID_QUALITY_INVALID',
  'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
  'OPENGRID_SNAP_QUALITY_INVALID',
  'OPENGRID_WALL_COVER_QUALITY_INVALID',
  'OPENGRID_DIVIDER_QUALITY_INVALID',
  'MODEL_BUILD_FAILED',
  'MODEL_ASSET_INVALID',
  'MESH_INVALID',
  'MODEL_REVISION_MISSING',
  'STALE_GENERATION',
  'CANDIDATE_CAPACITY',
  'CANDIDATE_EXPIRED',
  'CANDIDATE_ORPHANED',
  'STEP_EXPORT_FAILED',
  'STEP_METADATA_INVALID',
  'STL_EXPORT_FAILED',
  'STL_METADATA_INVALID',
  'THREEMF_EXPORT_FAILED',
  'THREEMF_METADATA_INVALID',
  'UNKNOWN_ERROR',
]

function isCadErrorStage(value: unknown): value is CadErrorStage {
  return (
    typeof value === 'string' &&
    CAD_ERROR_STAGES.includes(value as CadErrorStage)
  )
}

function isCadErrorCode(value: unknown): value is CadErrorCode {
  return (
    typeof value === 'string' && CAD_ERROR_CODES.includes(value as CadErrorCode)
  )
}

export function isWorkerCommand(value: unknown): value is WorkerCommand {
  if (
    !isRecord(value) ||
    value.version !== PROTOCOL_VERSION ||
    typeof value.kind !== 'string'
  ) {
    return false
  }
  if (
    !isNonEmptyString(value.requestId) ||
    !isNonEmptyString(value.operationId)
  )
    return false

  switch (value.kind) {
    case 'engine.init':
      return isRecord(value.asset) && isNonEmptyString(value.asset.wasmUrl)
    case 'model.generate':
      return (
        isPositiveInteger(value.generation) &&
        validateModelParameters(value.modelId, value.parameters).valid &&
        isRecord(value.previewConfig) &&
        isFiniteNumber(value.previewConfig.tolerance) &&
        value.previewConfig.tolerance >= 0 &&
        isFiniteNumber(value.previewConfig.angularTolerance) &&
        value.previewConfig.angularTolerance > 0 &&
        (value.previewConfig.faceMeshingThreshold === undefined ||
          isPositiveInteger(value.previewConfig.faceMeshingThreshold))
      )
    case 'model.invalidate':
      return (
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.workerEpoch) &&
        (value.reason === 'invalid-input' || value.reason === 'superseded')
      )
    case 'model.commit':
    case 'model.discard':
      return (
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.candidateId) &&
        isNonEmptyString(value.workerEpoch)
      )
    case 'export.step':
      return isExportCommand(
        value,
        PROTOTYPE_CONFIGURATION.stepExtension,
        PROTOTYPE_CONFIGURATION.stepMime,
      )
    case 'export.stl':
      return isExportCommand(
        value,
        PROTOTYPE_CONFIGURATION.stlExtension,
        PROTOTYPE_CONFIGURATION.stlMime,
      )
    case 'export.3mf':
      return isExportCommand(
        value,
        PROTOTYPE_CONFIGURATION.threeMfExtension,
        PROTOTYPE_CONFIGURATION.threeMfMime,
      )
    case 'worker.dispose':
      return true
    default:
      return false
  }
}

export function isWorkerEvent(value: unknown): value is WorkerEvent {
  if (!isRecord(value) || typeof value.kind !== 'string') return false

  switch (value.kind) {
    case 'engine.ready':
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.workerEpoch) &&
        isRecord(value.engine) &&
        value.engine.name === 'replicad' &&
        value.engine.wasm === true
      )
    case 'operation.progress':
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        ['loading', 'building', 'meshing', 'exporting'].includes(
          String(value.stage),
        ) &&
        (value.generation === undefined ||
          isPositiveInteger(value.generation)) &&
        (value.modelRevision === undefined ||
          isNonEmptyString(value.modelRevision)) &&
        isProgressCounters(value) &&
        (value.booleanOperation === undefined ||
          isBooleanOperationProgress(value.booleanOperation))
      )
    case 'model.invalidated':
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.workerEpoch)
      )
    case 'model.candidate-ready':
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.candidateId) &&
        isNonEmptyString(value.workerEpoch) &&
        validateModelParameters(value.modelId, value.parameters).valid &&
        isMesh(value.mesh) &&
        (value.partMeshes === undefined || isPartMeshes(value.partMeshes)) &&
        isOptionalPreviewTiming(value.previewTiming)
      )
    case 'model.ready':
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.modelRevision) &&
        isNonEmptyString(value.workerEpoch) &&
        validateModelParameters(value.modelId, value.parameters).valid &&
        (value.mesh === undefined || isMesh(value.mesh)) &&
        (value.partMeshes === undefined || isPartMeshes(value.partMeshes)) &&
        isBounds(value.bounds) &&
        isOptionalPreviewTiming(value.previewTiming)
      )
    case 'export.accepted':
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.modelRevision) &&
        isNonEmptyString(value.workerEpoch)
      )
    case 'operation.superseded':
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.terminalForRequestId) &&
        isPositiveInteger(value.generation) &&
        [
          'STALE_GENERATION',
          'CANDIDATE_CAPACITY',
          'CANDIDATE_EXPIRED',
          'CANDIDATE_ORPHANED',
        ].includes(String(value.reason))
      )
    case 'operation.error':
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.terminalForRequestId) &&
        isCadErrorStage(value.stage) &&
        isCadErrorCode(value.code) &&
        !('userMessage' in value) &&
        isNonEmptyString(value.messageId) &&
        (value.messageParams === undefined ||
          isDiagnosticParams(value.messageParams)) &&
        typeof value.recoverable === 'boolean' &&
        (value.generation === undefined ||
          isPositiveInteger(value.generation)) &&
        (value.modelRevision === undefined ||
          isNonEmptyString(value.modelRevision))
      )
    case 'export.ready':
      return isExportReadyEvent(value)
    default:
      return false
  }
}

export function transferablesForEvent(event: WorkerEvent): Transferable[] {
  if (event.kind === 'model.candidate-ready' || event.kind === 'model.ready') {
    const transferables: Transferable[] = []
    if (event.mesh) {
      transferables.push(
        event.mesh.positions,
        event.mesh.normals,
        event.mesh.indices,
      )
    }
    for (const part of event.partMeshes ?? []) {
      transferables.push(
        part.mesh.positions,
        part.mesh.normals,
        part.mesh.indices,
      )
    }
    return transferables
  }
  if (event.kind === 'export.ready') return [event.bytes]
  return []
}

export function errorEvent(
  command: WorkerCommand,
  error: CadError,
  terminalForRequestId = command.requestId,
): OperationErrorEvent {
  return {
    version: PROTOCOL_VERSION,
    kind: 'operation.error',
    requestId: crypto.randomUUID(),
    operationId: command.operationId,
    terminalForRequestId,
    stage: error.stage,
    code: error.code,
    messageId: error.message.messageId,
    messageParams: error.message.params,
    recoverable: error.recoverable,
    generation: 'generation' in command ? command.generation : undefined,
    modelRevision:
      'modelRevision' in command ? command.modelRevision : undefined,
  }
}
