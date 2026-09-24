import type { RawParameters } from '../../types'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'
import {
  PILLAR_CONFIGURATION,
  parseDimensionInput,
  parseFiniteDecimalInput,
  validatePillarParameters,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../../../cad-contract/units'

function pillarModelParameterField(
  field: string | undefined,
): ModelParameterKey | undefined {
  if (field === 'mode' || field === 'length' || field === 'offset') return field
  return undefined
}

export function parsePillarRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const mode = raw.mode
  if (mode !== 'positioning' && mode !== 'detachable-corner-seat') {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'mode',
    }
  }

  const rawOffset = (field: 'offset'): number | null => {
    const value = raw[field] ?? '0'
    const trimmed = value.trim()
    if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  const offset = rawOffset('offset')
  if (offset === null) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'offset',
    }
  }

  if (mode === 'detachable-corner-seat') {
    const extraField = Object.keys(raw).find(
      (field) => field !== 'mode' && field !== 'length' && field !== 'offset',
    )
    if (extraField) {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: pillarModelParameterField(extraField),
      }
    }
    const rawSeatLength =
      raw.length ?? String(PILLAR_CONFIGURATION.seatDefaultLength)
    const seatLength = parseFiniteDecimalInput(rawSeatLength)
    if (seatLength === null) {
      return {
        valid: false,
        messageId: 'validation.invalid',
        field: 'length',
      }
    }
    const seatValidation = validatePillarParameters({
      mode,
      length: seatLength,
      offset,
    })
    if (!seatValidation.valid) {
      const issue = seatValidation.issues[0]
      return {
        valid: false,
        messageId: issue?.messageId ?? 'validation.invalid',
        field: pillarModelParameterField(issue?.field),
      }
    }
    return { valid: true, value: seatValidation.value }
  }

  const rawLength =
    raw.length ?? String(PILLAR_CONFIGURATION.positioningDefaultLength)
  const length = parseDimensionInput(rawLength)
  if (length === null) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'length',
    }
  }

  const validation = validatePillarParameters({
    mode,
    length,
    offset,
  })
  if (!validation.valid) {
    const issue = validation.issues[0]
    return {
      valid: false,
      messageId: issue?.messageId ?? 'validation.invalid',
      field: pillarModelParameterField(issue?.field),
    }
  }
  return { valid: true, value: validation.value }
}
