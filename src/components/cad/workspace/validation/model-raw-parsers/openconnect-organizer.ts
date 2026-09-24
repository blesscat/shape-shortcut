import type { RawParameters } from '../../types'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'
import {
  OPENCONNECT_ALIGNMENT_KEYS,
  isOpenConnectHorizontalAlignment,
  isOpenConnectVerticalAlignment,
} from '../../../../../cad-contract/units/openconnect-alignment'
import {
  parseDimensionInput,
  parseFiniteDecimalInput,
  validateModelParameters,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../../../../cad-contract/units'
import { OPENGRID_OPENCONNECT_ORGANIZER_PARAMETER_KEYS } from '../model-parameter-keys'
import { modelParameterFieldFromDiagnostic } from '../raw-input-parsers'

export function parseOpenGridOpenConnectOrganizerRawParameters(
  raw: RawParameters,
):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const invalid = (field: ModelParameterKey) => ({
    valid: false as const,
    messageId: 'validation.invalid',
    field,
  })
  const missingField = OPENGRID_OPENCONNECT_ORGANIZER_PARAMETER_KEYS.find(
    (field) =>
      !OPENCONNECT_ALIGNMENT_KEYS.includes(
        field as (typeof OPENCONNECT_ALIGNMENT_KEYS)[number],
      ) && raw[field] === undefined,
  )
  if (missingField) return invalid(missingField)

  const holeCountX = parseDimensionInput(raw.holeCountX ?? '')
  if (holeCountX === null) return invalid('holeCountX')
  const holeCountY = parseDimensionInput(raw.holeCountY ?? '')
  if (holeCountY === null) return invalid('holeCountY')

  const holeSpacingMode = raw.holeSpacingMode
  if (holeSpacingMode !== 'linked' && holeSpacingMode !== 'independent') {
    return invalid('holeSpacingMode')
  }
  const holeSpacingX = parseFiniteDecimalInput(raw.holeSpacingX ?? '')
  if (holeSpacingX === null) return invalid('holeSpacingX')
  const holeSpacingY = parseFiniteDecimalInput(raw.holeSpacingY ?? '')
  if (holeSpacingY === null) return invalid('holeSpacingY')

  const holeShape = raw.holeShape
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

  const holeDiameter = parseFiniteDecimalInput(raw.holeDiameter ?? '')
  if (holeDiameter === null) return invalid('holeDiameter')
  const holeWidth = parseFiniteDecimalInput(raw.holeWidth ?? '')
  if (holeWidth === null) return invalid('holeWidth')
  const holeHeight = parseFiniteDecimalInput(raw.holeHeight ?? '')
  if (holeHeight === null) return invalid('holeHeight')
  const holeCornerRadius = parseFiniteDecimalInput(raw.holeCornerRadius ?? '')
  if (holeCornerRadius === null) return invalid('holeCornerRadius')
  const holeDepth = parseFiniteDecimalInput(raw.holeDepth ?? '')
  if (holeDepth === null) return invalid('holeDepth')
  const bottomThickness = parseFiniteDecimalInput(raw.bottomThickness ?? '')
  if (bottomThickness === null) return invalid('bottomThickness')
  const edgeThickness = parseFiniteDecimalInput(raw.edgeThickness ?? '')
  if (edgeThickness === null) return invalid('edgeThickness')
  const tiltAngle = parseFiniteDecimalInput(raw.tiltAngle ?? '')
  if (tiltAngle === null) return invalid('tiltAngle')
  const topRimEnabled = raw.topRimEnabled === 'true'
  const topRimHeight = parseDimensionInput(raw.topRimHeight ?? '')
  if (topRimHeight === null) return invalid('topRimHeight')

  const horizontalAlignment = raw.openConnectHorizontalAlignment ?? 'center'
  const verticalAlignment = raw.openConnectVerticalAlignment ?? 'top'
  if (!isOpenConnectHorizontalAlignment(horizontalAlignment))
    return invalid('openConnectHorizontalAlignment')
  if (!isOpenConnectVerticalAlignment(verticalAlignment))
    return invalid('openConnectVerticalAlignment')

  const parameters: OpenGridOpenConnectOrganizerParameters = {
    openConnectHorizontalAlignment: horizontalAlignment,
    openConnectVerticalAlignment: verticalAlignment,
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
    edgeThickness,
    tiltAngle,
    topRimEnabled,
    topRimHeight,
  }
  const validation = validateModelParameters(
    'opengrid-openconnect-organizer',
    parameters,
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
