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
import { LABEL_CARD_ICON_PATHS } from '../../src/cad-kernel/components/opengrid-label-card/icon-paths'
import { OPENGRID_LABEL_CARD_ICON_IDS } from '../../src/cad-contract/units'

describe('OpenGrid Label Card contract', () => {
  it('uses the confirmed v2 defaults', () => {
    expect(OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters).toEqual({
      gridUnits: 4,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
      text: '',
      textHeight: OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default,
    })
  })

  it('validates style, tiers, icons, and optional text', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toEqual({
      valid: true,
      value: {
        textAlignment: 'center',
        textLine2Alignment: 'center',
        textHeight: OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default,
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
      },
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 6,
        style: 'flat',
        iconPosition: 'left',
        icon: 'wrench',
        text: ' M3x40 ',
      }),
    ).toEqual({
      valid: true,
      value: {
        textAlignment: 'center',
        textLine2Alignment: 'center',
        textHeight: OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default,
        gridUnits: 6,
        style: 'flat',
        iconPosition: 'left',
        icon: 'wrench',
        text: 'M3x40',
      },
    })
    expect(
      isOpenGridLabelCardParameters({
        gridUnits: 6,
        style: 'flat',
        iconPosition: 'left',
        icon: 'cpu',
      }),
    ).toBe(true)
  })

  it('rejects invalid parameters per field', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 50,
        style: 'flat',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'gridUnits' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
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
        gridUnits: 4,
        style: 'flat',
        iconPosition: 'left',
        icon: 'rocket',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'icon', messageId: 'validation.labelCardIconUnknown' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'flat',
        iconPosition: 'left',
        icon: 'gear-fill',
        text: '1234567',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'text', messageId: 'validation.labelCardTextTooLong' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'flat',
        iconPosition: 'left',
        icon: 'gear-fill',
        gripThickness: 1.2,
      }),
    ).toMatchObject({ valid: false })
  })

  it('routes through the shared model parameter validation', () => {
    expect(
      validateModelParameters('opengrid-label-card', {
        gridUnits: 3,
        style: 'flat',
        iconPosition: 'left',
        icon: 'box-seam',
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-label-card',
        parameters: {
          textAlignment: 'center',
          textLine2Alignment: 'center',
          textHeight: OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default,
          gridUnits: 3,
          style: 'flat',
          iconPosition: 'left',
          icon: 'box-seam',
        },
      },
    })
    expect(
      validateModelParameters('opengrid-label-card', { gridUnits: 1.2 }),
    ).toMatchObject({ valid: false })
  })

  it('derives style-dependent bounds', () => {
    expect(
      boundsForOpenGridLabelCard({
        gridUnits: 4,
        style: 'flat',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-20, -5, 0], max: [20, 5, 0.6] })
    expect(
      boundsForOpenGridLabelCard({
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-20, -5, 0], max: [20, 5, 1] })
    expect(
      boundsForOpenGridLabelCard({
        gridUnits: 2,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-10, -5, 0], max: [10, 5, 1] })
  })

  it('encodes parameters into stable export file names', () => {
    const parameters = {
      gridUnits: 3,
      style: 'flat',
      iconPosition: 'left',
      icon: 'wrench',
    } as const
    expect(openGridLabelCardFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench-left.step',
    )
    expect(openGridLabelCardStlFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench-left.stl',
    )
    expect(openGridLabelCardThreeMfFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench-left.3mf',
    )
    expect(
      getModelDefinition('opengrid-label-card')?.threeMfFileName?.(parameters),
    ).toBe('opengrid-label-card-w30-flat-wrench-left.3mf')
  })

  it('shares the icon set and width tiers with the label system', () => {
    expect(OPENGRID_LABEL_CARD_ICON_IDS.length).toBeGreaterThanOrEqual(16)
    for (const iconId of OPENGRID_LABEL_CARD_ICON_IDS.filter(
      (icon) => icon !== 'none',
    )) {
      expect(LABEL_CARD_ICON_PATHS[iconId], iconId).toBeDefined()
    }
  })
})
