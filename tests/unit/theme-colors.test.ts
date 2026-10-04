import { describe, expect, it } from 'vitest'

import {
  CAD_VIEWPORT_THEME_FALLBACK,
  normalizeColorToken,
  resolveCadViewportTheme,
} from '../../src/features/cad/viewport/theme'

describe('normalizeColorToken', () => {
  it('expands LightningCSS 8-digit hex to rgba() THREE.Color can parse', () => {
    // #52525bd9 = rgba(82, 82, 91, 0.851): the minified light grid-minor.
    expect(normalizeColorToken('#52525bd9')).toBe('rgba(82, 82, 91, 0.851)')
    expect(normalizeColorToken('#F4EDE73D')).toBe('rgba(244, 237, 231, 0.239)')
  })

  it('expands 4-digit alpha hex too', () => {
    expect(normalizeColorToken('#1234')).toBe('rgba(17, 34, 51, 0.267)')
  })

  it('leaves forms THREE.Color already understands untouched', () => {
    expect(normalizeColorToken('#52525b')).toBe('#52525b')
    expect(normalizeColorToken('rgba(82, 82, 91, 0.85)')).toBe(
      'rgba(82, 82, 91, 0.85)',
    )
    expect(normalizeColorToken('  #fff  ')).toBe('#fff')
  })
})

describe('resolveCadViewportTheme', () => {
  it('normalizes minified tokens before they reach the viewport', () => {
    const theme = resolveCadViewportTheme((name) =>
      name.endsWith('grid-minor') ? '#52525bd9' : '',
    )
    expect(theme.gridMinor).toBe('rgba(82, 82, 91, 0.851)')
  })

  it('still falls back to the pinned theme when a token is missing', () => {
    const theme = resolveCadViewportTheme(() => '')
    expect(theme.gridMinor).toBe(CAD_VIEWPORT_THEME_FALLBACK.gridMinor)
  })
})
