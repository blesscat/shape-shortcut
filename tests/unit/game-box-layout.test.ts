import { describe, expect, it } from 'vitest'
import {
  GAME_BOX_CONFIGURATION,
  gameBoxCardsModuleLength,
  gameBoxDiceCapacity,
  gameBoxDiceHolderThickness,
  gameBoxDiceLayout,
  gameBoxDiceModuleLength,
  gameBoxLayout,
  gameBoxModuleCardDepthKey,
  gameBoxModuleDiceCountKey,
  gameBoxModuleDiceSizeKey,
  gameBoxModuleTypeKey,
  gameBoxStorageDepth,
  validateGameBoxParameters,
  type GameBoxModuleIndex,
  type GameBoxModuleType,
  type GameBoxParameters,
} from '../../src/cad-contract/units'

type ModuleSpec = {
  type: GameBoxModuleType
  cardDepth?: number
  diceSize?: number
  diceCount?: number
}

function moduleOverrides(modules: readonly ModuleSpec[]): {
  [key: string]: unknown
} {
  const overrides: { [key: string]: unknown } = {}
  modules.forEach((module, position) => {
    const index = (position + 1) as GameBoxModuleIndex
    overrides[gameBoxModuleTypeKey(index)] = module.type
    if (module.cardDepth !== undefined) {
      overrides[gameBoxModuleCardDepthKey(index)] = module.cardDepth
    }
    if (module.diceSize !== undefined) {
      overrides[gameBoxModuleDiceSizeKey(index)] = module.diceSize
    }
    if (module.diceCount !== undefined) {
      overrides[gameBoxModuleDiceCountKey(index)] = module.diceCount
    }
  })
  return overrides
}

function parameters(
  modules: readonly ModuleSpec[],
  extra: { [key: string]: unknown } = {},
): GameBoxParameters {
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    ...moduleOverrides(modules),
    ...extra,
  } as GameBoxParameters
}

describe('game-box module lengths', () => {
  it('computes a card module from the card depth, the clearance and the plate', () => {
    expect(gameBoxCardsModuleLength(30)).toBeCloseTo(31.85, 6)
    expect(gameBoxCardsModuleLength(60)).toBeCloseTo(61.85, 6)
    expect(gameBoxCardsModuleLength(3)).toBeCloseTo(4.85, 6)
  })

  it('never rounds a card module up to a whole slot', () => {
    for (const cardDepth of [3, 17, 30, 60, 149]) {
      const length = gameBoxCardsModuleLength(cardDepth)
      expect(length).toBeGreaterThan(cardDepth)
      // The length is the card depth plus a fixed clearance and the share of
      // the divider plate, so it never grows in steps.
      expect(length - cardDepth).toBeCloseTo(
        GAME_BOX_CONFIGURATION.cardsModuleClearance +
          GAME_BOX_CONFIGURATION.dividerPlateThickness,
        6,
      )
    }
  })

  it('computes the holder thickness from the die and the two thin walls', () => {
    expect(gameBoxDiceHolderThickness(16)).toBeCloseTo(18.2, 6)
    expect(gameBoxDiceHolderThickness(8)).toBeCloseTo(10.2, 6)
    expect(gameBoxDiceHolderThickness(30)).toBeCloseTo(32.2, 6)
  })

  it('computes a dice module from the holder, the gaps and the plate', () => {
    expect(gameBoxDiceModuleLength(16)).toBeCloseTo(19.65, 6)
    expect(gameBoxDiceModuleLength(8)).toBeCloseTo(11.65, 6)
    expect(gameBoxDiceModuleLength(30)).toBeCloseTo(33.65, 6)
  })
})

describe('game-box storage depth', () => {
  it('derives the depth of a single card module from its length', () => {
    const layout = gameBoxLayout(parameters([{ type: 'cards', cardDepth: 30 }]))
    expect(layout.storageDepth).toBeCloseTo(31.85, 6)
    expect(layout.modules).toHaveLength(1)
    expect(layout.modules[0]?.length).toBeCloseTo(31.85, 6)
  })

  it('adds up the lengths of a card, a dice and a card module', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ]),
    )
    expect(layout.storageDepth).toBeCloseTo(73.35, 6)
    expect(layout.modules.map((module) => module.length)).toEqual([
      expect.closeTo(31.85, 6),
      expect.closeTo(19.65, 6),
      expect.closeTo(21.85, 6),
    ])
    expect(layout.dividerCount).toBe(2)
  })

  it('puts a divider on every module boundary', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ]),
    )
    expect(layout.dividerCenters[0]).toBeCloseTo(31.85, 6)
    expect(layout.dividerCenters[1]).toBeCloseTo(51.5, 6)
  })

  it('does not round the depth up to a whole slot', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ]),
    )
    expect(layout.storageDepth % 3).toBeCloseTo(1.35, 6)
  })

  it('keeps the depth of the default module list', () => {
    expect(gameBoxStorageDepth(GAME_BOX_CONFIGURATION.defaultParameters)).toBe(
      gameBoxCardsModuleLength(
        GAME_BOX_CONFIGURATION.defaults.firstModuleCardDepth,
      ),
    )
  })

  it('ignores the fields of disabled modules', () => {
    const active = parameters([
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
    ])
    const withInactiveFields = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'none' },
      ],
      {
        [gameBoxModuleDiceSizeKey(3)]: 22,
        [gameBoxModuleDiceCountKey(3)]: 40,
      },
    )
    expect(gameBoxStorageDepth(withInactiveFields)).toBe(
      gameBoxStorageDepth(active),
    )
    expect(gameBoxLayout(withInactiveFields).modules).toEqual(
      gameBoxLayout(active).modules,
    )
  })

  it('ignores the dice fields of a card module', () => {
    const active = parameters([
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
    ])
    const withInactiveFields = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      {
        [gameBoxModuleDiceSizeKey(1)]: 24,
        [gameBoxModuleDiceCountKey(1)]: 40,
      },
    )
    expect(gameBoxStorageDepth(withInactiveFields)).toBe(
      gameBoxStorageDepth(active),
    )
    expect(gameBoxLayout(withInactiveFields)).toEqual(gameBoxLayout(active))
  })

  it('ignores the card depth of a dice module', () => {
    const active = parameters([
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
    ])
    const withInactiveFields = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      {
        [gameBoxModuleCardDepthKey(2)]: 90,
      },
    )
    expect(gameBoxStorageDepth(withInactiveFields)).toBe(
      gameBoxStorageDepth(active),
    )
    expect(gameBoxLayout(withInactiveFields)).toEqual(gameBoxLayout(active))
  })
})

describe('game-box storage depth range', () => {
  it('accepts a depth inside the supported range', () => {
    const validation = validateGameBoxParameters(
      parameters([{ type: 'cards', cardDepth: 30 }]),
    )
    expect(validation.valid).toBe(true)
  })

  it('rejects a depth above the range on the last module', () => {
    const validation = validateGameBoxParameters(
      parameters([{ type: 'cards', cardDepth: 150 }]),
    )
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues[0]?.field).toBe(gameBoxModuleCardDepthKey(1))
    expect(validation.issues[0]?.messageId).toBe(
      'validation.gameBoxStorageDepthOutOfRange',
    )
  })

  it('rejects a depth below the range on the last module', () => {
    const validation = validateGameBoxParameters(
      parameters([
        { type: 'cards', cardDepth: 3 },
        { type: 'cards', cardDepth: 3 },
      ]),
    )
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues[0]?.field).toBe(gameBoxModuleCardDepthKey(2))
    expect(validation.issues[0]?.messageId).toBe(
      'validation.gameBoxStorageDepthOutOfRange',
    )
  })

  it('accepts a lone dice module of the default die size', () => {
    // The direct lengths shrank some saved designs below the old 20 mm
    // minimum; the minimum now follows the smallest depth the box and the
    // lid still build at, so the default 16 mm dice module stays valid.
    const validation = validateGameBoxParameters(
      parameters([{ type: 'dice', diceSize: 16, diceCount: 9 }]),
    )
    expect(validation.valid).toBe(true)
  })

  it('accepts a lone dice module at the smallest confirmed die size', () => {
    const validation = validateGameBoxParameters(
      parameters([{ type: 'dice', diceSize: 14, diceCount: 9 }]),
    )
    expect(validation.valid).toBe(true)
  })

  it('rejects a lone dice module below the range', () => {
    const validation = validateGameBoxParameters(
      parameters([{ type: 'dice', diceSize: 8, diceCount: 9 }]),
    )
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues[0]?.field).toBe(gameBoxModuleDiceSizeKey(1))
    expect(validation.issues[0]?.messageId).toBe(
      'validation.gameBoxStorageDepthOutOfRange',
    )
  })

  it('accepts a depth at the maximum despite binary noise', () => {
    // Four 30 mm dice modules and a 13.55 mm cards module add up to a
    // nominal 150 mm; the raw sum arrives as 150.00000000000003.
    const validation = validateGameBoxParameters(
      parameters([
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'cards', cardDepth: 13.55 },
      ]),
    )
    expect(validation.valid).toBe(true)
  })

  it('reports the range rejection with a formatted depth', () => {
    const validation = validateGameBoxParameters(
      parameters([
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
      ]),
    )
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues[0]?.params?.depth).toBe('168.25')
  })

  it('reads card depths back to a hundredth of a millimetre', () => {
    // The card depth has no input step, but the derived depth and the
    // export names round to two decimals: two depths that differ by less
    // than a hundredth must not become two different geometries.
    const coarse = validateGameBoxParameters(
      parameters([{ type: 'cards', cardDepth: 30.004 }]),
    )
    expect(coarse.valid).toBe(true)
    if (!coarse.valid) return
    expect(coarse.value[gameBoxModuleCardDepthKey(1)]).toBe(30)

    const finer = validateGameBoxParameters(
      parameters([{ type: 'cards', cardDepth: 30.006 }]),
    )
    expect(finer.valid).toBe(true)
    if (!finer.valid) return
    expect(finer.value[gameBoxModuleCardDepthKey(1)]).toBe(30.01)
  })

  it('reads dice sizes back to a hundredth of a millimetre', () => {
    const validation = validateGameBoxParameters(
      parameters([{ type: 'dice', diceSize: 16.3000001, diceCount: 9 }]),
    )
    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(validation.value[gameBoxModuleDiceSizeKey(1)]).toBe(16.3)
  })
})

describe('game-box dice layout', () => {
  it('spreads nine dice over three rows of three', () => {
    const layout = gameBoxDiceLayout(70, 120, 16, 9)
    expect(layout.perRow).toBe(3)
    expect(layout.layers).toBe(3)
  })

  it('keeps three dice in a single row of three', () => {
    const layout = gameBoxDiceLayout(70, 120, 16, 3)
    expect(layout.perRow).toBe(3)
    expect(layout.layers).toBe(1)
  })

  it('holds a single die in a small box', () => {
    expect(gameBoxDiceCapacity(40, 60, 30)).toBe(1)
  })

  it('never reports more dice per row than the width allows', () => {
    for (const cardWidth of [40, 70, 100]) {
      for (const diceSize of [8, 16, 30]) {
        const layout = gameBoxDiceLayout(cardWidth, 120, diceSize, 1)
        expect(layout.perRow).toBeLessThanOrEqual(layout.perRowLimit)
        expect(layout.layers).toBeLessThanOrEqual(layout.layerLimit)
      }
    }
  })

  it('keeps the dice rows unchanged over the whole die size range', () => {
    expect(gameBoxDiceLayout(70, 120, 8, 9).perRowLimit).toBe(7)
    expect(gameBoxDiceLayout(70, 120, 16, 9).perRowLimit).toBe(4)
    expect(gameBoxDiceLayout(70, 120, 30, 9).perRowLimit).toBe(2)
    expect(gameBoxDiceLayout(70, 120, 16, 9).layerLimit).toBe(7)
  })
})
