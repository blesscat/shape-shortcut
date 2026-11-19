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
import { unitLabelFor } from '../../src/features/cad/model-catalog'

const DEFAULTS = GAME_BOX_CONFIGURATION.defaultParameters
const PRODUCT_BOUNDS = boundsForGameBox({ ...DEFAULTS, part: 'assembly' })

/** The panel shows a length rounded to two decimals, without trailing zeros. */
function shownLength(value: number): string {
  return Number(value.toFixed(2)).toString()
}

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
    expect(diceCountField(1).unit).toBe('dice')
    expect(diceSizeField(1).unit).toBe('mm')
    expect(cardDepthField(1).unit).toBe('mm')
  })

  it('labels the die count in dice in every locale', () => {
    const field = diceCountField(1)
    expect(unitLabelFor('en', field.unit)).toBe('dice')
    expect(unitLabelFor('zh-Hant', field.unit)).toBe('顆')
    expect(unitLabelFor('en', field.unit)).not.toBe('mm')
    expect(unitLabelFor('en', field.unit)).not.toBe('columns')
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
      `${shownLength(cardBoxInteriorWidth(DEFAULTS.cardWidth))} × ${shownLength(33)} × ${shownLength(DEFAULTS.cardHeight)} mm`,
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
      `${shownLength(PRODUCT_BOUNDS.max[0] - PRODUCT_BOUNDS.min[0])} × ${shownLength(PRODUCT_BOUNDS.max[1] - PRODUCT_BOUNDS.min[1])} × ${shownLength(PRODUCT_BOUNDS.max[2] - PRODUCT_BOUNDS.min[2])} mm`,
    )
  })

  it('rounds the floating-point noise of a computed length', () => {
    expect(formatMillimetres(69.05000000000001)).toBe('69.05 mm')
    expect(formatSize(76.5, 69.05000000000001, 129)).toBe(
      '76.5 × 69.05 × 129 mm',
    )
  })

  it('drops the trailing zeros of a length', () => {
    expect(formatMillimetres(70.5)).toBe('70.5 mm')
    expect(formatMillimetres(63.0)).toBe('63 mm')
    expect(formatSize(70.5, 63.0, 120.0)).toBe('70.5 × 63 × 120 mm')
  })

  it('keeps an integer length an integer', () => {
    expect(formatMillimetres(63)).toBe('63 mm')
    expect(formatSize(76, 63, 129)).toBe('76 × 63 × 129 mm')
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

  it('shows a dash for a length that is not a finite number', () => {
    expect(formatMillimetres(Number.POSITIVE_INFINITY)).toBe(UNKNOWN_MEASURE)
    expect(formatMillimetres(Number.NEGATIVE_INFINITY)).toBe(UNKNOWN_MEASURE)
    expect(formatSize(Number.POSITIVE_INFINITY, 1, 3)).toBe(UNKNOWN_MEASURE)
    expect(formatSize(1, 2, Number.NaN)).toBe(UNKNOWN_MEASURE)
  })
})
