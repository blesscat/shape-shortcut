import { describe, expect, it } from 'vitest'
import {
  GAME_BOX_CONFIGURATION,
  gameBoxStorageDepth,
  validateGameBoxParameters,
  type GameBoxParameters,
} from '../../src/cad-contract/units'
import { gameBoxDefinition } from '../../src/features/cad/model-catalog/components/game-box'
import {
  presetNotApplicableMessageKey,
  resolvePresetParameters,
} from '../../src/features/cad/model-catalog/presets'
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

/** A module list the user has built up: a dice module and a second card module. */
const CURRENT_WITH_MODULES: GameBoxParameters = {
  ...GAME_BOX_CONFIGURATION.defaultParameters,
  module2Type: 'dice',
  module2CardDepth: 20,
  module2DiceSize: 14,
  module2DiceCount: 6,
  module3Type: 'cards',
  module3CardDepth: 18,
  part: 'box',
} as GameBoxParameters

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
function resolvedParameters(
  preset: ModelPreset,
  currentParameters?: GameBoxParameters,
): GameBoxParameters | null {
  const resolved = resolvePresetParameters(
    gameBoxDefinition,
    preset,
    currentParameters,
  )
  if (!resolved.ok) return null
  return resolved.parameters as GameBoxParameters
}

/** The preset with the given id. */
function presetById(presetId: string): ModelPreset {
  const preset = PRESETS.find((candidate) => candidate.id === presetId)
  if (!preset) throw new Error(`The preset ${presetId} does not exist`)
  return preset
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

  it('keeps the module list and changes only the card size', () => {
    const preset = presetById('standard-tcg-63x88')
    const parameters = resolvedParameters(preset, CURRENT_WITH_MODULES)
    expect(parameters).not.toBeNull()
    if (!parameters) return
    expect(parameters).toEqual({
      ...CURRENT_WITH_MODULES,
      cardWidth: 63,
      cardHeight: 88,
    })
  })

  it('keeps the selected part while it still exists', () => {
    const preset = presetById('standard-tcg-63x88')
    const current = {
      ...CURRENT_WITH_MODULES,
      part: 'module2',
    } as GameBoxParameters
    const parameters = resolvedParameters(preset, current)
    expect(parameters).not.toBeNull()
    if (!parameters) return
    expect(parameters.part).toBe('module2')
  })

  it('does not apply a preset that does not fit the current modules', () => {
    const preset = presetById('mini-american-41x63')
    const current = {
      ...GAME_BOX_CONFIGURATION.defaultParameters,
      module2Type: 'dice',
      module2CardDepth: 20,
      module2DiceSize: 16,
      module2DiceCount: 9,
    } as GameBoxParameters
    // Nine dice of 16 mm do not fit a 41 × 63 mm card.
    expect(resolvedParameters(preset, current)).toBeNull()
    // The current parameters are left untouched.
    expect(current.module2Type).toBe('dice')
    expect(current.cardWidth).toBe(70)
  })

  it('offers a localized message when a preset does not fit', () => {
    const key = presetNotApplicableMessageKey(gameBoxDefinition)
    expect(key).toBe('cad.presets.game-box.notApplicable')
    for (const locale of ['zh-Hant', 'en'] as const) {
      expect(translate(locale, key)).not.toContain('⟦')
    }
  })

  it('keeps the derived storage depth of the module list', () => {
    const preset = presetById('standard-tcg-63x88')
    const parameters = resolvedParameters(preset, CURRENT_WITH_MODULES)
    expect(parameters).not.toBeNull()
    if (!parameters) return
    expect(gameBoxStorageDepth(parameters)).toBe(
      gameBoxStorageDepth(CURRENT_WITH_MODULES),
    )
  })
})
