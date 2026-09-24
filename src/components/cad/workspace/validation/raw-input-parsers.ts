import type { DiagnosticParams } from '../../../../cad-contract/diagnostics'
import {
  normalizeOpenGridLocatingSeatMode,
  OPENGRID_LOCATING_SEAT_MODES,
  type ModelParameterKey,
} from '../../../../cad-contract/units'

export function parseBooleanRawParameter(
  rawValue: string | undefined,
  field: ModelParameterKey,
  defaultValue = false,
):
  | { valid: true; value: boolean }
  | { valid: false; messageId: string; field: ModelParameterKey } {
  const value = rawValue ?? String(defaultValue)
  if (value === 'true') return { valid: true, value: true }
  if (value === 'false') return { valid: true, value: false }
  return {
    valid: false,
    messageId: 'validation.invalid',
    field,
  }
}

export function parseSeatModeRawParameter(
  rawValue: string | undefined,
  field: ModelParameterKey,
):
  | { valid: true; value: (typeof OPENGRID_LOCATING_SEAT_MODES)[number] }
  | { valid: false; messageId: string; field: ModelParameterKey } {
  const value = rawValue ?? 'detachable-corner-seat'
  const normalizedValue = normalizeOpenGridLocatingSeatMode(value)
  if (normalizedValue !== undefined) {
    return {
      valid: true,
      value: normalizedValue,
    }
  }
  return {
    valid: false,
    messageId: 'validation.invalid',
    field,
  }
}

export function modelParameterFieldFromDiagnostic(
  field: string | undefined,
): ModelParameterKey | undefined {
  if (!field || field === 'parameters') return undefined
  return field as ModelParameterKey
}
