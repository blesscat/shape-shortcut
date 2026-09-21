import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridLabelTag,
  isOpenGridLabelTagParameters,
  openGridLabelTagFileName,
  openGridLabelTagStlFileName,
  openGridLabelTagThreeMfFileName,
  OPENGRID_LABEL_TAG_CONFIGURATION,
  OPENGRID_LABEL_TAG_ICON_IDS,
  OPENGRID_LABEL_TAG_WIDTH_TIERS,
  validateOpenGridLabelTagParameters,
  validateModelParameters,
} from '../../src/cad-contract/units'
import {
  cadPathForModel,
  getModelDefinition,
  groupModelDefinitions,
} from '../../src/features/cad/model-catalog'
import { systemContextForModel } from '../../src/features/cad/system-entry-context'
import { LABEL_TAG_ICON_PATHS } from '../../src/cad-kernel/components/opengrid-label-tag/icon-paths'

describe('OpenGrid Label Tag contract', () => {
  it('uses the confirmed v1 defaults', () => {
    expect(OPENGRID_LABEL_TAG_CONFIGURATION.defaultParameters).toEqual({
      widthTier: 40,
      gripThickness: 1.2,
      icon: 'gear-fill',
      text: '',
    })
    expect(OPENGRID_LABEL_TAG_WIDTH_TIERS).toEqual([20, 30, 40, 60])
    expect(OPENGRID_LABEL_TAG_CONFIGURATION.gripThicknessMin).toBe(0.8)
    expect(OPENGRID_LABEL_TAG_CONFIGURATION.gripThicknessMax).toBe(5)
  })

  it('validates width tiers, grip range, icons, and optional text', () => {
    expect(
      validateOpenGridLabelTagParameters({
        widthTier: 40,
        gripThickness: 1.2,
        icon: 'gear-fill',
      }),
    ).toEqual({
      valid: true,
      value: { widthTier: 40, gripThickness: 1.2, icon: 'gear-fill' },
    })
    expect(
      validateOpenGridLabelTagParameters({
        widthTier: 30,
        gripThickness: 5,
        icon: 'wrench',
        text: ' 螺絲 ',
      }),
    ).toEqual({
      valid: true,
      value: { widthTier: 30, gripThickness: 5, icon: 'wrench', text: '螺絲' },
    })
    expect(
      isOpenGridLabelTagParameters({
        widthTier: 20,
        gripThickness: 0.8,
        icon: 'cpu',
      }),
    ).toBe(true)
  })

  it('rejects invalid parameters per field', () => {
    expect(
      validateOpenGridLabelTagParameters({
        widthTier: 25,
        gripThickness: 1.2,
        icon: 'gear-fill',
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        {
          field: 'widthTier',
          messageId: 'validation.labelTagWidthTierInvalid',
          params: { values: '20/30/40/60' },
        },
      ],
    })
    expect(
      validateOpenGridLabelTagParameters({
        widthTier: 40,
        gripThickness: 0.5,
        icon: 'gear-fill',
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        {
          field: 'gripThickness',
          messageId: 'validation.labelTagGripThicknessOutOfRange',
        },
      ],
    })
    expect(
      validateOpenGridLabelTagParameters({
        widthTier: 40,
        gripThickness: 5.1,
        icon: 'gear-fill',
      }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridLabelTagParameters({
        widthTier: 40,
        gripThickness: 1.2,
        icon: 'rocket',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'icon', messageId: 'validation.labelTagIconUnknown' }],
    })
    expect(
      validateOpenGridLabelTagParameters({
        widthTier: 40,
        gripThickness: 1.2,
        icon: 'gear-fill',
        text: '1234567',
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        {
          field: 'text',
          messageId: 'validation.labelTagTextTooLong',
          params: { max: 6 },
        },
      ],
    })
    expect(
      validateOpenGridLabelTagParameters({
        widthTier: 40,
        gripThickness: 1.2,
        icon: 'gear-fill',
        extra: true,
      }),
    ).toMatchObject({ valid: false })
  })

  it('routes through the shared model parameter validation', () => {
    const validation = validateModelParameters('opengrid-label-tag', {
      widthTier: 60,
      gripThickness: 2,
      icon: 'box-seam',
    })
    expect(validation).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-label-tag',
        parameters: { widthTier: 60, gripThickness: 2, icon: 'box-seam' },
      },
    })
    expect(
      validateModelParameters('opengrid-label-tag', { widthTier: 12 }),
    ).toMatchObject({ valid: false })
  })

  it('derives bounds from the width tier and grip stack-up', () => {
    expect(
      boundsForOpenGridLabelTag({
        widthTier: 40,
        gripThickness: 1.2,
        icon: 'gear-fill',
      }),
    ).toEqual({
      min: [-20, -8, 0],
      max: [20, 8, 3.6],
    })
    expect(
      boundsForOpenGridLabelTag({
        widthTier: 20,
        gripThickness: 5,
        icon: 'gear-fill',
      }),
    ).toEqual({
      min: [-10, -8, 0],
      max: [10, 8, 7.4],
    })
  })

  it('encodes parameters into stable export file names', () => {
    const parameters = {
      widthTier: 30,
      gripThickness: 1.5,
      icon: 'wrench',
    } as const
    expect(openGridLabelTagFileName(parameters)).toBe(
      'opengrid-label-tag-w30-g1.5-wrench.step',
    )
    expect(openGridLabelTagStlFileName(parameters)).toBe(
      'opengrid-label-tag-w30-g1.5-wrench.stl',
    )
    expect(openGridLabelTagThreeMfFileName(parameters)).toBe(
      'opengrid-label-tag-w30-g1.5-wrench.3mf',
    )
    expect(
      getModelDefinition('opengrid-label-tag')?.threeMfFileName?.(parameters),
    ).toBe('opengrid-label-tag-w30-g1.5-wrench.3mf')
  })

  it('lists the label tag in both desk and wall catalogs with naming compliance', () => {
    const definition = getModelDefinition('opengrid-label-tag')
    expect(definition).toMatchObject({
      id: 'opengrid-label-tag',
      buildKey: 'opengrid-label-tag',
      displayName: 'models.model.opengrid-label-tag.name',
      family: 'opengrid',
    })
    const openGridGroup = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    for (const context of ['desk', 'wall'] as const) {
      const subgroup = openGridGroup?.subgroups?.find(
        (item) => item.key === context,
      )
      expect(subgroup?.definitions.map((item) => item.id)).toContain(
        'opengrid-label-tag',
      )
    }
    expect(systemContextForModel('opengrid-label-tag', 'desk')).toBe('desk')
    expect(systemContextForModel('opengrid-label-tag', 'wall')).toBe('wall')
    expect(cadPathForModel('opengrid-label-tag')).toBe(
      '/cad/opengrid-label-tag',
    )
  })

  it('ships an icon path entry for every contract icon id', () => {
    expect(OPENGRID_LABEL_TAG_ICON_IDS.length).toBeGreaterThanOrEqual(16)
    expect(OPENGRID_LABEL_TAG_ICON_IDS.length).toBeLessThanOrEqual(24)
    for (const iconId of OPENGRID_LABEL_TAG_ICON_IDS) {
      const icon = LABEL_TAG_ICON_PATHS[iconId]
      expect(icon, iconId).toBeDefined()
      expect(icon!.paths.length).toBeGreaterThan(0)
      for (const path of icon!.paths) {
        expect(path).toMatch(/^[Mm]/)
      }
    }
    expect(Object.keys(LABEL_TAG_ICON_PATHS).sort()).toEqual(
      [...OPENGRID_LABEL_TAG_ICON_IDS].sort(),
    )
  })
})
