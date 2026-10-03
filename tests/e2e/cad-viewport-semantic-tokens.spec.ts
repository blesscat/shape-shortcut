import { expect, test, type Page } from '@playwright/test'
import type { Locale } from '../../src/i18n'
import { localizedPathFor } from '../../src/i18n/routes'

const LOCALE = 'zh-Hant' as const

type SelectionErrorTokens = {
  selection: string
  selectionFill: string
  error: string
  errorFill: string
}

type BoardTokens = {
  boardFace: string
  boardEdge: string
  contactShadow: string
  gridMinor: string
  viewportBackground: string
}

async function readSelectionErrorTokens(
  page: Page,
): Promise<SelectionErrorTokens> {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const read = (name: string) => root.getPropertyValue(name).trim()
    return {
      selection: read('--cad-viewport-selection'),
      selectionFill: read('--cad-viewport-selection-fill'),
      error: read('--cad-viewport-error'),
      errorFill: read('--cad-viewport-error-fill'),
    }
  })
}

async function readBoardTokens(page: Page): Promise<BoardTokens> {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const read = (name: string) => root.getPropertyValue(name).trim()
    return {
      boardFace: read('--cad-viewport-board-face'),
      boardEdge: read('--cad-viewport-board-edge'),
      contactShadow: read('--cad-viewport-contact-shadow'),
      gridMinor: read('--cad-viewport-grid-minor'),
      viewportBackground: read('--color-viewport'),
    }
  })
}

function parseHex(value: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  if (!match) throw new Error(`Expected hex color, got: ${value}`)
  return [
    Number.parseInt(match[1]!, 16),
    Number.parseInt(match[2]!, 16),
    Number.parseInt(match[3]!, 16),
  ]
}

/** Relative luminance: the grayscale-simulation stand-in for "can a
    color-blind or grayscale view still tell the two states apart". */
function relativeLuminance(hex: string): number {
  const channels = parseHex(hex).map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return (
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)
  )
}

test.describe('CAD viewport semantic tokens (Part D v2 / design-spec-4.2.1)', () => {
  test('selection and error stay distinguishable in light and dark', async ({
    page,
  }) => {
    await page.goto(localizedPathFor(LOCALE, '/cad/playground'))

    const light = await readSelectionErrorTokens(page)
    expect(light.selection.toLowerCase()).toBe('#0284c7')
    expect(light.error.toLowerCase()).toBe('#d6452b')
    expect(light.selection).not.toBe(light.error)
    expect(light.selectionFill).not.toBe(light.errorFill)
    const lightLuminanceGap = Math.abs(
      relativeLuminance(light.selection) - relativeLuminance(light.error),
    )
    expect(lightLuminanceGap).toBeGreaterThan(0.01)

    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    const dark = await readSelectionErrorTokens(page)
    expect(dark.selection.toLowerCase()).toBe('#6fc7f2')
    expect(dark.error.toLowerCase()).toBe('#ff8a70')
    expect(dark.selection).not.toBe(dark.error)
    const darkLuminanceGap = Math.abs(
      relativeLuminance(dark.selection) - relativeLuminance(dark.error),
    )
    expect(darkLuminanceGap).toBeGreaterThan(0.01)
    // The dark set is its own calibration, not a derivation of light.
    expect(dark.selection).not.toBe(light.selection)
    expect(dark.error).not.toBe(light.error)
  })

  test('board tokens keep the plate a visible step from the scene ground', async ({
    page,
  }) => {
    await page.goto(localizedPathFor(LOCALE, '/cad/playground'))

    const light = await readBoardTokens(page)
    expect(light.boardFace.toLowerCase()).toBe('#efe6dc')
    expect(light.boardFace.toLowerCase()).not.toBe(
      light.viewportBackground.toLowerCase(),
    )
    expect(light.boardEdge.toLowerCase()).toBe('#3a2e27')
    expect(light.contactShadow).toBe('rgba(59, 43, 36, 0.2)')
    // 4.2.2: no planning plate, so the lines must read on their own —
    // light minor lifted 7% → 10% (4.2.1) → 30% with major at 55%.
    expect(light.gridMinor).toBe('rgba(54, 42, 36, 0.3)')

    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    const dark = await readBoardTokens(page)
    expect(dark.boardFace.toLowerCase()).toBe('#262019')
    expect(dark.boardFace.toLowerCase()).not.toBe(
      dark.viewportBackground.toLowerCase(),
    )
    expect(dark.boardEdge.toLowerCase()).toBe('#cbbfb4')
    expect(dark.contactShadow).toBe('rgba(0, 0, 0, 0.45)')
  })
})
