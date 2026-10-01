import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isLocale,
  missingLocaleMessageKeys,
  missingMessageKeys,
  translate,
} from '../../src/i18n'

describe('locale translation foundation', () => {
  it('recognizes only the supported locales and exposes the default locale', () => {
    expect(SUPPORTED_LOCALES).toEqual(['zh-Hant', 'en'])
    expect(DEFAULT_LOCALE).toBe('zh-Hant')
    expect(isLocale('zh-Hant')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('ja')).toBe(false)
  })

  it('translates a known message and interpolates named values', () => {
    expect(
      translate('zh-Hant', 'panel.tissueBox.mountingGrid', {
        columns: '2',
        rows: '3',
      }),
    ).toBe(
      'OpenConnect 接口孔陣列：X 2 欄 × Y 3 列（接口平面的左右／上下；安裝後上下對應 Z）。',
    )
    expect(
      translate('en', 'panel.tissueBox.mountingGrid', {
        columns: '2',
        rows: '3',
      }),
    ).toBe(
      'OpenConnect socket grid: X 2 columns × Y 3 rows (left/right and up/down on the mounting plane; installed up/down corresponds to Z).',
    )
  })

  it('does not silently fall back when a message key is missing', () => {
    expect(translate('en', 'test.missing')).toBe('⟦test.missing⟧')
  })

  it('reports keys missing from a locale catalog', () => {
    expect(
      missingMessageKeys(
        { 'test.one': '一', 'test.two': '二' },
        { 'test.one': 'one' },
      ),
    ).toEqual(['test.two'])
  })

  it('keeps every supported locale catalog complete', () => {
    expect(missingLocaleMessageKeys('zh-Hant')).toEqual([])
    expect(missingLocaleMessageKeys('en')).toEqual([])
  })
})
