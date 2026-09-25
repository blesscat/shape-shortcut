import type { RawParameters } from '../../types'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  parseDimensionInput,
  parseFiniteDecimalInput,
  parseHalfStepInput,
  validateModelParameters,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridDividerParameters,
} from '../../../../../cad-contract/units'
import { legacyParameterDefault } from '../model-parameter-keys'
import { modelParameterFieldFromDiagnostic } from '../raw-input-parsers'

export function parseOpenGridDividerRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const defaults = OPENGRID_DIVIDER_CONFIGURATION.defaultParameters
  const invalid = (field: ModelParameterKey) => ({
    valid: false as const,
    messageId: 'validation.invalid',
    field,
  })

  const parsed: Record<string, unknown> = {}
  for (const key of ['left', 'right', 'up', 'down'] as const) {
    const value = parseHalfStepInput(raw[key] ?? String(defaults[key]))
    if (value === null) return invalid(key)
    parsed[key] = value
  }
  const height = parseDimensionInput(raw.height ?? String(defaults.height))
  if (height === null) return invalid('height')
  parsed.height = height
  const wallThickness = parseDimensionInput(
    raw.wallThickness ?? String(defaults.wallThickness),
  )
  if (wallThickness === null) return invalid('wallThickness')
  parsed.wallThickness = wallThickness

  const alignmentMode = raw.alignmentMode ?? String(defaults.alignmentMode)
  if (alignmentMode !== 'free' && alignmentMode !== 'box-fit') {
    return invalid('alignmentMode')
  }
  parsed.alignmentMode = alignmentMode
  // Snapshots saved before the wall length existed may still carry the retired
  // targetBoxGridsX/Y keys; the raw parse simply no longer reads them.
  if (raw.boxFitWallGrids === undefined) {
    // Snapshots saved before box-fit carried its wall length in the
    // directional arm counts; migrate the longer axis sum, otherwise fall
    // back to the definition default.
    parsed.boxFitWallGrids =
      alignmentMode === 'box-fit'
        ? Math.max(
            (parsed.left as number) + (parsed.right as number),
            (parsed.up as number) + (parsed.down as number),
          )
        : defaults.boxFitWallGrids
  } else {
    const value = parseHalfStepInput(raw.boxFitWallGrids)
    if (value === null) return invalid('boxFitWallGrids')
    parsed.boxFitWallGrids = value
  }
  const endClearance = parseFiniteDecimalInput(
    raw.endClearance ?? String(defaults.endClearance),
  )
  if (endClearance === null) return invalid('endClearance')
  parsed.endClearance = endClearance
  const pegLengthMode = raw.pegLengthMode ?? String(defaults.pegLengthMode)
  if (
    pegLengthMode !== 'snap' &&
    pegLengthMode !== 'thin-shell' &&
    pegLengthMode !== 'stackable'
  ) {
    return invalid('pegLengthMode')
  }
  parsed.pegLengthMode = pegLengthMode
  const pegDiameterIncrement = parseFiniteDecimalInput(
    raw.pegDiameterIncrement ?? String(defaults.pegDiameterIncrement),
  )
  if (pegDiameterIncrement === null) return invalid('pegDiameterIncrement')
  parsed.pegDiameterIncrement = pegDiameterIncrement
  const honeycombMode =
    raw.honeycombMode ??
    legacyParameterDefault('opengrid-divider', 'honeycombMode')
  if (honeycombMode !== 'true' && honeycombMode !== 'false') {
    return invalid('honeycombMode')
  }
  parsed.honeycombMode = honeycombMode === 'true'
  const topRimEnabled =
    raw.topRimEnabled ??
    legacyParameterDefault('opengrid-divider', 'topRimEnabled')
  if (topRimEnabled !== 'true' && topRimEnabled !== 'false') {
    return invalid('topRimEnabled')
  }
  parsed.topRimEnabled = topRimEnabled === 'true'
  const topRimHeight = parseDimensionInput(
    raw.topRimHeight ?? String(defaults.topRimHeight),
  )
  if (topRimHeight === null) return invalid('topRimHeight')
  parsed.topRimHeight = topRimHeight

  const validation = validateModelParameters(
    'opengrid-divider',
    parsed as OpenGridDividerParameters,
  )
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
