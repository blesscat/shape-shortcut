import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridLabelCard,
  isOpenGridLabelCardParameters,
  openGridLabelCardFileName,
  openGridLabelCardStlFileName,
  openGridLabelCardThreeMfFileName,
  OPENGRID_LABEL_CARD_CONFIGURATION,
  validateOpenGridLabelCardParameters,
  validateModelParameters,
} from '../../src/cad-contract/units'
import { getModelDefinition } from '../../src/features/cad/model-catalog'
import { LABEL_TAG_ICON_PATHS } from '../../src/cad-kernel/components/opengrid-label-tag/icon-paths'
import { OPENGRID_LABEL_CARD_ICON_IDS } from '../../src/cad-contract/units'

describe('OpenGrid Label Card contract', () => {
  it('uses the confirmed v2 defaults', () => {
    expect(OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters).toEqual({
      widthTier: 40,
      style: 'raised',
      icon: 'gear-fill',
      text: '',
    })
  })

  it('validates style, tiers, icons, and optional text', () => {
    expect(
      validateOpenGridLabelCardParameters({
        widthTier: 40,
        style: 'raised',
        icon: 'gear-fill',
      }),
    ).toEqual({
      valid: true,
      value: { widthTier: 40, style: 'raised', icon: 'gear-fill' },
    })
    expect(
      validateOpenGridLabelCardParameters({
        widthTier: 20,
        style: 'flat',
        icon: 'wrench',
        text: ' M3x40 ',
      }),
    ).toEqual({
      valid: true,
      value: { widthTier: 20, style: 'flat', icon: 'wrench', text: 'M3x40' },
    })
    expect(
      isOpenGridLabelCardParameters({
        widthTier: 60,
        style: 'flat',
        icon: 'cpu',
      }),
    ).toBe(true)
  })

  it('rejects invalid parameters per field', () => {
    expect(
      validateOpenGridLabelCardParameters({
        widthTier: 50,
        style: 'flat',
        icon: 'gear-fill',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'widthTier' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        widthTier: 40,
        style: 'embossed',
        icon: 'gear-fill',
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        { field: 'style', messageId: 'validation.labelCardStyleInvalid' },
      ],
    })
    expect(
      validateOpenGridLabelCardParameters({
        widthTier: 40,
        style: 'flat',
        icon: 'rocket',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'icon', messageId: 'validation.labelCardIconUnknown' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        widthTier: 40,
        style: 'flat',
        icon: 'gear-fill',
        text: '1234567',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'text', messageId: 'validation.labelCardTextTooLong' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        widthTier: 40,
        style: 'flat',
        icon: 'gear-fill',
        gripThickness: 1.2,
      }),
    ).toMatchObject({ valid: false })
  })

  it('routes through the shared model parameter validation', () => {
    expect(
      validateModelParameters('opengrid-label-card', {
        widthTier: 30,
        style: 'flat',
        icon: 'box-seam',
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-label-card',
        parameters: { widthTier: 30, style: 'flat', icon: 'box-seam' },
      },
    })
    expect(
      validateModelParameters('opengrid-label-card', { widthTier: 12 }),
    ).toMatchObject({ valid: false })
  })

  it('derives style-dependent bounds', () => {
    expect(
      boundsForOpenGridLabelCard({
        widthTier: 40,
        style: 'flat',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-20, -5, 0], max: [20, 5, 0.6] })
    expect(
      boundsForOpenGridLabelCard({
        widthTier: 40,
        style: 'raised',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-20, -5, 0], max: [20, 5, 1] })
    expect(
      boundsForOpenGridLabelCard({
        widthTier: 20,
        style: 'raised',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-10, -5, 0], max: [10, 5, 1] })
  })

  it('encodes parameters into stable export file names', () => {
    const parameters = {
      widthTier: 30,
      style: 'flat',
      icon: 'wrench',
    } as const
    expect(openGridLabelCardFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench.step',
    )
    expect(openGridLabelCardStlFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench.stl',
    )
    expect(openGridLabelCardThreeMfFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench.3mf',
    )
    expect(
      getModelDefinition('opengrid-label-card')?.threeMfFileName?.(parameters),
    ).toBe('opengrid-label-card-w30-flat-wrench.3mf')
  })

  it('shares the icon set and width tiers with the label system', () => {
    expect(OPENGRID_LABEL_CARD_ICON_IDS.length).toBeGreaterThanOrEqual(16)
    for (const iconId of OPENGRID_LABEL_CARD_ICON_IDS) {
      expect(LABEL_TAG_ICON_PATHS[iconId], iconId).toBeDefined()
    }
  })
})
