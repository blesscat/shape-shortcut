import { describe, expect, it } from 'vitest'
import {
  deskQuickStartComponents,
  deskQuickStartEntries,
  deskStarterPrintPlan,
  deskFixingPrintPlan,
} from '../../src/features/docs/desk-system-guide'
import { missingLocaleMessageKeys, translate } from '../../src/i18n'

describe('Desk System documentation guide', () => {
  it('starts with one Board and one Grid Box, with explicit working settings', () => {
    for (const locale of ['zh-Hant', 'en'] as const) {
      const plan = deskStarterPrintPlan(locale)
      expect(
        plan.map(({ entry, quantity }) => [entry.modelId, quantity]),
      ).toEqual([
        ['opengrid', 1],
        ['opengrid-stackable-box', 1],
      ])
      expect(plan.map(({ entry }) => entry.href)).toEqual([
        `/${locale}/cad/opengrid?system=desk`,
        `/${locale}/cad/opengrid-stackable-box?system=desk`,
      ])
      const settings = plan.map(({ settingsKey }) =>
        translate(locale, settingsKey),
      )
      expect(settings[0]).toContain('2×2')
      expect(settings[1]).toContain('2×2')
      expect(settings[1]).toContain(translate(locale, 'panel.seat.none'))
    }
  })

  it('adds Snap for fixing and separate seats only for the locking-seat route', () => {
    const integrated = deskFixingPrintPlan('en', 'integrated')
    const separate = deskFixingPrintPlan('en', 'detachable-corner-seat')
    expect(
      integrated.map(({ entry, quantity }) => [entry.modelId, quantity]),
    ).toEqual([
      ['opengrid', 1],
      ['opengrid-snap', 4],
      ['opengrid-stackable-box', 1],
    ])
    expect(
      separate.map(({ entry, quantity }) => [entry.modelId, quantity]),
    ).toEqual([
      ['opengrid', 1],
      ['opengrid-snap', 4],
      ['opengrid-pillar', 4],
      ['opengrid-stackable-box', 1],
    ])
    expect(translate('en', integrated.at(-1)!.settingsKey)).toContain(
      translate('en', 'panel.seat.integrated'),
    )
    expect(translate('en', separate.at(-1)!.settingsKey)).toContain(
      translate('en', 'panel.seat.detachableCornerSeat'),
    )
  })

  it.each([
    {
      messageKey: 'docs.starter.boardSettings',
      panelKeys: [
        'panel.opengrid.profile',
        'panel.opengrid.variant.lite',
        'panel.opengrid.screwMode',
      ],
    },
    {
      messageKey: 'docs.starter.boxSettings',
      panelKeys: [
        'panel.box.topRimStacking',
        'panel.box.bottom',
        'panel.seat.none',
      ],
    },
    {
      messageKey: 'docs.direct.gridSettings',
      panelKeys: ['panel.box.topRimStacking', 'panel.seat.none'],
    },
    {
      messageKey: 'docs.direct.organizerSettings',
      panelKeys: [
        'panel.boxMode',
        'panel.organizerBox.body.stackable',
        'panel.seat.none',
      ],
    },
    {
      messageKey: 'docs.fixing.snapSettings',
      panelKeys: ['panel.snap.variantLite', 'panel.snap.footprintFull'],
    },
    {
      messageKey: 'docs.fixing.seatSettings',
      panelKeys: ['panel.pillar.version', 'panel.pillar.detachableCornerSeat'],
    },
    {
      messageKey: 'docs.fixing.integratedBoxSettings',
      panelKeys: ['panel.box.topRimStacking', 'panel.seat.integrated'],
    },
    {
      messageKey: 'docs.fixing.separateBoxSettings',
      panelKeys: [
        'panel.box.topRimStacking',
        'panel.seat.detachableCornerSeat',
      ],
    },
    {
      messageKey: 'docs.faq.reprint.answer',
      panelKeys: ['panel.seat.integrated', 'panel.seat.detachableCornerSeat'],
    },
  ])(
    '$messageKey uses the live generator labels',
    ({ messageKey, panelKeys }) => {
      for (const locale of ['zh-Hant', 'en'] as const) {
        const instructions = translate(locale, messageKey)
        for (const panelKey of panelKeys) {
          expect(instructions).toContain(translate(locale, panelKey))
        }
      }
    },
  )

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
