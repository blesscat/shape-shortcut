import { describe, expect, it } from 'vitest'
import {
  cardBoxCoverSafeArea,
  cardBoxCoverStackLayout,
} from '../../src/cad-kernel/components/card-box/layout'
import { CARD_BOX_CONFIGURATION } from '../../src/cad-contract/units'

const parameters = CARD_BOX_CONFIGURATION.defaultParameters

describe('card-box cover safe area', () => {
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
})
