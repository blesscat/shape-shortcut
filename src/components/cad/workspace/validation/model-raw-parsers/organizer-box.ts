import type { RawParameters } from '../../types'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'
import {
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  parseDimensionInput,
  parseHalfStepInput,
  validateModelParameters,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridOrganizerBoxParameters,
} from '../../../../../cad-contract/units'
import { legacyParameterDefault } from '../model-parameter-keys'
import { modelParameterFieldFromDiagnostic } from '../raw-input-parsers'

export function parseOpenGridOrganizerBoxRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const defaults = OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS

  const countFor = (field: 'holeCountX' | 'holeCountY'): number | null =>
    parseDimensionInput(raw[field] ?? String(defaults[field]))
  const decimalFor = (
    field:
      | 'holeSpacingX'
      | 'holeSpacingY'
      | 'holeDiameter'
      | 'holeWidth'
      | 'holeHeight'
      | 'holeCornerRadius'
      | 'holeDepth'
      | 'bottomThickness'
      | 'wallThickness'
      | 'stackingClearanceHeight',
    fallback: number,
  ): number | null => parseHalfStepInput(raw[field] ?? String(fallback))
  const invalid = (field: ModelParameterKey) => ({
    valid: false as const,
    messageId: 'validation.invalid',
    field,
  })

  const requiredFields = [
    'holeCountX',
    'holeCountY',
    'holeSpacingMode',
    'holeSpacingX',
    'holeSpacingY',
    'holeShape',
    'holeDiameter',
    'holeWidth',
    'holeHeight',
    'holeCornerRadius',
    'holeDepth',
    'bottomThickness',
    'wallThickness',
    'cornerSeatMode',
    'boxMode',
    'stackingClearanceHeight',
  ] as const
  const missingField = requiredFields.find((field) => raw[field] === undefined)
  if (missingField) return invalid(missingField)

  const holeCountX = countFor('holeCountX')
  if (holeCountX === null) return invalid('holeCountX')
  const holeCountY = countFor('holeCountY')
  if (holeCountY === null) return invalid('holeCountY')

  const holeSpacingMode = raw.holeSpacingMode ?? defaults.holeSpacingMode
  if (holeSpacingMode !== 'linked' && holeSpacingMode !== 'independent') {
    return invalid('holeSpacingMode')
  }
  const holeSpacingX = decimalFor('holeSpacingX', defaults.holeSpacingX)
  if (holeSpacingX === null) return invalid('holeSpacingX')
  const holeSpacingY = decimalFor(
    'holeSpacingY',
    holeSpacingMode === 'linked' ? holeSpacingX : defaults.holeSpacingY,
  )
  if (holeSpacingY === null) return invalid('holeSpacingY')

  const holeShape = raw.holeShape ?? defaults.holeShape
  if (
    holeShape !== 'circle' &&
    holeShape !== 'triangle' &&
    holeShape !== 'square' &&
    holeShape !== 'pentagon' &&
    holeShape !== 'hexagon' &&
    holeShape !== 'rectangle' &&
    holeShape !== 'ellipse'
  ) {
    return invalid('holeShape')
  }
  const holeDiameter = decimalFor('holeDiameter', defaults.holeDiameter)
  if (holeDiameter === null) return invalid('holeDiameter')
  const holeWidth = decimalFor('holeWidth', defaults.holeWidth)
  if (holeWidth === null) return invalid('holeWidth')
  const holeHeight = decimalFor('holeHeight', defaults.holeHeight)
  if (holeHeight === null) return invalid('holeHeight')
  const holeCornerRadius = decimalFor(
    'holeCornerRadius',
    defaults.holeCornerRadius,
  )
  if (holeCornerRadius === null) return invalid('holeCornerRadius')
  const holeDepth = decimalFor('holeDepth', defaults.holeDepth)
  if (holeDepth === null) return invalid('holeDepth')
  const bottomThickness = decimalFor(
    'bottomThickness',
    defaults.bottomThickness,
  )
  if (bottomThickness === null) return invalid('bottomThickness')
  const wallThickness = decimalFor('wallThickness', defaults.wallThickness)
  if (wallThickness === null) return invalid('wallThickness')

  const cornerSeatMode = raw.cornerSeatMode ?? defaults.cornerSeatMode
  if (
    cornerSeatMode !== 'none' &&
    cornerSeatMode !== 'detachable-corner-seat' &&
    cornerSeatMode !== 'integrated'
  ) {
    return invalid('cornerSeatMode')
  }

  const boxMode = raw.boxMode ?? defaults.boxMode
  if (boxMode !== 'normal' && boxMode !== 'stackable') {
    return invalid('boxMode')
  }

  const stackingClearanceHeight = decimalFor(
    'stackingClearanceHeight',
    defaults.stackingClearanceHeight,
  )
  if (stackingClearanceHeight === null) {
    return invalid('stackingClearanceHeight')
  }
  const topRimEnabled =
    raw.topRimEnabled ??
    legacyParameterDefault('opengrid-organizer-box', 'topRimEnabled')
  if (topRimEnabled !== 'true' && topRimEnabled !== 'false') {
    return invalid('topRimEnabled')
  }
  const topRimHeight = parseHalfStepInput(
    raw.topRimHeight ?? String(defaults.topRimHeight),
  )
  if (topRimHeight === null) return invalid('topRimHeight')

  const validation = validateModelParameters('opengrid-organizer-box', {
    holeCountX,
    holeCountY,
    holeSpacingMode,
    holeSpacingX,
    holeSpacingY,
    holeShape,
    holeDiameter,
    holeWidth,
    holeHeight,
    holeCornerRadius,
    holeDepth,
    bottomThickness,
    wallThickness,
    cornerSeatMode,
    boxMode,
    stackingClearanceHeight,
    topRimEnabled: topRimEnabled === 'true',
    topRimHeight,
  })
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
