import { normalizeError } from '../../../../cad-contract/errors'
import {
  diagnostic,
  type DiagnosticParams,
  type FieldDiagnostic,
} from '../../../../cad-contract/diagnostics'
import {
  isWorkerEvent,
  type ProgressEvent,
  type WorkerEvent,
} from '../../../../cad-contract/messages'
import {
  PROTOTYPE_CONFIGURATION,
  validateModelParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../../cad-contract/units'
import { errorForInput, parseRawParameters } from '../validation'
import {
  validateMeshSnapshot,
  validateModelPartMeshes,
} from '../../../../features/cad/worker-client'
import type { ExportHandlers } from './export'
import type { ModelGenerationHandlers, RuntimeContext } from './types'

type WorkerEventContext = RuntimeContext & {
  generation: ModelGenerationHandlers
  exportHandlers: ExportHandlers
}

type InitialParameterParseResult =
  | { valid: true; value: ModelParameterValues }
  | { valid: false; messageId: string; field?: ModelParameterKey }

function parseInitialModelParameters(
  context: RuntimeContext,
  modelId: ModelId,
): InitialParameterParseResult {
  if (modelId !== 'opengrid') {
    return parseRawParameters(context.refs.rawParameters.current, modelId)
  }

  const validation = validateModelParameters(
    modelId,
    context.refs.state.current.input,
  )
  if (!validation.valid) {
    return {
      valid: false,
      messageId: validation.issues[0]?.messageId ?? 'validation.invalid',
    }
  }
  return { valid: true, value: validation.value.parameters }
}

function isCurrentModelOperation(
  context: RuntimeContext,
  operation: { kind: string; generation?: number } | undefined,
  eventGeneration?: number,
): boolean {
  return (
    operation?.kind === 'model' &&
    operation.generation === context.refs.latestGeneration.current &&
    (eventGeneration === undefined || eventGeneration === operation.generation)
  )
}

function isCurrentExportOperation(
  context: RuntimeContext,
  operationId: string,
  operation: { kind: string } | undefined,
): boolean {
  return (
    operation?.kind === 'export' &&
    context.refs.exportRequest.current?.operationId === operationId
  )
}

function stableParameterValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableParameterValue)
  if (typeof value !== 'object' || value === null) return value
  const record = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, stableParameterValue(record[key])]),
  )
}

function modelEventMatchesOperation(
  operation: {
    modelId?: ModelId
    parameters?: ModelParameterValues
  },
  event: {
    modelId: ModelId
    parameters: ModelParameterValues
  },
): boolean {
  if (
    operation.modelId === undefined ||
    operation.parameters === undefined ||
    operation.modelId !== event.modelId
  ) {
    return false
  }
  const expected = validateModelParameters(
    operation.modelId,
    operation.parameters,
  )
  const actual = validateModelParameters(event.modelId, event.parameters)
  if (!expected.valid || !actual.valid) return false
  return (
    JSON.stringify(stableParameterValue(expected.value.parameters)) ===
    JSON.stringify(stableParameterValue(actual.value.parameters))
  )
}

function wallCoverFieldErrorFor(
  operation: { kind: string; modelId?: ModelId } | undefined,
  messageId: string,
  params: DiagnosticParams | undefined,
): FieldDiagnostic | null {
  if (
    operation?.kind !== 'model' ||
    operation.modelId !== 'opengrid-wall-cover' ||
    (messageId !== 'diagnostic.wallCoverGlyphUnsupported' &&
      messageId !== 'diagnostic.wallCoverFontLoadFailed')
  ) {
    return null
  }
  return {
    field: 'text',
    messageId,
    ...(params ? { params } : {}),
  }
}

function progressFromEvent(event: ProgressEvent) {
  const progress = {
    operationId: event.operationId,
    stage: event.stage,
    completed: event.completed,
    total: event.total,
    unit: event.unit,
  } as const

  if (event.booleanOperation === undefined) return progress
  return { ...progress, booleanOperation: event.booleanOperation }
}

export function createWorkerEventHandler(
  context: WorkerEventContext,
): (event: WorkerEvent) => void {
  return (event) => {
    if (!isWorkerEvent(event)) return
    if (
      event.kind !== 'engine.ready' &&
      'workerEpoch' in event &&
      event.workerEpoch !== context.refs.workerEpoch.current
    )
      return

    switch (event.kind) {
      case 'engine.ready': {
        const session = context.refs.session.current
        const operation = context.refs.operations.current.get(event.operationId)
        if (session.ready || operation?.kind !== 'init') return
        context.clearTimer(event.operationId)
        context.refs.operations.current.delete(event.operationId)
        context.clearOperationProgress(event.operationId)
        session.ready = true
        context.refs.workerEpoch.current = event.workerEpoch
        context.dispatch({
          type: 'engine-ready',
          workerEpoch: event.workerEpoch,
        })
        if (
          session.invalidGeneration === context.refs.latestGeneration.current
        ) {
          context.generation.sendInvalidate(
            session.invalidGeneration,
            'invalid-input',
          )
          return
        }
        const pending = session.pending
        if (
          pending &&
          pending.generation === context.refs.latestGeneration.current
        ) {
          context.dispatch({
            type: 'generation-start',
            generation: pending.generation,
          })
          context.generation.sendGenerate(
            pending.modelId,
            pending.parameters,
            pending.generation,
          )
          return
        }
        if (
          session.mode === 'replacement' ||
          context.refs.latestGeneration.current > 0
        )
          return
        const initialGeneration = Math.max(
          1,
          context.refs.latestGeneration.current,
        )
        context.refs.latestGeneration.current = initialGeneration
        const modelId = context.refs.state.current.modelId
        const parsed = parseInitialModelParameters(context, modelId)
        if (parsed.valid) {
          context.dispatch({
            type: 'generation-start',
            generation: initialGeneration,
          })
          session.pending = {
            modelId,
            parameters: parsed.value,
            generation: initialGeneration,
          }
          context.generation.sendGenerate(
            modelId,
            parsed.value,
            initialGeneration,
            'initial-model',
          )
        } else {
          if (parsed.field) {
            context.setFieldErrors({
              [parsed.field]: {
                field: parsed.field,
                messageId: parsed.messageId,
              },
            })
          } else {
            context.setFieldErrors({})
          }
          context.dispatch({
            type: 'input-invalid',
            modelId,
            input: context.refs.state.current.input,
            generation: initialGeneration,
            error: errorForInput({
              field: parsed.field ?? 'parameters',
              messageId: parsed.messageId,
            }),
          })
          context.generation.sendInvalidate(initialGeneration, 'invalid-input')
        }
        return
      }
      case 'operation.progress': {
        const operation = context.refs.operations.current.get(event.operationId)
        if (!operation) return
        const isModelProgress =
          event.generation !== undefined &&
          isCurrentModelOperation(context, operation, event.generation)
        const isExportProgress =
          event.generation === undefined &&
          isCurrentExportOperation(context, event.operationId, operation)
        const isInitProgress =
          operation.kind === 'init' && event.stage === 'loading'
        if (!isModelProgress && !isExportProgress && !isInitProgress) return
        if (
          context.refs.activeProgressOperationId.current !== null &&
          context.refs.activeProgressOperationId.current !== event.operationId
        )
          return
        context.setOperationProgress(
          event.operationId,
          progressFromEvent(event),
        )
        return
      }
      case 'model.candidate-ready': {
        const operation = context.refs.operations.current.get(event.operationId)
        const client = context.refs.client.current
        const workerEpoch = context.refs.workerEpoch.current
        if (!operation || operation.kind !== 'model' || !client || !workerEpoch)
          return

        const validMesh = validateMeshSnapshot(event.mesh)
        const validPartMeshes = validateModelPartMeshes(
          event.partMeshes,
          operation.modelId === 'opengrid-wall-cover',
        )
        const matchingParameters = modelEventMatchesOperation(operation, event)
        const currentOperation = isCurrentModelOperation(
          context,
          operation,
          event.generation,
        )
        const commitOrDiscard =
          currentOperation &&
          event.workerEpoch === workerEpoch &&
          validMesh &&
          validPartMeshes &&
          matchingParameters
        if (commitOrDiscard) {
          operation.candidateMesh = event.mesh
          operation.candidatePartMeshes = event.partMeshes
        }
        client.send({
          kind: commitOrDiscard ? 'model.commit' : 'model.discard',
          operationId: event.operationId,
          generation: event.generation,
          candidateId: event.candidateId,
          workerEpoch: event.workerEpoch,
        })
        if (!currentOperation) {
          context.clearTimer(event.operationId)
          context.refs.operations.current.delete(event.operationId)
          return
        }
        context.setOperationTimeout(
          event.operationId,
          PROTOTYPE_CONFIGURATION.operationTimeoutMs,
          () => {
            context.recoverWorker(
              normalizeError(undefined, {
                stage: 'worker',
                code: 'WORKER_TIMEOUT',
                message: diagnostic('diagnostic.workerTimeout'),
                recoverable: true,
                generation: event.generation,
                operationId: event.operationId,
              }),
              client,
            )
          },
        )
        if (!validMesh || !validPartMeshes || !matchingParameters) {
          context.clearOperationProgress(event.operationId)
          context.dispatch({
            type: 'recoverable-error',
            error: normalizeError(new Error('mesh validation failed'), {
              stage: 'meshing',
              code: 'MESH_INVALID',
              message: diagnostic('diagnostic.meshInvalid'),
              recoverable: true,
              generation: event.generation,
              operationId: event.operationId,
            }),
          })
        }
        return
      }
      case 'model.ready': {
        context.clearTimer(event.operationId)
        const operation = context.refs.operations.current.get(event.operationId)
        if (
          !operation ||
          operation.kind !== 'model' ||
          !operation.modelId ||
          !operation.parameters
        )
          return
        if (
          !isCurrentModelOperation(context, operation, event.generation) ||
          event.workerEpoch !== context.refs.workerEpoch.current
        ) {
          context.refs.operations.current.delete(event.operationId)
          return
        }
        const mesh = event.mesh ?? operation.candidateMesh
        const matchingParameters = modelEventMatchesOperation(operation, event)
        const requiresParts = operation.modelId === 'opengrid-wall-cover'
        const partMeshes = event.partMeshes ?? operation.candidatePartMeshes
        const validPartMeshes = validateModelPartMeshes(
          partMeshes,
          requiresParts,
        )
        if (
          !mesh ||
          !validateMeshSnapshot(mesh) ||
          !validPartMeshes ||
          !matchingParameters
        ) {
          context.clearOperationProgress(event.operationId)
          context.refs.operations.current.delete(event.operationId)
          context.recoverWorker(
            normalizeError(new Error('model.ready mesh validation failed'), {
              stage: 'meshing',
              code: 'MESH_INVALID',
              message: diagnostic('diagnostic.meshInvalid'),
              recoverable: true,
              generation: event.generation,
              operationId: event.operationId,
            }),
          )
          return
        }
        context.clearOperationProgress(event.operationId)
        context.refs.operations.current.delete(event.operationId)
        delete operation.candidateMesh
        delete operation.candidatePartMeshes
        context.refs.autoRecoveryAttempts.current = 0
        context.dispatch({
          type: 'model-ready',
          model: {
            revision: event.modelRevision,
            workerEpoch: event.workerEpoch,
            generation: event.generation,
            modelId: operation.modelId,
            parameters: operation.parameters,
            mesh,
            partMeshes,
          },
        })
        return
      }
      case 'model.invalidated':
        if (event.generation === context.refs.latestGeneration.current) {
          context.clearProgress()
        }
        return
      case 'export.accepted':
        return
      case 'export.ready':
        context.exportHandlers.handleExportReady(event)
        return
      case 'operation.superseded': {
        context.clearTimer(event.operationId)
        const operation = context.refs.operations.current.get(event.operationId)
        if (isCurrentModelOperation(context, operation, event.generation)) {
          context.clearOperationProgress(event.operationId)
          context.dispatch({
            type: 'recoverable-error',
            error: normalizeError(new Error(event.reason), {
              stage: 'worker',
              code: 'STALE_GENERATION',
              message: diagnostic('diagnostic.staleGeneration'),
              recoverable: true,
              generation: event.generation,
              operationId: event.operationId,
            }),
          })
        } else if (
          isCurrentExportOperation(context, event.operationId, operation)
        ) {
          context.clearOperationProgress(event.operationId)
        }
        context.refs.operations.current.delete(event.operationId)
        return
      }
      case 'operation.error': {
        context.clearTimer(event.operationId)
        const operation = context.refs.operations.current.get(event.operationId)
        if (!operation) return
        if (
          operation?.kind === 'model' &&
          !isCurrentModelOperation(context, operation, event.generation)
        ) {
          context.refs.operations.current.delete(event.operationId)
          return
        }
        const currentExport = isCurrentExportOperation(
          context,
          event.operationId,
          operation,
        )
        if (operation?.kind === 'export' && !currentExport) {
          context.refs.operations.current.delete(event.operationId)
          return
        }
        if (
          operation?.kind === 'init' ||
          operation?.kind === 'model' ||
          currentExport
        )
          context.clearOperationProgress(event.operationId)
        context.refs.operations.current.delete(event.operationId)
        if (
          context.refs.exportRequest.current?.operationId === event.operationId
        ) {
          context.refs.exportRequest.current = null
          context.dispatch({ type: 'export-end' })
        }
        const error = normalizeError(undefined, {
          stage: event.stage,
          code: event.code,
          message: {
            messageId: event.messageId,
            params: event.messageParams,
          },
          recoverable: event.recoverable,
          generation: event.generation,
          modelRevision: event.modelRevision,
          operationId: event.operationId,
        })
        const wallCoverFieldError = wallCoverFieldErrorFor(
          operation,
          event.messageId,
          event.messageParams,
        )
        if (wallCoverFieldError) {
          context.setFieldErrors({ text: wallCoverFieldError })
        }
        if (event.code === 'ENGINE_INIT_FAILED') {
          context.recoverWorker(error)
        } else {
          context.dispatch({ type: 'recoverable-error', error })
        }
        return
      }
    }
  }
}
