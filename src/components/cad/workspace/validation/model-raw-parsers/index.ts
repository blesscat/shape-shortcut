import type { RawParameters } from '../../types'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'
import { TISSUE_BOX_ALIGNMENT_DEFAULTS } from '../../../../../cad-contract/units/opengrid-openconnect-tissue-box'
import {
  HEXAGONAL_COLUMN_CONFIGURATION,
  legacyInnerDiameterFor,
  parseDimensionInput,
  parseFiniteDecimalInput,
  parseHalfStepInput,
  validateModelParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../../../cad-contract/units'
import {
  legacyNumericDefault,
  legacyParameterDefault,
  parameterKeysForModel,
  usesHalfStepInput,
} from '../model-parameter-keys'
import {
  modelParameterFieldFromDiagnostic,
  parseSeatModeRawParameter,
} from '../raw-input-parsers'
import { parseOpenGridDividerRawParameters } from './divider'
import { parseOpenGridOpenConnectOrganizerRawParameters } from './openconnect-organizer'
import { parseOpenGridOrganizerBoxRawParameters } from './organizer-box'
import { parsePillarRawParameters } from './pillar'
import { parseOpenGridSnapRawParameters } from './snap'
import { withStackableBoxLegacyModeRawParameters } from './stackable-box'
import {
  parseSnapRemoverRawParameters,
  parseWallCoverRawParameters,
} from './wall-cover'

export function parseRawParameters(
  raw: RawParameters,
  modelId: ModelId = 'box',
):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  if (modelId === 'opengrid-stackable-box') {
    raw = withStackableBoxLegacyModeRawParameters(raw)
  }
  if (
    modelId === 'opengrid-snap-remover' ||
    modelId === 'opengrid-wall-cover'
  ) {
    if (modelId === 'opengrid-wall-cover') {
      return parseWallCoverRawParameters(raw)
    }
    return parseSnapRemoverRawParameters()
  }

  const keys = parameterKeysForModel(modelId)
  const legacyAliases =
    modelId === 'opengrid-stackable-cylinder'
      ? (['diameter', 'thinBottomMode'] as const)
      : modelId === 'opengrid-divider'
        ? // Retired target box grid counts must keep parsing so legacy
          // snapshots migrate to the wall-grid length instead of rejecting.
          (['targetBoxGridsX', 'targetBoxGridsY'] as const)
        : []
  const unexpectedKey = Object.keys(raw).find(
    (key) =>
      !keys.includes(key as ModelParameterKey) &&
      !legacyAliases.includes(key as never),
  )
  if (unexpectedKey) {
    return { valid: false, messageId: 'validation.invalid' }
  }

  if (
    modelId === 'opengrid-stackable-cylinder' &&
    raw.innerDiameter === undefined
  ) {
    const legacyInnerDiameter = legacyInnerDiameterFor(
      raw as unknown as Record<string, unknown>,
    )
    if (legacyInnerDiameter !== undefined) {
      raw = {
        ...raw,
        innerDiameter: String(legacyInnerDiameter),
      } as RawParameters
    }
  }

  if (modelId === 'opengrid-pillar') {
    return parsePillarRawParameters(raw)
  }

  if (modelId === 'opengrid-snap') {
    return parseOpenGridSnapRawParameters(raw)
  }

  if (modelId === 'opengrid-organizer-box') {
    return parseOpenGridOrganizerBoxRawParameters(raw)
  }

  if (modelId === 'opengrid-openconnect-organizer') {
    return parseOpenGridOpenConnectOrganizerRawParameters(raw)
  }

  if (modelId === 'opengrid-divider') {
    return parseOpenGridDividerRawParameters(raw)
  }

  const parsed: Partial<
    Record<ModelParameterKey, number | string | boolean | null>
  > = {}
  for (const key of keys) {
    if (key === 'mode') {
      const mode = raw.mode
      if (mode !== 'standard' && mode !== 'thin-shell') {
        return {
          valid: false,
          messageId: 'validation.invalid',
          field: 'mode',
        }
      }
      parsed.mode = mode
      continue
    }
    if (key === 'cornerSeatMode' || key === 'bottomSeatMode') {
      const seatMode = parseSeatModeRawParameter(raw[key], key)
      if (!seatMode.valid) return seatMode
      parsed[key] = seatMode.value
      continue
    }
    if (
      key === 'openConnectHorizontalAlignment' ||
      key === 'openConnectVerticalAlignment'
    ) {
      let fallback: string =
        key === 'openConnectHorizontalAlignment' ? 'center' : 'top'
      if (modelId === 'opengrid-openconnect-tissue-box')
        fallback = TISSUE_BOX_ALIGNMENT_DEFAULTS[key]
      parsed[key] = raw[key] ?? fallback
      continue
    }
    if (key === 'topRimMode' || key === 'bottomMode') {
      const allowed: readonly string[] =
        key === 'topRimMode'
          ? ['stacking-rail', 'flat-top']
          : ['stacking', 'thin-shell', 'none']
      const rawValue = raw[key] ?? legacyParameterDefault(modelId, key) ?? ''
      if (modelId !== 'opengrid-stackable-box' || !allowed.includes(rawValue)) {
        return {
          valid: false,
          messageId: 'validation.invalid',
          field: key,
        }
      }
      parsed[key] = rawValue
      continue
    }
    if (
      key === 'fullBottomHoleGrid' ||
      key === 'bottomPlateMode' ||
      key === 'honeycombMode' ||
      key === 'topRimEnabled'
    ) {
      const rawValue = raw[key] ?? legacyParameterDefault(modelId, key)
      if (rawValue !== 'true' && rawValue !== 'false') {
        return {
          valid: false,
          messageId: 'validation.invalid',
          field: key,
        }
      }
      parsed[key] = rawValue === 'true'
      continue
    }
    if (key === 'orientation') {
      parsed[key] =
        raw[key] ?? HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation
      continue
    }
    const rawValue =
      raw[key] ??
      legacyParameterDefault(modelId, key) ??
      legacyNumericDefault(modelId, key) ??
      ''
    if (modelId === 'opengrid-openconnect-tissue-box') {
      parsed[key] = parseFiniteDecimalInput(rawValue)
      continue
    }
    parsed[key] = usesHalfStepInput(modelId, key)
      ? parseHalfStepInput(rawValue)
      : parseDimensionInput(rawValue)
  }

  const validation = validateModelParameters(modelId, parsed)
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
