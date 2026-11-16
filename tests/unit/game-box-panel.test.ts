import { describe, expect, it } from 'vitest'
import {
  cardDepthField,
  diceCountField,
  diceSizeField,
  gameBoxModuleCardDepthDefault,
  moduleFieldChanged,
} from '../../src/components/cad/component-panels/game-box/fields'
import {
  formatMillimetres,
  formatSize,
  gameBoxDerivedSizes,
  UNKNOWN_MEASURE,
} from '../../src/components/cad/component-panels/game-box/derived-sizes'
import {
  boundsForGameBox,
  cardBoxInteriorWidth,
  GAME_BOX_CONFIGURATION,
} from '../../src/cad-contract/units'

const DEFAULTS = GAME_BOX_CONFIGURATION.defaultParameters
const PRODUCT_BOUNDS = boundsForGameBox({ ...DEFAULTS, part: 'assembly' })

describe('game-box module fields', () => {
  it('gives the first module its thicker default card depth', () => {
    expect(gameBoxModuleCardDepthDefault(1)).toBe(
      GAME_BOX_CONFIGURATION.defaults.firstModuleCardDepth,
    )
    expect(gameBoxModuleCardDepthDefault(2)).toBe(
      GAME_BOX_CONFIGURATION.defaults.cardDepth,
    )
    expect(cardDepthField(1).defaultValue).toBe(
      GAME_BOX_CONFIGURATION.defaults.firstModuleCardDepth,
    )
    expect(cardDepthField(2).defaultValue).toBe(
      GAME_BOX_CONFIGURATION.defaults.cardDepth,
    )
  })

  it('does not flag the default card depth of the first module as edited', () => {
    const field = cardDepthField(1)
    expect(moduleFieldChanged(String(field.defaultValue), field)).toBe(false)
    expect(
      moduleFieldChanged(
        String(GAME_BOX_CONFIGURATION.defaults.cardDepth),
        field,
      ),
    ).toBe(true)
  })

  it('counts the dice instead of measuring them', () => {
    expect(diceCountField(1).unit).toBe('count')
    expect(diceSizeField(1).unit).toBe('mm')
    expect(cardDepthField(1).unit).toBe('mm')
  })
})

describe('game-box derived sizes', () => {
  it('shows the interior size of the cavity', () => {
    const sizes = gameBoxDerivedSizes({
      cardWidth: DEFAULTS.cardWidth,
      cardHeight: DEFAULTS.cardHeight,
      storageDepth: 33,
      productBounds: PRODUCT_BOUNDS,
    })
    expect(sizes.interior).toBe(
      `${cardBoxInteriorWidth(DEFAULTS.cardWidth)} × 33 × ${DEFAULTS.cardHeight} mm`,
    )
  })

  it('shows the outer size of the assembled product', () => {
    const sizes = gameBoxDerivedSizes({
      cardWidth: DEFAULTS.cardWidth,
      cardHeight: DEFAULTS.cardHeight,
      storageDepth: 33,
      productBounds: PRODUCT_BOUNDS,
    })
    expect(sizes.outer).toBe(
      `${PRODUCT_BOUNDS.max[0] - PRODUCT_BOUNDS.min[0]} × ${PRODUCT_BOUNDS.max[1] - PRODUCT_BOUNDS.min[1]} × ${PRODUCT_BOUNDS.max[2] - PRODUCT_BOUNDS.min[2]} mm`,
    )
  })

  it('never shows a broken measurement', () => {
    const sizes = gameBoxDerivedSizes({
      cardWidth: Number.NaN,
      cardHeight: DEFAULTS.cardHeight,
      storageDepth: Number.NaN,
      productBounds: {
        min: [Number.NaN, 0, 0],
        max: [0, 0, 0],
      },
    })
    expect(sizes.interior).toBe(UNKNOWN_MEASURE)
    expect(sizes.outer).toBe(UNKNOWN_MEASURE)
    expect(sizes.storageDepth).toBe(UNKNOWN_MEASURE)
    expect(formatMillimetres(Number.NaN)).toBe(UNKNOWN_MEASURE)
    expect(formatSize(1, Number.NaN, 3)).toBe(UNKNOWN_MEASURE)
  })
})
