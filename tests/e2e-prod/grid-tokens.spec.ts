import { expect, test, type Page } from '@playwright/test'
import { localizedPathFor } from '../../src/i18n/routes'

// Regression: LightningCSS minifies the rgba() grid tokens to 8-digit hex
// (#RRGGBBAA) in the production bundle, and THREE.Color cannot parse that
// form — it silently fell back to white, erasing the interior grid lines on
// the deployed site while every dev-server run looked fine. The guard is the
// rendered canvas itself: light-mode lines must actually be dark gray pixels.
const LOCALE = 'zh-Hant' as const

async function darkGridPixelCount(page: Page): Promise<number> {
  const canvas = page.getByTestId('playground-viewport').locator('canvas')
  const screenshot = await canvas.screenshot()
  return page.evaluate(async (encoded) => {
    const response = await fetch(`data:image/png;base64,${encoded}`)
    const bitmap = await createImageBitmap(await response.blob())
    const out = document.createElement('canvas')
    out.width = bitmap.width
    out.height = bitmap.height
    const context = out.getContext('2d')
    if (!context) throw new Error('no 2d context')
    context.drawImage(bitmap, 0, 0)
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    let dark = 0
    for (let index = 0; index < image.length; index += 4) {
      const r = image[index]!
      const g = image[index + 1]!
      const b = image[index + 2]!
      // Neutral dark gray (the #52525b family), not the warm paper bg and
      // not white: counts major lines, minor lines, and their AA edges.
      const maxChannel = Math.max(r, g, b)
      const minChannel = Math.min(r, g, b)
      if (maxChannel < 180 && maxChannel - minChannel < 24) dark += 1
    }
    bitmap.close()
    return dark
  }, screenshot.toString('base64'))
}

test('production build renders light-mode grid lines as dark gray pixels', async ({
  page,
}) => {
  await page.goto(localizedPathFor(LOCALE, '/cad/playground'))
  const canvas = page.getByTestId('playground-viewport').locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(800)

  const dark = await darkGridPixelCount(page)
  // A white-line failure mode leaves ~0 such pixels; the healthy grid has
  // tens of thousands across the default camera view.
  expect(dark).toBeGreaterThan(3000)
})
