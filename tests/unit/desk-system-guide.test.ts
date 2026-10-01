import { describe, expect, it } from 'vitest'
import {
  deskQuickStartComponents,
  deskQuickStartEntries,
} from '../../src/features/docs/desk-system-guide'
import { missingLocaleMessageKeys, translate } from '../../src/i18n'

describe('Desk System documentation guide', () => {
  it('keeps the physical workflow in the documented component order', () => {
    expect(deskQuickStartComponents).toEqual([
      { role: 'board', modelId: 'opengrid' },
      { role: 'snap', modelId: 'opengrid-snap' },
      { role: 'locating-post', modelId: 'opengrid-pillar' },
      { role: 'grid-box', modelId: 'opengrid-stackable-box' },
      { role: 'organizer-box', modelId: 'opengrid-organizer-box' },
      { role: 'round-box', modelId: 'opengrid-stackable-cylinder' },
    ])
  })

  it('derives locale-aware Desk links from existing model definitions', () => {
    expect(deskQuickStartEntries('en').map((entry) => entry.href)).toEqual([
      '/en/cad/opengrid?system=desk',
      '/en/cad/opengrid-snap?system=desk',
      '/en/cad/opengrid-pillar?system=desk',
      '/en/cad/opengrid-stackable-box?system=desk',
      '/en/cad/opengrid-organizer-box?system=desk',
      '/en/cad/opengrid-stackable-cylinder?system=desk',
    ])
    expect(deskQuickStartEntries('zh-Hant').map((entry) => entry.href)).toEqual(
      [
        '/zh-Hant/cad/opengrid?system=desk',
        '/zh-Hant/cad/opengrid-snap?system=desk',
        '/zh-Hant/cad/opengrid-pillar?system=desk',
        '/zh-Hant/cad/opengrid-stackable-box?system=desk',
        '/zh-Hant/cad/opengrid-organizer-box?system=desk',
        '/zh-Hant/cad/opengrid-stackable-cylinder?system=desk',
      ],
    )
  })

  it('keeps both locale catalogs complete and the built-in-seat rule explicit', () => {
    expect(missingLocaleMessageKeys('zh-Hant')).toEqual([])
    expect(missingLocaleMessageKeys('en')).toEqual([])
    expect(
      translate('zh-Hant', 'docs.deskQuickStart.locating.builtin.noPost'),
    ).toContain('不用另印鎖定角座')
    expect(
      translate('en', 'docs.deskQuickStart.locating.builtin.noPost'),
    ).toContain('you print nothing extra')
  })
})
