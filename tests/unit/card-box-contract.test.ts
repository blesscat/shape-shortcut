import { describe, expect, it } from 'vitest'
import {
  cardBoxHasAccentArt,
  CARD_BOX_CONFIGURATION,
  boundsForCardBox,
  cardBoxFileName,
  cardBoxInteriorWidth,
  cardBoxStlFileName,
  cardBoxThreeMfFileName,
  cardBoxToken,
  validateCardBoxParameters,
  type CardBoxParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<CardBoxParameters> = {},
): CardBoxParameters {
  return {
    ...CARD_BOX_CONFIGURATION.defaultParameters,
    ...overrides,
  }
}

describe('card-box parameter contract', () => {
  it('uses the agreed defaults', () => {
    const validation = validateCardBoxParameters({})
    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(validation.value.part).toBe('assembly')
    expect(validation.value.cardWidth).toBe(70)
    expect(validation.value.cardHeight).toBe(120)
    expect(validation.value.storageDepth).toBe(72)
    expect(validation.value.dividerTabPosition).toBe('left')
    expect(validation.value.dividerText).toBe('')
    expect(validation.value.coverTitle).toBe('CARDS')
    expect(validation.value.coverVerticalPosition).toBe(30)
    expect(validation.value.usesCoverSvg).toBe(false)
  })

  it('adds the 0.5 mm interior allowance internally only', () => {
    expect(cardBoxInteriorWidth(70)).toBe(70.5)
    expect(cardBoxInteriorWidth(40)).toBe(40.5)
  })

  it('rejects out-of-range and non-finite dimensions with field issues', () => {
    expect(validateCardBoxParameters({ cardWidth: 39 }).valid).toBe(false)
    expect(validateCardBoxParameters({ cardWidth: 101 }).valid).toBe(false)
    expect(validateCardBoxParameters({ cardHeight: 59 }).valid).toBe(false)
    expect(validateCardBoxParameters({ cardHeight: 151 }).valid).toBe(false)
    expect(validateCardBoxParameters({ storageDepth: 19 }).valid).toBe(false)
    expect(validateCardBoxParameters({ storageDepth: 151 }).valid).toBe(false)
    const nonFinite = validateCardBoxParameters({
      cardWidth: Number.NaN,
    })
    expect(nonFinite.valid).toBe(false)
    if (nonFinite.valid) return
    expect(nonFinite.issues[0]?.field).toBe('cardWidth')
  })

  it('rejects unknown part values with a field-specific issue', () => {
    const validation = validateCardBoxParameters({ part: 'lid-solo' })
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues[0]?.field).toBe('part')
    expect(validation.issues[0]?.messageId).toBe(
      'validation.cardBoxPartInvalid',
    )
  })

  it('keeps the fixed wall thickness and clearance out of the parameter set', () => {
    const keys = Object.keys(CARD_BOX_CONFIGURATION.defaultParameters)
    expect(keys).not.toContain('wallThickness')
    expect(keys).not.toContain('clearance')
    expect(CARD_BOX_CONFIGURATION.wallThickness).toBe(3)
    expect(CARD_BOX_CONFIGURATION.clearance).toBe(0.2)
  })

  it('requires a fingerprint when the cover uses an imported SVG', () => {
    const validation = validateCardBoxParameters({
      usesCoverSvg: true,
      coverSvgFingerprint: '',
    })
    expect(validation.valid).toBe(false)
  })
})

describe('card-box export file names', () => {
  it('encodes card size for box and lid without collisions across sizes', () => {
    const boxDefault = cardBoxFileName(parameters({ part: 'box' }))
    const boxOther = cardBoxFileName(
      parameters({
        part: 'box',
        cardWidth: 63,
        cardHeight: 88,
        storageDepth: 60,
      }),
    )
    const lid = cardBoxFileName(parameters({ part: 'lid' }))
    expect(boxDefault).toBe('card-box-box-70x120x72.step')
    expect(lid).toBe('card-box-lid-70x120x72.step')
    expect(boxDefault).not.toBe(boxOther)
    expect(cardBoxStlFileName(parameters({ part: 'box' }))).toBe(
      'card-box-box-70x120x72.stl',
    )
  })

  it('never lets two dividers that differ only in text collide', () => {
    const a = cardBoxFileName(
      parameters({ part: 'divider', dividerText: ' cards ' }),
    )
    const b = cardBoxFileName(
      parameters({ part: 'divider', dividerText: 'cards' }),
    )
    const c = cardBoxFileName(parameters({ part: 'divider', dividerText: '' }))
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
    expect(b).not.toBe(c)
    expect(c).toContain('blank')
    expect(a).toMatch(
      /^card-box-divider-70x120x72-left-raised-[0-9a-f]{8}\.step$/,
    )
  })

  it('differentiates divider tab positions and styles in the name', () => {
    const left = cardBoxFileName(parameters({ part: 'divider' }))
    const center = cardBoxFileName(
      parameters({ part: 'divider', dividerTabPosition: 'center' }),
    )
    const flat = cardBoxFileName(
      parameters({ part: 'divider', dividerStyle: 'flat' }),
    )
    expect(new Set([left, center, flat]).size).toBe(3)
  })

  it('derives the cover art token from title, subtitle and SVG fingerprint', () => {
    const titled = cardBoxFileName(parameters({ part: 'cover' }))
    const subtitled = cardBoxFileName(
      parameters({ part: 'cover', coverSubtitle: 'season 2' }),
    )
    const svg = cardBoxFileName(
      parameters({
        part: 'cover',
        usesCoverSvg: true,
        coverSvgFingerprint: 'abc123',
      }),
    )
    expect(new Set([titled, subtitled, svg]).size).toBe(3)
    const blankCover = cardBoxFileName(
      parameters({ part: 'cover', coverTitle: '' }),
    )
    expect(blankCover).toContain('blank')
  })

  it('offers two-color 3MF exactly for accent parts in either style', () => {
    // Raised divider with text: 3MF available (label-card semantics).
    expect(
      cardBoxThreeMfFileName(
        parameters({ part: 'divider', dividerText: 'TCG' }),
      ),
    ).toMatch(/\.3mf$/)
    expect(
      cardBoxThreeMfFileName(
        parameters({
          part: 'divider',
          dividerText: 'TCG',
          dividerStyle: 'flat',
        }),
      ),
    ).toMatch(/\.3mf$/)
    // Blank parts: STEP/STL only.
    expect(cardBoxThreeMfFileName(parameters({ part: 'divider' }))).toBeNull()
    expect(
      cardBoxThreeMfFileName(parameters({ part: 'cover', coverTitle: '' })),
    ).toBeNull()
    // Box, lid and assembly never offer 3MF.
    expect(cardBoxThreeMfFileName(parameters({ part: 'box' }))).toBeNull()
    expect(cardBoxThreeMfFileName(parameters({ part: 'lid' }))).toBeNull()
    expect(cardBoxThreeMfFileName(parameters({ part: 'assembly' }))).toBeNull()
  })

  it('treats whitespace-only art as blank for 3MF gating', () => {
    expect(
      cardBoxHasAccentArt(parameters({ part: 'divider', dividerText: '   ' })),
    ).toBe(false)
    expect(
      cardBoxHasAccentArt(
        parameters({ part: 'cover', coverTitle: '  ', coverSubtitle: ' \n' }),
      ),
    ).toBe(false)
  })

  it('refuses file names for the assembly', () => {
    expect(() => cardBoxFileName(parameters({ part: 'assembly' }))).toThrow(
      'CARD_BOX_ASSEMBLY_EXPORT_FORBIDDEN',
    )
  })
})

describe('card-box bounds', () => {
  it('reports the assembled frame for the assembly', () => {
    const bounds = boundsForCardBox(parameters({ part: 'assembly' }))
    expect(bounds.min[2]).toBe(0)
    // The lid top (H+9) clears the box back bead (H+7.4).
    expect(bounds.max[2]).toBeCloseTo(120 + 9, 5)
    expect(bounds.max[0]).toBeCloseTo(38.25, 5)
  })

  it('reports the flipped print orientation for the lid (z ≥ 0)', () => {
    const bounds = boundsForCardBox(parameters({ part: 'lid' }))
    expect(bounds.min[2]).toBe(0)
    expect(bounds.max[2]).toBeCloseTo(16.8, 5)
  })

  it('reports flat print bounds for divider and cover', () => {
    const divider = boundsForCardBox(parameters({ part: 'divider' }))
    expect(divider.min[2]).toBe(0)
    expect(divider.max[1]).toBeCloseTo(125, 5)
    const cover = boundsForCardBox(parameters({ part: 'cover' }))
    expect(cover.min[2]).toBe(0)
    expect(cover.max[2]).toBeCloseTo(0.6, 5)
    expect(cover.max[1]).toBeCloseTo(120, 5)
  })
})

describe('card-box filename tokens', () => {
  it('hashes non-empty text stably and marks blank art', () => {
    expect(cardBoxToken('')).toBe('blank')
    expect(cardBoxToken('   ')).toBe('blank')
    expect(cardBoxToken('CARDS')).toMatch(/^[0-9a-f]{8}$/)
    expect(cardBoxToken('CARDS')).toBe(cardBoxToken('CARDS'))
    expect(cardBoxToken('CARDS')).not.toBe(cardBoxToken('cards'))
  })
})
