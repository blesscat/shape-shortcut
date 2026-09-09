import type { CadError } from '../../../../cad-contract/errors'
import type {
  ModelId,
  ModelParameterKey,
  ModelParameterValues,
  OpenGridParameters,
  ValidationIssue,
} from '../../../../cad-contract/units'
import type { CadAction, CadState } from '../../../../features/cad/state'
import type { CadProgress } from '../../../../features/cad/progress'
import type { CadWorkerClient } from '../../../../features/cad/worker-client'
import type { ExportRequest, OperationRecord, RawParameters } from '../types'

export type FieldErrors = Partial<
  Record<ModelParameterKey | 'parameters', ValidationIssue>
>

export type MutableRef<T> = { current: T }

export type StateSetter<T> = (value: T) => void

export type PendingGeneration = {
  modelId: ModelId
  parameters: ModelParameterValues
  generation: number
}

export type WorkerSession = {
  mode: 'bootstrap' | 'replacement'
  ready: boolean
  pending: PendingGeneration | null
  invalidGeneration?: number
}

export type RuntimeRefs = {
  client: MutableRef<CadWorkerClient | null>
  rawParameters: MutableRef<RawParameters>
  state: MutableRef<CadState>
  workerEpoch: MutableRef<string | null>
  latestGeneration: MutableRef<number>
  session: MutableRef<WorkerSession>
  autoRecoveryAttempts: MutableRef<number>
  operations: MutableRef<Map<string, OperationRecord>>
  activeProgressOperationId: MutableRef<string | null>
  exportRequest: MutableRef<ExportRequest | null>
  debounce: MutableRef<ReturnType<typeof setTimeout> | null>
  timers: MutableRef<Map<string, ReturnType<typeof setTimeout>>>
  startWorker: MutableRef<
    (manual?: boolean, pending?: PendingGeneration) => void
  >
  recoverWorker: MutableRef<RecoverWorker>
  disposed: MutableRef<boolean>
}

export type RecoverWorker = (
  error: CadError,
  client?: CadWorkerClient | null,
) => void

export type RuntimeContext = {
  refs: RuntimeRefs
  dispatch: (action: CadAction) => void
  setRawParameters: StateSetter<RawParameters>
  setPersistedParameters: (
    modelId: ModelId,
    parameters: ModelParameterValues,
  ) => void
  setFieldErrors: StateSetter<FieldErrors>
  setProgress: StateSetter<CadProgress | null>
  setOperationProgress: (operationId: string, progress: CadProgress) => void
  clearOperationProgress: (operationId: string) => void
  clearProgress: () => void
  clearTimer: (operationId: string) => void
  setOperationTimeout: (
    operationId: string,
    timeoutMs: number,
    callback: () => void,
  ) => void
  recoverWorker: RecoverWorker
}

export type ModelGenerationHandlers = {
  sendGenerate: (
    modelId: ModelId,
    parameters: ModelParameterValues,
    generation: number,
    operationId?: string,
  ) => void
  sendInvalidate: (
    generation: number,
    reason: 'invalid-input' | 'superseded',
  ) => void
  handleInputChange: (key: ModelParameterKey, value: string) => void
  handleParametersScopeChange: (parameters: ModelParameterValues) => void
  handleOpenGridParametersChange: (parameters: OpenGridParameters) => void
  handleOpenGridDimensionCalculationInvalid: () => void
}
