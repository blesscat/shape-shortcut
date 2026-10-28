import { describe, expect, it } from 'vitest'
import { cardBoxPreview } from '../../src/features/cad/progressive-preview/components'
import {
  CARD_BOX_CONFIGURATION,
  type CardBoxParameters,
} from '../../src/cad-contract/units'

function parameters(overrides: Partial<CardBoxParameters>): CardBoxParameters {
  return { ...CARD_BOX_CONFIGURATION.defaultParameters, ...overrides }
}

describe('card-box progressive preview orientations', () => {
  it('renders single-part divider and cover flat on the bed', () => {
    const divider = cardBoxPreview(parameters({ part: 'divider' }))
    // Body plus the protruding tab, both lying on the bed.
    expect(divider).toHaveLength(2)
    for (const solid of divider) {
      expect(solid.depth).toBe(CARD_BOX_CONFIGURATION.dividerPlateThickness)
      expect(solid.origin[2]).toBe(0)
    }

    const cover = cardBoxPreview(parameters({ part: 'cover' }))
    expect(cover).toHaveLength(1)
    expect(cover[0]!.depth).toBe(CARD_BOX_CONFIGURATION.coverPlateThickness)
    expect(cover[0]!.origin[2]).toBe(0)
  })

  it('stands the divider and cover in the assembled frame', () => {
    const assembly = cardBoxPreview(parameters({ part: 'assembly' }))
    // box walls + floor + lid + divider + cover
    expect(assembly.length).toBeGreaterThanOrEqual(6)
    const cardHeight = CARD_BOX_CONFIGURATION.defaults.cardHeight
    // Standing plates extrude by their card-height span, not their
    // thickness: the divider body and the cover are H tall.
    const standingSolids = assembly.filter(
      (solid) => solid.depth === cardHeight,
    )
    expect(standingSolids).toHaveLength(2)
    for (const solid of standingSolids) {
      expect(solid.origin[2]).toBe(2)
    }
    // The divider tab stands on top of its body.
    const tab = assembly.find(
      (solid) => solid.depth === CARD_BOX_CONFIGURATION.dividerTabHeight,
    )
    expect(tab?.origin[2]).toBe(2 + cardHeight)
  })

  it('places the divider tab at the selected position', () => {
    const tabX = (position: 'left' | 'center' | 'right') =>
      cardBoxPreview(
        parameters({ part: 'divider', dividerTabPosition: position }),
      )[1]!.origin[0]
    expect(tabX('left')).toBeLessThan(0)
    expect(tabX('center')).toBe(0)
    expect(tabX('right')).toBeGreaterThan(0)
  })
})
