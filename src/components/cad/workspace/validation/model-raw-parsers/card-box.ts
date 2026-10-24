import {
  parseDimensionInput,
  validateModelParameters,
  type ModelParameterValues,
} from '../../../../../cad-contract/units'
import type { RawParameters } from '../../types'

const CARD_BOX_TEXT_KEYS: Record<string, true> = {
  dividerText: true,
  coverTitle: true,
  coverSubtitle: true,
  coverSvgFingerprint: true,
}

const CARD_BOX_ENUM_KEYS: Record<string, true> = {
  part: true,
  dividerTabPosition: true,
  dividerStyle: true,
  coverStyle: true,
}

const CARD_BOX_BOOLEAN_KEYS: Record<string, true> = {
  usesCoverSvg: true,
}

/**
 * Card-box raw parameters mix dimensions with free text and enums, so the
 * numeric generic parser cannot handle them: strings stay raw, booleans come
 * in as 'true'/'false', and numbers go through the shared finite parser.
 */
export function parseCardBoxRawParameters(
  raw: RawParameters,
):
  | { valid: true; value: ModelParameterValues }
  | { valid: false; messageId: string } {
  const parsed: Record<string, number | string | boolean> = {}
  for (const [key, rawValue] of Object.entries(raw)) {
    if (CARD_BOX_TEXT_KEYS[key] || CARD_BOX_ENUM_KEYS[key]) {
      parsed[key] = rawValue ?? ''
      continue
    }
    if (CARD_BOX_BOOLEAN_KEYS[key]) {
      parsed[key] = rawValue === 'true'
      continue
    }
    parsed[key] = parseDimensionInput(rawValue ?? '') ?? Number.NaN
  }
  const validation = validateModelParameters('card-box', parsed)
  if (!validation.valid) {
    return {
      valid: false,
      messageId: validation.issues[0]?.messageId ?? 'validation.invalid',
    }
  }
  return { valid: true, value: validation.value.parameters }
}
