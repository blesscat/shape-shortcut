import {
  OPENGRID_LABEL_CARD_CONFIGURATION,
  normalizeOpenGridLabelCardText,
  parseDimensionInput,
  validateModelParameters,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../../../cad-contract/units'
import { parameterKeysForModel } from '../model-parameter-keys'
import { modelParameterFieldFromDiagnostic } from '../raw-input-parsers'
import type { RawParameters } from '../../types'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'

export function parseOpenGridLabelCardRawParameters(raw: RawParameters):
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
  const allowedKeys = parameterKeysForModel('opengrid-label-card')
  const unexpectedKey = Object.keys(raw).find(
    (key) => !allowedKeys.includes(key as ModelParameterKey),
  )
  if (unexpectedKey) {
    return { valid: false, messageId: 'validation.invalid' }
  }
  const rawGridUnits =
    raw.gridUnits ??
    String(OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.gridUnits)
  const gridUnits = parseDimensionInput(rawGridUnits)
  if (gridUnits === null) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'gridUnits',
    }
  }
  const style =
    raw.style ?? OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.style
  const text = typeof raw.text === 'string' ? raw.text : undefined
  const normalizedRaw: Record<string, unknown> = {
    gridUnits,
    style,
    textHeight: Number(raw.textHeight ?? 7),
    iconPosition: raw.iconPosition ?? 'left',
    textLine2: raw.textLine2 ?? '',
    textAlignment: raw.textAlignment ?? 'center',
    textLine2Alignment: raw.textLine2Alignment ?? 'center',
  }
  if (raw.icon !== undefined) normalizedRaw.icon = raw.icon
  if (text !== undefined)
    normalizedRaw.text = normalizeOpenGridLabelCardText(text)
  const validation = validateModelParameters(
    'opengrid-label-card',
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
