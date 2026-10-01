import { describe, expect, it } from 'vitest'
import {
  displayParameterLabel,
  getModelDefinition,
  modelDefinitions,
  parameterPresentationFor,
  parameterStaticSummaryKeysFor,
  unitLabelFor,
} from '../../src/features/cad/model-catalog'
import { translate } from '../../src/i18n'

describe('localized model catalog copy', () => {
  it('resolves names, descriptions, and preview alt text in both locales', () => {
    for (const definition of modelDefinitions) {
      for (const locale of ['zh-Hant', 'en'] as const) {
        expect(translate(locale, definition.displayName)).not.toContain('⟦')
        if (definition.selectionLabel) {
          expect(translate(locale, definition.selectionLabel)).not.toContain(
            '⟦',
          )
        }
        expect(
          translate(locale, definition.selectionDescription),
        ).not.toContain('⟦')
        if (definition.previewImage) {
          expect(translate(locale, definition.previewImage.alt)).not.toContain(
            '⟦',
          )
        }
      }
    }
  })

  it('uses semantic parameter fields rather than translated text for label layout', () => {
    const box = modelDefinitions.find((definition) => definition.id === 'box')!
    const rows = modelDefinitions
      .find((definition) => definition.id === 'hsw-cell')!
      .parameterSchema.find((field) => field.key === 'rows')!

    expect(displayParameterLabel(box.parameterSchema[0]!, 'zh-Hant')).toBe(
      '寬度（X）',
    )
    expect(displayParameterLabel(box.parameterSchema[0]!, 'en')).toBe(
      'Width（X）',
    )
    expect(displayParameterLabel(rows, 'zh-Hant')).toBe('Y')
    expect(displayParameterLabel(rows, 'en')).toBe('Y')
  })

  it('localizes units without changing parameter or model identifiers', () => {
    const definition = modelDefinitions.find(
      (candidate) => candidate.id === 'hexagonal-column',
    )!
    const count = definition.parameterSchema.find(
      (field) => field.key === 'count',
    )!

    expect(unitLabelFor('zh-Hant', count.unit)).toBe('支')
    expect(unitLabelFor('en', count.unit)).toBe('columns')
    expect(definition.id).toBe('hexagonal-column')
    expect(definition.buildKey).toBe('hexagonal-column')
  })

  it('uses explicit presentation metadata for custom controls and schema defaults', () => {
    const board = getModelDefinition('opengrid')!
    const box = getModelDefinition('box')!
    const snapRemover = getModelDefinition('opengrid-snap-remover')!

    expect(parameterPresentationFor(board)).toEqual({
      kind: 'adjustable',
      summaryKey: 'models.model.opengrid.staticParameters',
      detailsKey: 'models.model.opengrid.parameterDetails',
    })
    expect(parameterStaticSummaryKeysFor(board)).toEqual([
      'models.model.opengrid.staticParameters',
      'models.model.opengrid.parameterDetails',
    ])
    expect(parameterPresentationFor(box)).toEqual({ kind: 'adjustable' })
    expect(parameterPresentationFor(snapRemover)).toEqual({ kind: 'fixed' })
    expect(parameterStaticSummaryKeysFor(snapRemover)).toEqual([])
  })

  it('provides localized dialog actions and detail fallbacks', () => {
    expect(translate('zh-Hant', 'models.details')).toBe('詳情')
    expect(translate('en', 'models.close')).toBe('Close')
    expect(translate('zh-Hant', 'models.fixedParameters')).toBe(
      '固定幾何，沒有可調參數。',
    )
    expect(translate('en', 'models.adjustableSettingsMultiple')).toBe(
      'Adjustable settings (multiple)',
    )
  })

  it('shares seat labels and localizes organizer body modes and Z', () => {
    const key = 'panel.seat.detachableCornerSeat'

    expect(translate('zh-Hant', key)).toBe('鎖定角座')
    expect(translate('en', key)).toBe('Locking corner seats')
    expect(translate('zh-Hant', 'panel.organizerBox.body.normal')).toBe(
      '普通模式',
    )
    expect(translate('zh-Hant', 'panel.organizerBox.body.stackable')).toBe(
      '堆疊模式',
    )
    expect(translate('zh-Hant', 'parameter.organizerStackingClearance')).toBe(
      '堆疊淨空',
    )
  })
})
