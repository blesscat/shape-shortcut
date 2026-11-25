// The divider-too-wide error reaches the UI with the plate's ordinal: the
// builder suffixes GAME_BOX_DIVIDER_TEXT_TOO_WIDE:<n>, the error rules map
// it to GAME_BOX_GEOMETRY_INVALID, and the localized message renders the
// number in both locales without an unresolved placeholder.
import { describe, expect, it } from 'vitest'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'
import { diagnostic } from '../../src/cad-contract/diagnostics'
import { formatDiagnostic } from '../../src/i18n/diagnostics'
import { translate, type Locale } from '../../src/i18n'

const message = 'GAME_BOX_DIVIDER_TEXT_TOO_WIDE:2'

describe('game-box divider too-wide error mapping', () => {
  it('maps the suffixed message to the game-box geometry code', () => {
    expect(cadErrorCodeFor(message, 'model.generate')).toBe(
      'GAME_BOX_GEOMETRY_INVALID',
    )
    expect(cadErrorStageFor('model.generate', message)).toBe('building')
  })

  it('renders the divider number in both locales with no placeholder', () => {
    const descriptor = diagnostic('validation.gameBoxDividerTextTooWide', {
      divider: 2,
    })
    for (const locale of ['en', 'zh-Hant'] as Locale[]) {
      const text = formatDiagnostic(locale, descriptor)
      // The number is rendered and the placeholder is resolved.
      expect(text, locale).toContain('2')
      expect(text, locale).not.toContain('⟦')
    }
  })

  it('keeps the rule matching on the unsuffixed pattern', () => {
    expect(
      cadErrorCodeFor('GAME_BOX_DIVIDER_TEXT_TOO_WIDE', 'model.generate'),
    ).toBe('GAME_BOX_GEOMETRY_INVALID')
  })
})
