import { normalizeError, type CadError } from '../../../../cad-contract/errors'
import type { DiagnosticDescriptor } from '../../../../cad-contract/diagnostics'
import type { ValidationIssue } from '../../../../cad-contract/units'
import type { WorkerClientError } from '../../../../features/cad/worker-client'

export function errorForInput(
  issue: Pick<ValidationIssue, 'messageId' | 'field' | 'params'>,
): CadError {
  return normalizeError(undefined, {
    stage: 'validation',
    code: 'INVALID_INPUT',
    message: {
      messageId: issue.messageId,
      params: { ...issue.params, field: issue.field },
    },
    recoverable: true,
  })
}

export function errorForCapability(message: DiagnosticDescriptor): CadError {
  return normalizeError(undefined, {
    stage: 'worker',
    code: 'BROWSER_UNSUPPORTED',
    message,
    recoverable: false,
  })
}

export function errorForWorker(error: WorkerClientError): CadError {
  return normalizeError(error.error, {
    stage: error.kind === 'protocol-error' ? 'protocol' : 'worker',
    code:
      error.kind === 'protocol-error'
        ? 'PROTOCOL_INVALID'
        : 'WORKER_TERMINATED',
    recoverable: true,
  })
}
