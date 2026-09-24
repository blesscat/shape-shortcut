import type { RawParameters } from '../../types'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'
import {
  isOpenGridSnapFootprint,
  isOpenGridSnapMagnetHoleShape,
  parseOpenGridSnapDecimalInput,
  validateModelParameters,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridSnapParameters,
} from '../../../../../cad-contract/units'
import {
  modelParameterFieldFromDiagnostic,
  parseBooleanRawParameter,
} from '../raw-input-parsers'

function parseOpenGridSnapDimension(
  rawValue: string | undefined,
  field: ModelParameterKey,
):
  | { valid: true; value: number }
  | { valid: false; messageId: string; field: ModelParameterKey } {
  const value = rawValue === undefined ? '0' : rawValue
  const parsed = parseOpenGridSnapDecimalInput(value)
  if (parsed === null) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field,
    }
  }
  return { valid: true, value: parsed }
}

export function parseOpenGridSnapRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const variant = raw.variant
  if (variant !== 'Full' && variant !== 'Lite') {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'variant',
    }
  }

  const profile = raw.profile ?? 'Standard'
  if (profile !== 'Standard' && profile !== 'Directional') {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'profile',
    }
  }

  const offset = parseOpenGridSnapDecimalInput(raw.offset ?? '')
  if (offset === null) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'offset',
    }
  }

  const footprint = raw.footprint ?? 'full'
  if (!isOpenGridSnapFootprint(footprint)) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'footprint',
    }
  }

  const fourCornerLocatingHoles = parseBooleanRawParameter(
    raw.fourCornerLocatingHoles,
    'fourCornerLocatingHoles',
  )
  if (!fourCornerLocatingHoles.valid) return fourCornerLocatingHoles

  const centerRemoverHole = parseBooleanRawParameter(
    raw.centerRemoverHole,
    'centerRemoverHole',
  )
  if (!centerRemoverHole.valid) return centerRemoverHole

  const openConnect = parseBooleanRawParameter(raw.openConnect, 'openConnect')
  if (!openConnect.valid) return openConnect

  const legacyTopText = raw.topText ?? 'none'
  const topText = legacyTopText === 'SNAP' ? 'none' : legacyTopText
  if (topText !== 'none') {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'topText',
    }
  }

  const magnetHoleShape = raw.magnetHoleShape ?? 'none'
  if (!isOpenGridSnapMagnetHoleShape(magnetHoleShape)) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'magnetHoleShape',
    }
  }

  const magnetHoleLength = parseOpenGridSnapDimension(
    raw.magnetHoleLength,
    'magnetHoleLength',
  )
  if (!magnetHoleLength.valid) return magnetHoleLength
  const magnetHoleWidth = parseOpenGridSnapDimension(
    raw.magnetHoleWidth,
    'magnetHoleWidth',
  )
  if (!magnetHoleWidth.valid) return magnetHoleWidth
  const magnetHoleDiameter = parseOpenGridSnapDimension(
    raw.magnetHoleDiameter,
    'magnetHoleDiameter',
  )
  if (!magnetHoleDiameter.valid) return magnetHoleDiameter
  const magnetHoleThickness = parseOpenGridSnapDimension(
    raw.magnetHoleThickness,
    'magnetHoleThickness',
  )
  if (!magnetHoleThickness.valid) return magnetHoleThickness

  const validation = validateModelParameters('opengrid-snap', {
    variant,
    profile,
    offset,
    footprint,
    fourCornerLocatingHoles: fourCornerLocatingHoles.value,
    centerRemoverHole: centerRemoverHole.value,
    openConnect: openConnect.value,
    topText,
    magnetHoleShape,
    magnetHoleLength: magnetHoleLength.value,
    magnetHoleWidth: magnetHoleWidth.value,
    magnetHoleDiameter: magnetHoleDiameter.value,
    magnetHoleThickness: magnetHoleThickness.value,
  } satisfies OpenGridSnapParameters)
  if (!validation.valid) {
    const issue = validation.issues[0]
    const field = issue?.field
    return {
      valid: false,
      messageId: issue?.messageId ?? 'validation.invalid',
      field: modelParameterFieldFromDiagnostic(field),
      ...(issue?.params ? { params: issue.params } : {}),
    }
  }
  return { valid: true, value: validation.value.parameters }
}
