import { normalizeError } from '../../../../cad-contract/errors'
import { diagnostic } from '../../../../cad-contract/diagnostics'
import type { ExportReadyEvent } from '../../../../cad-contract/messages'
import { PROTOTYPE_CONFIGURATION } from '../../../../cad-contract/units'
import {
  type ExportFormat,
  triggerFixedStepDownload,
  triggerThreeMfDownload,
  triggerStlDownload,
  triggerStepDownload,
  validateThreeMfResponse,
  validateStlResponse,
  validateStepResponse,
} from '../../../../features/cad/download'
import { getModelDefinition } from '../../../../features/cad/model-catalog'
import { newOperationId } from '../../../../features/cad/worker-client'
import type { ExportRequest } from '../types'
import type { RuntimeContext } from './types'

export type ExportHandlers = {
  handleExportReady: (event: ExportReadyEvent) => void
  handleExport: (format?: ExportFormat) => void
}

function validateExportResponse(
  request: ExportRequest,
  event: ExportReadyEvent,
) {
  if (request.format === 'stl') {
    return validateStlResponse(
      event,
      request.revision,
      request.workerEpoch,
      request.fileName,
    )
  }
  if (request.format === '3mf') {
    return validateThreeMfResponse(
      event,
      request.revision,
      request.workerEpoch,
      request.fileName,
    )
  }
  return validateStepResponse(
    event,
    request.revision,
    request.workerEpoch,
    request.fileName,
  )
}

function triggerExportDownload(
  format: ExportFormat,
  event: ExportReadyEvent,
): () => void {
  if (format === 'stl') return triggerStlDownload(event)
  if (format === '3mf') return triggerThreeMfDownload(event)
  return triggerStepDownload(event)
}

function metadataErrorCode(format: ExportFormat) {
  if (format === 'stl') return 'STL_METADATA_INVALID' as const
  if (format === '3mf') return 'THREEMF_METADATA_INVALID' as const
  return 'STEP_METADATA_INVALID' as const
}

function exportTimeoutDiagnostic(format: ExportFormat) {
  if (format === 'stl') return diagnostic('diagnostic.stlExportTimeout')
  if (format === '3mf') return diagnostic('diagnostic.threeMfExportTimeout')
  return diagnostic('diagnostic.stepExportTimeout')
}

export function createExportHandlers(context: RuntimeContext): ExportHandlers {
  const handleExportReady = (event: ExportReadyEvent) => {
    const request = context.refs.exportRequest.current
    if (
      !request ||
      request.operationId !== event.operationId ||
      request.downloaded
    )
      return

    const validation = validateExportResponse(request, event)
    if (!validation.valid) {
      context.dispatch({
        type: 'recoverable-error',
        error: normalizeError(undefined, {
          stage: 'exporting',
          code: metadataErrorCode(request.format),
          message: validation.message,
          recoverable: true,
          modelRevision: request.revision,
          operationId: request.operationId,
        }),
      })
      context.clearOperationProgress(request.operationId)
      context.clearTimer(request.operationId)
      context.refs.operations.current.delete(request.operationId)
      context.refs.exportRequest.current = null
      context.dispatch({ type: 'export-end' })
      return
    }

    request.downloaded = true
    const revoke = triggerExportDownload(request.format, event)
    setTimeout(revoke, 1_000)
    context.clearTimer(request.operationId)
    context.clearOperationProgress(request.operationId)
    context.refs.operations.current.delete(request.operationId)
    context.refs.exportRequest.current = null
    context.dispatch({ type: 'export-end' })
  }

  const handleExport = (format: ExportFormat = 'step') => {
    const client = context.refs.client.current
    const model = context.refs.state.current.committed
    const workerEpoch = context.refs.workerEpoch.current
    const state = context.refs.state.current
    if (
      !client ||
      !model ||
      !workerEpoch ||
      state.status !== 'ready' ||
      state.exportStatus !== 'idle'
    )
      return

    const definition = getModelDefinition(model.modelId)
    if (!definition) return

    if (format === 'step') {
      const fixedDownload = definition.fixedStepDownload?.(model.parameters)
      if (fixedDownload) {
        triggerFixedStepDownload(fixedDownload)
        return
      }
    }

    const operationId = newOperationId(`export-${format}`)
    let fileName: string
    let requestId: string
    if (format === 'stl') {
      fileName = definition.stlFileName(model.parameters)
      requestId = client.send({
        kind: 'export.stl',
        operationId,
        modelRevision: model.revision,
        workerEpoch,
        file: { name: fileName, mime: PROTOTYPE_CONFIGURATION.stlMime },
      })
    } else if (format === '3mf') {
      const threeMfFileName = definition.threeMfFileName?.(model.parameters)
      if (!threeMfFileName) return
      fileName = threeMfFileName
      requestId = client.send({
        kind: 'export.3mf',
        operationId,
        modelRevision: model.revision,
        workerEpoch,
        file: {
          name: fileName,
          mime: PROTOTYPE_CONFIGURATION.threeMfMime,
        },
      })
    } else {
      fileName = definition.exportFileName(model.parameters)
      requestId = client.send({
        kind: 'export.step',
        operationId,
        modelRevision: model.revision,
        workerEpoch,
        file: { name: fileName, mime: PROTOTYPE_CONFIGURATION.stepMime },
      })
    }
    const request: ExportRequest = {
      operationId,
      format,
      revision: model.revision,
      workerEpoch,
      fileName,
      downloaded: false,
    }
    context.refs.exportRequest.current = request
    context.refs.operations.current.set(operationId, {
      kind: 'export',
      modelRevision: model.revision,
      requestId,
    })
    context.dispatch({ type: 'export-start' })
    context.setOperationProgress(operationId, { stage: 'exporting' })
    context.setOperationTimeout(
      operationId,
      PROTOTYPE_CONFIGURATION.operationTimeoutMs,
      () => {
        if (context.refs.exportRequest.current !== request) return
        context.refs.exportRequest.current = null
        context.clearOperationProgress(operationId)
        context.dispatch({ type: 'export-end' })
        context.recoverWorker(
          normalizeError(new Error(`${format.toUpperCase()} export timeout`), {
            stage: 'exporting',
            code: 'WORKER_TIMEOUT',
            message: exportTimeoutDiagnostic(format),
            recoverable: true,
            modelRevision: model.revision,
            operationId,
          }),
          client,
        )
      },
    )
  }

  return { handleExportReady, handleExport }
}
