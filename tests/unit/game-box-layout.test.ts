import { describe, expect, it } from 'vitest'
import {
  GAME_BOX_CONFIGURATION,
  gameBoxCardsSlots,
  gameBoxDiceCapacity,
  gameBoxDiceHolderMinimumThickness,
  gameBoxDiceHolderThickness,
  gameBoxDiceLayout,
  gameBoxDiceSlots,
  gameBoxLayout,
  gameBoxModuleCardDepthKey,
  gameBoxModuleDiceCountKey,
  gameBoxModuleDiceSizeKey,
  gameBoxModuleTypeKey,
  gameBoxStorageDepth,
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

describe('game-box module slots', () => {
  it('rounds a card module up to whole slots', () => {
    expect(gameBoxCardsSlots(30)).toBe(11)
    expect(gameBoxCardsSlots(30) * GAME_BOX_CONFIGURATION.slotPitch).toBe(33)
  })

  it('keeps the clear length of a card module at least its depth', () => {
    for (const cardDepth of [3, 17, 30, 60, 149]) {
      const slots = gameBoxCardsSlots(cardDepth)
      const clearLength =
        slots * GAME_BOX_CONFIGURATION.slotPitch -
        GAME_BOX_CONFIGURATION.dividerPlateThickness
      expect(clearLength).toBeGreaterThanOrEqual(cardDepth)
      expect(
        (slots - 1) * GAME_BOX_CONFIGURATION.slotPitch -
          GAME_BOX_CONFIGURATION.dividerPlateThickness,
      ).toBeLessThan(cardDepth)
    }
  })

  it('reserves the holder thickness plus the divider gaps for a dice module', () => {
    expect(gameBoxDiceHolderMinimumThickness(16)).toBeCloseTo(19, 6)
    expect(gameBoxDiceSlots(16)).toBe(7)
    expect(gameBoxDiceHolderThickness(16)).toBeCloseTo(19.85, 6)
  })
})

describe('game-box storage depth', () => {
  it('derives the depth of a single card module from its slots', () => {
    const layout = gameBoxLayout(parameters([{ type: 'cards', cardDepth: 30 }]))
    expect(layout.storageDepth).toBe(33)
    expect(layout.modules).toHaveLength(1)
    expect(layout.modules[0]?.length).toBe(33)
  })

  it('adds up the lengths of a card, a dice and a card module', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ]),
    )
    expect(layout.storageDepth).toBe(75)
    expect(layout.storageDepth % GAME_BOX_CONFIGURATION.slotPitch).toBe(0)
    expect(layout.modules.map((module) => module.length)).toEqual([33, 21, 21])
    expect(layout.dividerCount).toBe(2)
  })

  it('places one divider on every module boundary', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ]),
    )
    expect(layout.dividerCenters).toEqual([33, 54])
  })

  it('numbers the wall slots from the front inner wall', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ]),
    )
    expect(layout.slots).toBe(25)
    expect(layout.slotCenters).toHaveLength(24)
    expect(layout.slotCenters[0]).toBe(3)
    expect(layout.slotCenters.at(-1)).toBe(72)
    for (const center of layout.dividerCenters) {
      expect(layout.slotCenters).toContain(center)
    }
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
})
