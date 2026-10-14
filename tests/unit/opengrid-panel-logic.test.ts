import { describe, expect, it } from 'vitest'
import {
  OPENGRID_CONFIGURATION,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import {
  fullGridCountFromSlider,
  mergeOpenGridParameters,
  openGridDefinitionDefaults,
  screwPresetFitsCurrentBoard,
} from '../../src/components/cad/component-panels/opengrid/panel-logic'

function parameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    targetFrameSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.targetFrameSides,
    },
    ...overrides,
  }
}

describe('fullGridCountFromSlider', () => {
  it('rounds to the nearest integer without a half cell', () => {
    const noHalfCell = { hasHalfCell: false, currentValue: 2 }
    expect(fullGridCountFromSlider('x', 2.4, noHalfCell)).toBe(2)
    expect(fullGridCountFromSlider('x', 2.5, noHalfCell)).toBe(3)
    expect(fullGridCountFromSlider('x', 1.5, noHalfCell)).toBe(2)
  })

  it('commits to the half count the thumb moves away from', () => {
    // Current displayed count 3.5 (full count 3).
    const halfCell = { hasHalfCell: true, currentValue: 3.5 }
    expect(fullGridCountFromSlider('x', 3.5, halfCell)).toBe(3)
    expect(fullGridCountFromSlider('x', 2.5, halfCell)).toBe(2)
    expect(fullGridCountFromSlider('x', 4.5, halfCell)).toBe(4)
    // Brief integer visit while moving: resolved by direction.
    expect(fullGridCountFromSlider('x', 3, halfCell)).toBe(2)
    expect(fullGridCountFromSlider('x', 4, halfCell)).toBe(4)
  })

  it('never commits below one full count', () => {
    expect(
      fullGridCountFromSlider('x', 0.5, {
        hasHalfCell: true,
        currentValue: 1.5,
      }),
    ).toBe(1)
    expect(
      fullGridCountFromSlider('x', 1, { hasHalfCell: true, currentValue: 1.5 }),
    ).toBe(1)
  })
})

describe('screwPresetFitsCurrentBoard', () => {
  it('accepts every shipped preset on the default Lite variant', () => {
    for (const preset of Object.values(OPENGRID_CONFIGURATION.screwPresets)) {
      expect(screwPresetFitsCurrentBoard('Lite', preset)).toBe(true)
    }
  })

  it('rejects non-positive diameters and inverted head geometry', () => {
    expect(
      screwPresetFitsCurrentBoard('Lite', {
        diameter: 0,
        headDiameter: 7,
        headInset: 1,
        headIsCountersunk: true,
        headCountersunkDegree: 90,
      }),
    ).toBe(false)
    expect(
      screwPresetFitsCurrentBoard('Lite', {
        diameter: 8,
        headDiameter: 7,
        headInset: 1,
        headIsCountersunk: true,
        headCountersunkDegree: 90,
      }),
    ).toBe(false)
  })

  it('bounds head diameter by the tile inner size', () => {
    expect(
      screwPresetFitsCurrentBoard('Lite', {
        diameter: 4,
        headDiameter: OPENGRID_CONFIGURATION.tileInnerSize,
        headInset: 1,
        headIsCountersunk: true,
        headCountersunkDegree: 90,
      }),
    ).toBe(true)
    expect(
      screwPresetFitsCurrentBoard('Lite', {
        diameter: 4,
        headDiameter: OPENGRID_CONFIGURATION.tileInnerSize + 0.5,
        headInset: 1,
        headIsCountersunk: true,
        headCountersunkDegree: 90,
      }),
    ).toBe(false)
  })

  it('bounds head inset by the variant thickness', () => {
    const liteThickness = OPENGRID_CONFIGURATION.variants.Lite.thickness
    const heavyThickness = OPENGRID_CONFIGURATION.variants.Heavy.thickness
    const dimensions = {
      diameter: 4,
      headDiameter: 7,
      headInset: liteThickness,
      headIsCountersunk: true,
      headCountersunkDegree: 90,
    }
    // An inset of exactly the variant thickness fits; a hair more does not.
    expect(screwPresetFitsCurrentBoard('Lite', dimensions)).toBe(true)
    expect(
      screwPresetFitsCurrentBoard('Lite', {
        ...dimensions,
        headInset: liteThickness + 0.1,
      }),
    ).toBe(false)
    expect(
      screwPresetFitsCurrentBoard('Heavy', {
        ...dimensions,
        headInset: heavyThickness,
      }),
    ).toBe(true)
    expect(
      screwPresetFitsCurrentBoard('Heavy', {
        ...dimensions,
        headInset: heavyThickness + 0.1,
      }),
    ).toBe(false)
  })
})

describe('mergeOpenGridParameters', () => {
  it('merges nested flag groups instead of replacing them', () => {
    const base = parameters()
    const next = mergeOpenGridParameters(base, {
      chamferCorners: { topLeft: false },
      connectorSides: { right: false },
      targetFrameSides: { bottom: false },
    })
    expect(next.chamferCorners).toEqual({
      topLeft: false,
      topRight: true,
      bottomLeft: true,
      bottomRight: true,
    })
    expect(next.connectorSides).toEqual({
      top: true,
      right: false,
      bottom: true,
      left: true,
    })
    expect(next.targetFrameSides).toEqual({
      top: true,
      right: true,
      bottom: false,
      left: true,
    })
  })

  it('keeps nested groups intact when the change does not mention them', () => {
    const base = parameters({
      chamferCorners: {
        topLeft: false,
        topRight: true,
        bottomLeft: true,
        bottomRight: false,
      },
      connectorSides: { top: false, right: true, bottom: true, left: true },
    })
    const next = mergeOpenGridParameters(base, { variant: 'Heavy' })
    expect(next.chamferCorners).toEqual(base.chamferCorners)
    expect(next.connectorSides).toEqual(base.connectorSides)
    expect(next.targetFrameSides).toEqual(base.targetFrameSides)
    expect(next.variant).toBe('Heavy')
  })

  it('applies scalar changes alongside nested merges', () => {
    const base = parameters()
    const next = mergeOpenGridParameters(base, {
      screwMode: 'everywhere',
      chamferCorners: { bottomLeft: false },
    })
    expect(next.screwMode).toBe('everywhere')
    expect(next.chamferCorners.bottomLeft).toBe(false)
    expect(next.chamferCorners.topLeft).toBe(true)
    expect(base.chamferCorners.bottomLeft).toBe(true)
  })
})

describe('openGridDefinitionDefaults', () => {
  it('returns a deep copy of the shipped defaults', () => {
    const defaults = openGridDefinitionDefaults()
    expect(defaults).toEqual(parameters())
    expect(defaults.chamferCorners).not.toBe(
      OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    )
    expect(defaults.connectorSides).not.toBe(
      OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    )
    expect(defaults.targetFrameSides).not.toBe(
      OPENGRID_CONFIGURATION.defaultParameters.targetFrameSides,
    )
  })
})
