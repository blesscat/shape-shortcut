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

  it('leaves the side wall and the floor at their own minimum', () => {
    expect(GAME_BOX_CONFIGURATION.diceHolderWall).toBe(1.2)
    // The holder thickness follows the front and the back wall only; the
    // side wall and the floor minimum does not enter it.
    expect(gameBoxDiceHolderThickness(16)).toBeCloseTo(
      16 +
        GAME_BOX_CONFIGURATION.diceClearance +
        2 * GAME_BOX_CONFIGURATION.diceHolderFrontBackWall,
      6,
    )
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
