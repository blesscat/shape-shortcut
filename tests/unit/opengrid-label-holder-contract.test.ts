import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridLabelHolder,
  isOpenGridLabelHolderParameters,
  openGridLabelHolderFileName,
  openGridLabelHolderStlFileName,
  OPENGRID_LABEL_HOLDER_CONFIGURATION,
  validateModelParameters,
  validateOpenGridLabelHolderParameters,
} from '../../src/cad-contract/units'
import { getModelDefinition } from '../../src/features/cad/model-catalog'

describe('OpenGrid Label Holder contract', () => {
  it('uses the confirmed v2 defaults', () => {
    expect(OPENGRID_LABEL_HOLDER_CONFIGURATION.defaultParameters).toEqual({
      widthTier: 40,
      gripThickness: 1.2,
    })
    expect(OPENGRID_LABEL_HOLDER_CONFIGURATION.gripThicknessMin).toBe(0.8)
    expect(OPENGRID_LABEL_HOLDER_CONFIGURATION.gripThicknessMax).toBe(5)
  })

  it('validates width tiers and grip thickness', () => {
    expect(validateOpenGridLabelHolderParameters({})).toEqual({
      valid: true,
      value: { widthTier: 40, gripThickness: 1.2 },
    })
    expect(
      validateOpenGridLabelHolderParameters({
        widthTier: 30,
        gripThickness: 5,
      }),
    ).toEqual({
      valid: true,
      value: { widthTier: 30, gripThickness: 5 },
    })
    expect(
      isOpenGridLabelHolderParameters({ widthTier: 20, gripThickness: 0.8 }),
    ).toBe(true)
    expect(
      validateOpenGridLabelHolderParameters({
        widthTier: 25,
        gripThickness: 2,
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'widthTier' }],
    })
    expect(
      validateOpenGridLabelHolderParameters({
        widthTier: 40,
        gripThickness: 6,
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'gripThickness' }],
    })
    expect(
      validateOpenGridLabelHolderParameters({
        widthTier: 40,
        gripThickness: 2,
        icon: 'gear-fill',
      }),
    ).toMatchObject({ valid: false })
  })

  it('routes through the shared model parameter validation', () => {
    expect(
      validateModelParameters('opengrid-label-holder', {
        widthTier: 60,
        gripThickness: 2.5,
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-label-holder',
        parameters: { widthTier: 60, gripThickness: 2.5 },
      },
    })
  })

  it('derives bounds from the card width tier and grip stack-up', () => {
    expect(
      boundsForOpenGridLabelHolder({ widthTier: 40, gripThickness: 1.2 }),
    ).toEqual({ min: [-21.6, -8, 0], max: [21.6, 8, 5] })
    expect(
      boundsForOpenGridLabelHolder({ widthTier: 20, gripThickness: 5 }),
    ).toEqual({ min: [-11.6, -8, 0], max: [11.6, 8, 8.8] })
  })

  it('exposes STEP/STL names and no 3MF export', () => {
    const parameters = { widthTier: 30, gripThickness: 1.5 } as const
    expect(openGridLabelHolderFileName(parameters)).toBe(
      'opengrid-label-holder-w30-g1.5.step',
    )
    expect(openGridLabelHolderStlFileName(parameters)).toBe(
      'opengrid-label-holder-w30-g1.5.stl',
    )
    expect(
      getModelDefinition('opengrid-label-holder')?.threeMfFileName,
    ).toBeUndefined()
    expect(getModelDefinition('opengrid-label-holder')).toMatchObject({
      id: 'opengrid-label-holder',
      buildKey: 'opengrid-label-holder',
      displayName: 'models.model.opengrid-label-holder.name',
      supportedSystemContexts: ['desk', 'wall'],
    })
  })
})
