// The divider-too-wide error reaches the UI with the plate's ordinal: the
// builder suffixes GAME_BOX_DIVIDER_TEXT_TOO_WIDE:<n>, the runtime reads the
// ordinal back, the error rules map it to GAME_BOX_GEOMETRY_INVALID, and the
// localized message renders the number in both locales without an unresolved
// placeholder.
import { describe, expect, it } from 'vitest'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'
import { diagnostic } from '../../src/cad-contract/diagnostics'
import { formatDiagnostic } from '../../src/i18n/diagnostics'
import { gameBoxTooWideDividerOrdinal } from '../../src/workers/cad-worker-runtime'
import type { Locale } from '../../src/i18n'

describe('game-box divider too-wide error mapping', () => {
  it('maps the suffixed message to the game-box geometry code', () => {
    expect(
      cadErrorCodeFor('GAME_BOX_DIVIDER_TEXT_TOO_WIDE:2', 'model.generate'),
    ).toBe('GAME_BOX_GEOMETRY_INVALID')
    expect(
      cadErrorStageFor('model.generate', 'GAME_BOX_DIVIDER_TEXT_TOO_WIDE:2'),
    ).toBe('building')
  })

  it('reads the divider ordinal from the suffixed message', () => {
    expect(
      gameBoxTooWideDividerOrdinal('GAME_BOX_DIVIDER_TEXT_TOO_WIDE:2'),
    ).toBe(2)
    expect(
      gameBoxTooWideDividerOrdinal('GAME_BOX_DIVIDER_TEXT_TOO_WIDE:5'),
    ).toBe(5)
    expect(
      gameBoxTooWideDividerOrdinal('GAME_BOX_DIVIDER_TEXT_TOO_WIDE'),
    ).toBeUndefined()
  })

  it('renders the divider number from the read ordinal with no placeholder', () => {
    // The descriptor is built from the ordinal the runtime reader returns -
    // the same path the Worker matcher takes.
    const ordinal = gameBoxTooWideDividerOrdinal(
      'GAME_BOX_DIVIDER_TEXT_TOO_WIDE:2',
    )
    const descriptor = diagnostic('validation.gameBoxDividerTextTooWide', {
      ...(ordinal !== undefined ? { divider: ordinal } : {}),
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
