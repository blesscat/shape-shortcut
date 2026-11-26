// Port of the card-box cover layout tests: the game-box cover layout is a
// verbatim port of the card-box layout, so the scenarios are identical.
import { describe, expect, it } from 'vitest'
import {
  cardBoxCoverSafeArea,
  cardBoxCoverStackLayout,
} from '../../src/cad-kernel/components/game-box/layout'
import {
  CARD_BOX_CONFIGURATION,
  GAME_BOX_CONFIGURATION,
  gameBoxCoverSafeAreaWidth,
  validateGameBoxParameters,
  type CardBoxParameters,
} from '../../src/cad-contract/units'

// The ported layout reads only the card size, so the card-box parameter view
// of the game-box defaults drives it.
const parameters: CardBoxParameters = {
  ...CARD_BOX_CONFIGURATION.defaultParameters,
  cardWidth: GAME_BOX_CONFIGURATION.defaults.cardWidth,
  cardHeight: GAME_BOX_CONFIGURATION.defaults.cardHeight,
}

describe('game-box cover safe area', () => {
  it('is the (W-10) x (H-10) visible window shrunk by the margin', () => {
    const safe = cardBoxCoverSafeArea(parameters)
    expect(safe.minX).toBeCloseTo(7, 6)
    expect(safe.maxX).toBeCloseTo(63.5, 6)
    expect(safe.minY).toBeCloseTo(7, 6)
    expect(safe.maxY).toBeCloseTo(113, 6)
  })

  it('hides the top 5 mm behind the lid flange at every size', () => {
    for (const cardHeight of [60, 120, 150]) {
      const safe = cardBoxCoverSafeArea({ ...parameters, cardHeight })
      expect(safe.maxY).toBeCloseTo(cardHeight - 7, 6)
    }
  })

  it('puts the stack top at the safe top at 0% vertical position', () => {
    const safe = cardBoxCoverSafeArea(parameters)
    const item = { kind: 'text' as const, width: 20, height: 6 }
    const layout = cardBoxCoverStackLayout([item], safe, 0)
    expect(layout.placements[0]!.y + item.height).toBeCloseTo(safe.maxY, 6)
  })

  it('centers the stack at 50% vertical position', () => {
    const safe = cardBoxCoverSafeArea(parameters)
    const item = { kind: 'text' as const, width: 20, height: 6 }
    const layout = cardBoxCoverStackLayout([item], safe, 50)
    expect(layout.placements[0]!.y + item.height / 2).toBeCloseTo(
      (safe.minY + safe.maxY) / 2,
      6,
    )
  })

  it('puts the stack bottom at the safe bottom at 100% vertical position', () => {
    const safe = cardBoxCoverSafeArea(parameters)
    const item = { kind: 'text' as const, width: 20, height: 6 }
    const layout = cardBoxCoverStackLayout([item], safe, 100)
    expect(layout.placements[0]!.y).toBeCloseTo(safe.minY, 6)
  })

  it('rejects a stack taller than the shorter window', () => {
    const safe = cardBoxCoverSafeArea(parameters)
    expect(() =>
      cardBoxCoverStackLayout(
        [{ kind: 'text', width: 10, height: safe.maxY - safe.minY + 0.5 }],
        safe,
        50,
      ),
    ).toThrow('CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA')
  })

  it('rejects an element wider than the safe area', () => {
    const safe = cardBoxCoverSafeArea(parameters)
    expect(() =>
      cardBoxCoverStackLayout(
        [{ kind: 'text', width: safe.maxX - safe.minX + 0.5, height: 6 }],
        safe,
        50,
      ),
    ).toThrow('CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA')
  })
})

describe('game-box cover fit gate', () => {
  it('computes the exact safe-area width the validation gate uses', () => {
    // Interior width 70.5 minus the two 5 mm lips and the two 2 mm margins.
    expect(gameBoxCoverSafeAreaWidth(70)).toBeCloseTo(56.5, 6)
    expect(gameBoxCoverSafeAreaWidth(41)).toBeCloseTo(27.5, 6)
    expect(gameBoxCoverSafeAreaWidth(100)).toBeCloseTo(86.5, 6)
  })

  it('rejects an imported SVG wider than the safe area of the card', () => {
    const validation = validateGameBoxParameters({
      ...GAME_BOX_CONFIGURATION.defaultParameters,
      cardWidth: 41,
      cardHeight: 63,
      usesCoverSvg: true,
      coverSvgFingerprint: 'abc',
      coverSvgWidth: 40,
    })
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues[0]!.field).toBe('coverSvgWidth')
    expect(validation.issues[0]!.messageId).toBe(
      'validation.gameBoxCoverArtOutsideSafeArea',
    )
  })

  it('accepts an imported SVG that fits the smaller card', () => {
    const validation = validateGameBoxParameters({
      ...GAME_BOX_CONFIGURATION.defaultParameters,
      cardWidth: 41,
      cardHeight: 63,
      usesCoverSvg: true,
      coverSvgFingerprint: 'abc',
      coverSvgWidth: 27.5,
    })
    expect(validation.valid).toBe(true)
  })
})
