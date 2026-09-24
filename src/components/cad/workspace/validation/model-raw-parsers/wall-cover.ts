import type { RawParameters } from '../../types'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'
import {
  normalizeOpenGridWallCoverText,
  OPENGRID_WALL_COVER_CONFIGURATION,
  validateModelParameters,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../../../cad-contract/units'
import {
  modelParameterFieldFromDiagnostic,
  parseBooleanRawParameter,
} from '../raw-input-parsers'

export function parseWallCoverRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, messageId: 'validation.invalid' }
  }
  const text = typeof raw.text === 'string' ? raw.text : undefined
  const openConnect = parseBooleanRawParameter(
    raw.openConnect,
    'openConnect',
    OPENGRID_WALL_COVER_CONFIGURATION.defaultOpenConnect,
  )
  if (!openConnect.valid) return openConnect
  const normalizedRaw = {
    ...raw,
    openConnect: openConnect.value,
    ...(text === undefined
      ? {}
      : { text: normalizeOpenGridWallCoverText(text) }),
  }
  const validation = validateModelParameters(
    'opengrid-wall-cover',
    normalizedRaw,
  )
  if (!validation.valid) {
    const issue = validation.issues[0]
    return {
      valid: false,
      messageId: issue?.messageId ?? 'validation.invalid',
      field: modelParameterFieldFromDiagnostic(issue?.field),
      ...(issue?.params ? { params: issue.params } : {}),
    }
  }
  return { valid: true, value: validation.value.parameters }
}

export function parseSnapRemoverRawParameters():
  | { valid: true; value: ModelParameterValues }
  | { valid: false; messageId: string } {
  const validation = validateModelParameters('opengrid-snap-remover', {})
  if (validation.valid) {
    return { valid: true, value: validation.value.parameters }
  }
  return {
    valid: false,
    messageId: validation.issues[0]?.messageId ?? 'validation.invalid',
  }
}
