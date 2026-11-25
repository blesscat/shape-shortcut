import { describe, expect, it } from 'vitest'
import {
  CARD_BOX_CONFIGURATION,
  GAME_BOX_CONFIGURATION,
  gameBoxCardsModuleLength,
  gameBoxDiceCapacity,
  gameBoxDiceHolderTenonOffset,
  gameBoxDiceHolderTenonSpan,
  gameBoxDiceHolderThickness,
  gameBoxDiceLayout,
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
  it('computes a card module from the card depth and the clearance', () => {
    expect(gameBoxCardsModuleLength(30)).toBeCloseTo(31, 6)
    expect(gameBoxCardsModuleLength(60)).toBeCloseTo(61, 6)
    expect(gameBoxCardsModuleLength(3)).toBeCloseTo(4, 6)
  })

  it('computes the holder thickness from the die and the two walls', () => {
    expect(gameBoxDiceHolderThickness(16)).toBeCloseTo(19.4, 6)
    expect(gameBoxDiceHolderThickness(8)).toBeCloseTo(11.4, 6)
    expect(gameBoxDiceHolderThickness(30)).toBeCloseTo(33.4, 6)
  })

  it('spreads the tenons a whole number of slots apart', () => {
    expect(gameBoxDiceHolderTenonSpan(19.4)).toBeCloseTo(18, 6)
    expect(gameBoxDiceHolderTenonSpan(21.4)).toBeCloseTo(18, 6)
    expect(gameBoxDiceHolderTenonSpan(11.4)).toBeCloseTo(9, 6)
    expect(gameBoxDiceHolderTenonSpan(33.4)).toBeCloseTo(30, 6)
  })

  it('keeps the tenon distance a whole multiple of the slot pitch', () => {
    const pitch = CARD_BOX_CONFIGURATION.dividerSlotPitch
    for (let diceSize = 8; diceSize <= 30; diceSize += 0.5) {
      const thickness = gameBoxDiceHolderThickness(diceSize)
      const span = gameBoxDiceHolderTenonSpan(thickness)
      expect(
        span % pitch,
        `the tenon span of a ${diceSize} mm die`,
      ).toBeCloseTo(0, 6)
      expect(
        span,
        `the tenon span of a ${diceSize} mm die`,
      ).toBeLessThanOrEqual(thickness)
      expect(span).toBeGreaterThan(0)
    }
  })

  it('centres the two tenons in the holder', () => {
    for (const diceSize of [8, 16, 18, 30]) {
      const thickness = gameBoxDiceHolderThickness(diceSize)
      const span = gameBoxDiceHolderTenonSpan(thickness)
      const offset = gameBoxDiceHolderTenonOffset(thickness)
      expect(offset).toBeCloseTo((thickness - span) / 2, 6)
      expect(offset + span + offset).toBeCloseTo(thickness, 6)
    }
  })
})

describe('game-box storage depth', () => {
  it('rounds the depth of a single card module up to the slot pitch', () => {
    const layout = gameBoxLayout(parameters([{ type: 'cards', cardDepth: 30 }]))
    expect(layout.storageDepth).toBeCloseTo(33, 6)
    expect(layout.modules).toHaveLength(1)
    expect(layout.modules[0]?.length).toBeCloseTo(33, 6)
  })

  it('rounds the depth of a single dice module up to the slot pitch', () => {
    const layout = gameBoxLayout(
      parameters([{ type: 'dice', diceSize: 16, diceCount: 9 }]),
    )
    expect(layout.storageDepth).toBeCloseTo(24, 6)
    const module = layout.modules[0]
    if (!module || module.type !== 'dice') throw new Error('a dice module')
    // The holder waits for the first slot, so it stands 2.3 mm behind the
    // front wall face.
    expect(module.holderStart).toBeCloseTo(2.3, 6)
    expect(module.tenonCentres[0]).toBeCloseTo(3, 6)
    expect(module.tenonCentres[1]).toBeCloseTo(21, 6)
  })

  it('places a card module and a dice module on the rack', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ]),
    )
    expect(layout.storageDepth).toBeCloseTo(54, 6)
    const cards = layout.modules[0]
    const dice = layout.modules[1]
    if (!cards || cards.type !== 'cards') throw new Error('a cards module')
    if (!dice || dice.type !== 'dice') throw new Error('a dice module')
    // The card compartment is 32.3 mm deep: 30 mm of cards and 2.3 mm of
    // clearance instead of the 1 mm the layout needs.
    expect(cards.freeLength).toBeCloseTo(32.3, 6)
    expect(dice.holderStart).toBeCloseTo(32.3, 6)
    expect(dice.tenonCentres[0]).toBeCloseTo(33, 6)
    expect(dice.tenonCentres[1]).toBeCloseTo(51, 6)
    expect(layout.dividerCount).toBe(0)
  })

  it('puts the divider between two card modules on a slot', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'cards', cardDepth: 30 },
      ]),
    )
    expect(layout.storageDepth).toBeCloseTo(66, 6)
    expect(layout.dividerCenters).toHaveLength(1)
    expect(layout.dividerCenters[0]).toBeCloseTo(33, 6)
    expect(layout.dividerCenters[0]! % 3).toBeCloseTo(0, 6)
  })

  it('keeps a holder without a divider next to it', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ]),
    )
    expect(layout.storageDepth).toBeCloseTo(75, 6)
    expect(layout.dividerCount).toBe(0)
    expect(layout.dividerCenters).toHaveLength(0)
  })

  it('adds up the lengths of a card, a dice and a card module', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ]),
    )
    expect(layout.storageDepth).toBeCloseTo(75, 6)
    const total = layout.modules.reduce((sum, module) => sum + module.length, 0)
    expect(total).toBeCloseTo(layout.storageDepth, 6)
  })

  it('rounds the depth up to a whole number of slots', () => {
    for (const modules of [
      [{ type: 'cards', cardDepth: 30 }],
      [{ type: 'dice', diceSize: 16, diceCount: 9 }],
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'cards', cardDepth: 30 },
      ],
    ] as ModuleSpec[][]) {
      const depth = gameBoxStorageDepth(parameters(modules))
      expect(depth % 3, `the depth of ${JSON.stringify(modules)}`).toBeCloseTo(
        0,
        6,
      )
    }
  })

  it('keeps the depth of the default module list on the slot pitch', () => {
    const depth = gameBoxStorageDepth(GAME_BOX_CONFIGURATION.defaultParameters)
    expect(depth).toBeCloseTo(63, 6)
    expect(depth % 3).toBeCloseTo(0, 6)
  })

  it('gives every card module its clearance and never more than 4 mm', () => {
    for (const cardDepth of [3, 17, 30, 60, 149]) {
      const layout = gameBoxLayout(parameters([{ type: 'cards', cardDepth }]))
      const module = layout.modules[0]
      if (!module || module.type !== 'cards') throw new Error('a cards module')
      expect(module.freeLength).toBeGreaterThanOrEqual(cardDepth + 1)
      expect(module.freeLength).toBeLessThan(cardDepth + 4)
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
    expect(gameBoxLayout(withInactiveFields).modules).toEqual(
      gameBoxLayout(active).modules,
    )
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
    expect(gameBoxLayout(withInactiveFields).modules).toEqual(
      gameBoxLayout(active).modules,
    )
  })
})

describe('game-box slot rack', () => {
  it('cuts a slot every 3 mm with a 3 mm margin at both ends', () => {
    const layout = gameBoxLayout(parameters([{ type: 'cards', cardDepth: 60 }]))
    expect(layout.storageDepth).toBeCloseTo(63, 6)
    expect(layout.slotCenters).toHaveLength(63 / 3 - 1)
    expect(layout.slotCenters[0]).toBeCloseTo(3, 6)
    expect(layout.slotCenters.at(-1)).toBeCloseTo(60, 6)
    for (const centre of layout.slotCenters) {
      expect(centre % 3).toBeCloseTo(0, 6)
    }
  })

  it('puts every tenon of every holder on a slot', () => {
    const modules: ModuleSpec[][] = [
      [{ type: 'dice', diceSize: 16, diceCount: 9 }],
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      [
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 30 },
      ],
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ],
      [
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'dice', diceSize: 18, diceCount: 9 },
      ],
    ]
    for (const list of modules) {
      const layout = gameBoxLayout(parameters(list))
      for (const module of layout.modules) {
        if (module.type !== 'dice') continue
        for (const centre of module.tenonCentres) {
          expect(
            layout.slotCenters.some((slot) => Math.abs(slot - centre) < 1e-6),
            `the tenon at ${centre} mm of ${JSON.stringify(list)}`,
          ).toBe(true)
        }
      }
    }
  })

  it('puts every divider on a slot', () => {
    const layout = gameBoxLayout(
      parameters([
        { type: 'cards', cardDepth: 30 },
        { type: 'cards', cardDepth: 30 },
      ]),
    )
    for (const centre of layout.dividerCenters) {
      expect(
        layout.slotCenters.some((slot) => Math.abs(slot - centre) < 1e-6),
      ).toBe(true)
    }
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

  it('rounds the smallest dice module up to the supported depth', () => {
    // The 8 mm die needs 13.2 mm of cavity; the depth is rounded up to the
    // 15 mm minimum, so the design is valid again.
    const validation = validateGameBoxParameters(
      parameters([{ type: 'dice', diceSize: 8, diceCount: 9 }]),
    )
    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(gameBoxStorageDepth(validation.value)).toBeCloseTo(15, 6)
  })

  it('accepts a depth at the maximum despite binary noise', () => {
    // Three 30 mm dice modules and a 42.3 mm cards module add up to a
    // nominal 150 mm; the raw sum arrives as 150.00000000000003.
    const validation = validateGameBoxParameters(
      parameters([
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'dice', diceSize: 30, diceCount: 6 },
        { type: 'cards', cardDepth: 42.3 },
      ]),
    )
    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(gameBoxStorageDepth(validation.value)).toBeCloseTo(150, 6)
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
    expect(validation.issues[0]?.params?.depth).toBe('180')
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
