import {
  OPENGRID_LABEL_CARD_CONFIGURATION,
  OPENGRID_LABEL_CARD_SCREW_DIAMETERS,
  OPENGRID_LABEL_CARD_SCREW_HEADS,
  OPENGRID_LABEL_CARD_SCREW_LENGTH,
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
  const iconSize = Number(
    raw.iconSize ?? OPENGRID_LABEL_CARD_CONFIGURATION.iconSize.default,
  )
  if (
    !Number.isFinite(iconSize) ||
    iconSize < OPENGRID_LABEL_CARD_CONFIGURATION.iconSize.min ||
    iconSize > OPENGRID_LABEL_CARD_CONFIGURATION.iconSize.max
  ) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'iconSize',
    }
  }
  const screwModeRaw = raw.screwMode
  if (
    screwModeRaw !== undefined &&
    screwModeRaw !== '' &&
    screwModeRaw !== 'true' &&
    screwModeRaw !== 'false'
  ) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'screwMode',
    }
  }
  const screwMode = screwModeRaw === 'true'
  const layout = screwMode ? 'inline' : (raw.layout ?? 'inline')
  if (!screwMode && layout !== 'inline' && layout !== 'stacked') {
    return { valid: false, messageId: 'validation.invalid', field: 'layout' }
  }
  const groupAlign = screwMode ? 'center' : (raw.groupAlign ?? 'center')
  if (
    !screwMode &&
    groupAlign !== 'left' &&
    groupAlign !== 'center' &&
    groupAlign !== 'right'
  ) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'groupAlign',
    }
  }
  const screwHead =
    raw.screwHead ?? OPENGRID_LABEL_CARD_CONFIGURATION.screwMode.defaultHead
  if (
    typeof screwHead !== 'string' ||
    !OPENGRID_LABEL_CARD_SCREW_HEADS.includes(
      screwHead as (typeof OPENGRID_LABEL_CARD_SCREW_HEADS)[number],
    )
  ) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'screwHead',
    }
  }
  const screwDiameter = Number(
    raw.screwDiameter ??
      OPENGRID_LABEL_CARD_CONFIGURATION.screwMode.defaultDiameter,
  )
  if (
    !Number.isFinite(screwDiameter) ||
    !OPENGRID_LABEL_CARD_SCREW_DIAMETERS.includes(screwDiameter)
  ) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'screwDiameter',
    }
  }
  const screwLength = Number(
    raw.screwLength ??
      OPENGRID_LABEL_CARD_CONFIGURATION.screwMode.defaultLength,
  )
  if (
    !Number.isInteger(screwLength) ||
    screwLength < OPENGRID_LABEL_CARD_SCREW_LENGTH.min ||
    screwLength > OPENGRID_LABEL_CARD_SCREW_LENGTH.max
  ) {
    return {
      valid: false,
      messageId: 'validation.invalid',
      field: 'screwLength',
    }
  }
  const normalizedRaw: Record<string, unknown> = {
    gridUnits,
    style,
    textHeight: Number(
      raw.textHeight ??
        (screwMode
          ? OPENGRID_LABEL_CARD_CONFIGURATION.screwMode.textHeight
          : 7),
    ),
    iconPosition: screwMode ? 'left' : (raw.iconPosition ?? 'left'),
    textLine2: screwMode ? '' : (raw.textLine2 ?? ''),
    textAlignment: screwMode ? 'center' : (raw.textAlignment ?? 'center'),
    textLine2Alignment: screwMode
      ? 'center'
      : (raw.textLine2Alignment ?? 'center'),
    layout,
    groupAlign,
    iconSize,
    screwMode,
    screwHead,
    screwDiameter,
    screwLength,
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
