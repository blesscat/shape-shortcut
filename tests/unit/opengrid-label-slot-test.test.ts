import { describe, expect, it } from 'vitest'
import { getModelDefinition } from '../../src/features/cad/model-catalog'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'
import {
  validateOpenGridLabelSlotTestParameters,
  boundsForOpenGridLabelSlotTest,
  openGridLabelSlotTestLayoutFor,
} from '../../src/cad-contract/units/opengrid-label-slot-test'
import { systemContextForModel } from '../../src/features/cad/system-entry-context'

describe('standalone organizer slot test coupon', () => {
  it('registers a Wall test component with independent slider parameters and export names', () => {
    const model = getModelDefinition('opengrid-label-slot-test')!
    expect(model.defaultParameters).toEqual({ gridUnits: 3 })
    expect(model.parameterSchema[0]).toMatchObject({
      key: 'gridUnits',
      control: 'range',
      step: 1,
    })
    expect(model.exportFileName({ gridUnits: 3 })).toContain(
      'opengrid-label-slot-test-3u',
    )
    expect(systemContextForModel(model.id, 'wall')).toBe('wall')
    expect(
      parseRawParameters(rawFromParameters({ gridUnits: 5 }), model.id),
    ).toMatchObject({ valid: true, value: { gridUnits: 5 } })
  })
  it.each([1, 3, 5, 49])(
    'keeps the matching %i-unit card width and a build-plate base',
    (gridUnits) => {
      const p = { gridUnits }
      expect(validateOpenGridLabelSlotTestParameters(p).valid).toBe(true)
      expect(openGridLabelSlotTestLayoutFor(p).cardWidth).toBe(gridUnits * 10)
      expect(boundsForOpenGridLabelSlotTest(p).min[2]).toBe(0)
    },
  )
  it.each([0, 1.5, 50, NaN, '3', null])(
    'rejects invalid units %j',
    (gridUnits) => {
      expect(validateOpenGridLabelSlotTestParameters({ gridUnits }).valid).toBe(
        false,
      )
    },
  )
})
