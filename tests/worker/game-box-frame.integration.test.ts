import { describe, expect, it } from 'vitest'
import { cardBoxInnerFrontY } from '../../src/cad-kernel/components/card-box/box'
import { gameBoxCardBoxGeometry } from '../../src/cad-kernel/components/game-box/geometry'
import {
  GAME_BOX_CONFIGURATION,
  gameBoxFrontWallY,
  type GameBoxModuleIndex,
  type GameBoxParameters,
} from '../../src/cad-contract/units'

type ModuleSpec = {
  type: 'cards' | 'dice'
  cardDepth?: number
}

function parameters(
  modules: readonly ModuleSpec[],
  overrides: Partial<GameBoxParameters> = {},
): GameBoxParameters {
  const values: Record<string, unknown> = {}
  modules.forEach((module, position) => {
    const index = (position + 1) as GameBoxModuleIndex
    values[`module${index}Type`] = module.type
    if (module.cardDepth !== undefined) {
      values[`module${index}CardDepth`] = module.cardDepth
    }
  })
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    ...values,
    ...overrides,
  } as GameBoxParameters
}

const CARD_SIZES = [
  { cardWidth: 70, cardHeight: 120 },
  { cardWidth: 40, cardHeight: 60 },
  { cardWidth: 100, cardHeight: 150 },
]

const MODULE_LISTS = [
  [{ type: 'cards' as const, cardDepth: 30 }],
  [
    { type: 'cards' as const, cardDepth: 30 },
    { type: 'dice' as const },
    { type: 'cards' as const, cardDepth: 20 },
  ],
  [{ type: 'dice' as const }, { type: 'cards' as const, cardDepth: 20 }],
]

describe('game-box frame', () => {
  it('measures the module grid from the same front wall as the kernel', () => {
    for (const { cardWidth, cardHeight } of CARD_SIZES) {
      for (const modules of MODULE_LISTS) {
        const snapshot = parameters(modules, { cardWidth, cardHeight })
        expect(gameBoxFrontWallY(snapshot)).toBeCloseTo(
          cardBoxInnerFrontY(gameBoxCardBoxGeometry(snapshot)),
          9,
        )
      }
    }
  })
})
