import { describe, expect, it } from 'vitest'
import {
  GAME_BOX_CONFIGURATION,
  gameBoxStorageDepth,
  validateGameBoxParameters,
  type GameBoxParameters,
} from '../../src/cad-contract/units'
import { gameBoxDefinition } from '../../src/features/cad/model-catalog/components/game-box'
import { resolvePresetParameters } from '../../src/features/cad/model-catalog/presets'
import type { ModelPreset } from '../../src/features/cad/model-catalog'
import { translate } from '../../src/i18n'

/**
 * The seven card size presets as literals. The ids, their order and the card
 * sizes are a product decision, so a change to any of them has to be a
 * deliberate edit of this list as well.
 */
const EXPECTED_PRESETS = [
  { id: 'tarot-70x120', cardWidth: 70, cardHeight: 120 },
  { id: 'standard-tcg-63x88', cardWidth: 63, cardHeight: 88 },
  { id: 'standard-tcg-sleeved-66x91', cardWidth: 66, cardHeight: 91 },
  { id: 'japanese-small-59x86', cardWidth: 59, cardHeight: 86 },
  { id: 'japanese-small-sleeved-62x89', cardWidth: 62, cardHeight: 89 },
  { id: 'mini-american-41x63', cardWidth: 41, cardHeight: 63 },
  { id: 'mini-euro-44x68', cardWidth: 44, cardHeight: 68 },
] as const

const PRESETS = gameBoxDefinition.presets ?? []

/** The card size a preset overrides. */
function cardSize(preset: ModelPreset): {
  cardWidth: number
  cardHeight: number
} {
  const overrides = preset.overrides as Partial<GameBoxParameters>
  return {
    cardWidth: overrides.cardWidth ?? Number.NaN,
    cardHeight: overrides.cardHeight ?? Number.NaN,
  }
}

/** The resolved parameters of a preset, or null when the preset is rejected. */
function resolvedParameters(preset: ModelPreset): GameBoxParameters | null {
  const resolved = resolvePresetParameters(gameBoxDefinition, preset)
  if (!resolved.ok) return null
  return resolved.parameters as GameBoxParameters
}

describe('game-box card size presets', () => {
  it('declares the seven card size presets in order', () => {
    expect(
      PRESETS.map((preset) => ({ id: preset.id, ...cardSize(preset) })),
    ).toEqual(EXPECTED_PRESETS)
  })

  it('overrides only the card size', () => {
    for (const preset of PRESETS) {
      expect(Object.keys(preset.overrides).sort()).toEqual([
        'cardHeight',
        'cardWidth',
      ])
    }
  })

  it('labels every preset in both locales', () => {
    for (const preset of PRESETS) {
      expect(preset.labelKey.startsWith('cad.presets.game-box.')).toBe(true)
      for (const locale of ['zh-Hant', 'en'] as const) {
        expect(translate(locale, preset.labelKey)).not.toContain('⟦')
      }
    }
  })

  it('validates every preset against the game-box contract', () => {
    for (const preset of PRESETS) {
      const parameters = resolvedParameters(preset)
      expect(parameters, `preset ${preset.id}`).not.toBeNull()
      if (!parameters) continue
      const validation = validateGameBoxParameters(parameters)
      expect(validation.valid, `preset ${preset.id}`).toBe(true)
    }
  })

  it('resets every other parameter to the definition defaults', () => {
    for (const preset of PRESETS) {
      const parameters = resolvedParameters(preset)
      expect(parameters, `preset ${preset.id}`).not.toBeNull()
      if (!parameters) continue
      const size = cardSize(preset)
      expect(parameters).toEqual({
        ...GAME_BOX_CONFIGURATION.defaultParameters,
        cardWidth: size.cardWidth,
        cardHeight: size.cardHeight,
      })
    }
  })

  it('returns the derived storage depth to the default depth', () => {
    for (const preset of PRESETS) {
      const parameters = resolvedParameters(preset)
      expect(parameters, `preset ${preset.id}`).not.toBeNull()
      if (!parameters) continue
      const depth = gameBoxStorageDepth(parameters)
      // The preset resets the module list, so the derived depth is the depth
      // of the default module list.
      expect(depth).toBe(
        gameBoxStorageDepth(GAME_BOX_CONFIGURATION.defaultParameters),
      )
      // The specification pins that default depth at 63 mm.
      expect(depth).toBe(63)
    }
  })
})
