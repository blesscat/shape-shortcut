import {
  GAME_BOX_CONFIGURATION,
  GAME_BOX_MODULE_INDICES,
  GAME_BOX_PARAMETER_KEYS,
  gameBoxModuleDiceSizeKey,
  gameBoxModuleTypeKey,
  parseDimensionInput,
  parseHalfStepInput,
  validateModelParameters,
  type GameBoxModuleType,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../../../cad-contract/units'
import type { DiagnosticParams } from '../../../../../cad-contract/diagnostics'
import type { RawParameters } from '../../types'
import { modelParameterFieldFromDiagnostic } from '../raw-input-parsers'

/**
 * Game-box raw parameters mix the part and module type enums with plain
 * dimensions, so the numeric generic parser cannot handle them: the enums
 * stay raw strings and the numbers go through the shared parsers. The six
 * module groups are generated from the contract key list instead of being
 * spelled out one by one.
 */
export function parseGameBoxRawParameters(raw: RawParameters):
  | { valid: true; value: ModelParameterValues }
  | {
      valid: false
      messageId: string
      field?: ModelParameterKey
      params?: DiagnosticParams
    } {
  const parsed: Record<string, number | string> = {}
  for (const key of GAME_BOX_PARAMETER_KEYS) {
    const rawValue = raw[key]
    if (key === 'part') {
      parsed[key] = rawValue ?? GAME_BOX_CONFIGURATION.defaults.part
      continue
    }
    const moduleIndex = GAME_BOX_MODULE_INDICES.find(
      (index) => gameBoxModuleTypeKey(index) === key,
    )
    if (moduleIndex !== undefined) {
      const fallback: GameBoxModuleType =
        moduleIndex === 1 ? GAME_BOX_CONFIGURATION.defaults.moduleType : 'none'
      parsed[key] = rawValue ?? fallback
      continue
    }
    parsed[key] = parseGameBoxNumber(key, rawValue)
  }

  const validation = validateModelParameters('game-box', parsed)
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

/** Dice sizes carry a half millimetre step; every other value is whole. */
function parseGameBoxNumber(
  key: ModelParameterKey,
  rawValue: string | undefined,
): number {
  const text = rawValue ?? ''
  const isDiceSize = GAME_BOX_MODULE_INDICES.some(
    (index) => gameBoxModuleDiceSizeKey(index) === key,
  )
  const parsed = isDiceSize
    ? parseHalfStepInput(text)
    : parseDimensionInput(text)
  return parsed ?? Number.NaN
}
