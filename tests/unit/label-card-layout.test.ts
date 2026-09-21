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
