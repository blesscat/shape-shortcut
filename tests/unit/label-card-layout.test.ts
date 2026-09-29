import { validateModelParameters } from '../../src/cad-contract/units'
import { expect, it } from 'vitest'
import { modelDefinitions } from '../../src/features/cad/model-catalog'
import {
  OPENGRID_LABEL_CARD_CONFIGURATION,
  validateOpenGridLabelCardParameters,
} from '../../src/cad-contract/units/opengrid-label-card'

it('offers cards and slot test coupons without clip-on tag or holder models', () => {
  const ids = modelDefinitions.map((model) => model.id)
  expect(ids).not.toContain('opengrid-label-tag')
  expect(ids).not.toContain('opengrid-label-holder')
  expect(validateModelParameters('opengrid-label-tag', {}).valid).toBe(false)
  expect(validateModelParameters('opengrid-label-holder', {}).valid).toBe(false)
  expect(ids).toContain('opengrid-label-card')
  expect(ids).toContain('opengrid-label-slot-test')
})
it('limits cards to 1–10 units and defaults to four', () => {
  expect(OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.gridUnits).toBe(4)
  for (const gridUnits of [1, 10])
    expect(validateOpenGridLabelCardParameters({ gridUnits }).valid).toBe(true)
  for (const gridUnits of [0, 11, 49])
    expect(validateOpenGridLabelCardParameters({ gridUnits }).valid).toBe(false)
})
it('accepts either icon side, migrates missing side, and reserves room for 7mm text', () => {
  for (const iconPosition of ['left', 'right']) {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        text: 'M3',
        iconPosition,
      }),
    ).toMatchObject({ valid: true, value: { iconPosition } })
  }
  expect(validateOpenGridLabelCardParameters({ gridUnits: 4 })).toMatchObject({
    valid: true,
    value: { iconPosition: 'left' },
  })
  expect(
    validateOpenGridLabelCardParameters({ gridUnits: 4, iconPosition: 'top' })
      .valid,
  ).toBe(false)
  expect(
    validateOpenGridLabelCardParameters({ gridUnits: 1, text: 'M3' }).valid,
  ).toBe(false)
})

it('validates adjustable height and reclaims icon space for text-only cards', () => {
  for (const textHeight of [4, 4.5, 7]) {
    expect(validateOpenGridLabelCardParameters({ textHeight })).toMatchObject({
      valid: true,
      value: { textHeight },
    })
  }
  for (const textHeight of [1.9, 7.1, NaN, Infinity, '4']) {
    expect(validateOpenGridLabelCardParameters({ textHeight }).valid).toBe(
      false,
    )
  }
  expect(validateOpenGridLabelCardParameters({})).toMatchObject({
    valid: true,
    value: { textHeight: 7 },
  })
  expect(
    validateOpenGridLabelCardParameters({
      gridUnits: 2,
      text: 'M3',
      textHeight: 4,
    }).valid,
  ).toBe(true)
  expect(
    validateOpenGridLabelCardParameters({
      gridUnits: 2,
      text: 'M3',
      textHeight: 7,
    }).valid,
  ).toBe(false)
  expect(
    validateOpenGridLabelCardParameters({
      gridUnits: 2,
      text: 'M3',
      textHeight: 7,
      icon: 'none',
    }).valid,
  ).toBe(true)
})

it.each([
  'drive-slot',
  'drive-phillips',
  'drive-hex',
  'drive-torx',
  'hole-through',
  'hole-threaded',
  'hole-countersink',
  'hole-counterbore',
])('accepts the %s fastener symbol', (icon) => {
  expect(validateOpenGridLabelCardParameters({ icon })).toMatchObject({
    valid: true,
    value: { icon },
  })
})

it('supports two independently aligned rows and limits their combined text height', () => {
  expect(validateOpenGridLabelCardParameters({ textHeight: 2 })).toMatchObject({
    valid: true,
  })
  expect(
    validateOpenGridLabelCardParameters({
      text: 'M3',
      textLine2: '10mm',
      textHeight: 4,
      textAlignment: 'left',
      textLine2Alignment: 'right',
    }),
  ).toMatchObject({
    valid: true,
    value: {
      text: 'M3',
      textLine2: '10mm',
      textHeight: 4,
      textAlignment: 'left',
      textLine2Alignment: 'right',
    },
  })
  expect(
    validateOpenGridLabelCardParameters({
      text: 'M3',
      textLine2: '10mm',
      textHeight: 4.5,
    }),
  ).toMatchObject({ valid: false, issues: [{ field: 'textHeight' }] })
  expect(
    validateOpenGridLabelCardParameters({
      textLine2: 'ABCDEFZ',
      textHeight: 2,
    }),
  ).toMatchObject({ valid: false, issues: [{ field: 'textLine2' }] })
  expect(
    validateOpenGridLabelCardParameters({ textAlignment: 'top' }).valid,
  ).toBe(false)
  expect(
    validateOpenGridLabelCardParameters({ textLine2Alignment: 'bottom' }).valid,
  ).toBe(false)
})
