import { expect, test } from '@playwright/test'

function luminance(rgb: number[]): number {
  const linear = rgb.map((channel) => {
    const value = channel / 255
    if (value <= 0.04045) return value / 12.92
    return ((value + 0.055) / 1.055) ** 2.4
  })
  return (
    (linear[0] ?? 0) * 0.2126 +
    (linear[1] ?? 0) * 0.7152 +
    (linear[2] ?? 0) * 0.0722
  )
}

function contrast(first: number[], second: number[]): number {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

for (const locale of ['en', 'zh-Hant']) {
  for (const appearance of ['light', 'dark'] as const) {
    for (const width of [320, 390, 760, 761, 1440]) {
      test(`${locale} ${appearance} ${width}px public pages keep readable surfaces and complete content`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({
          colorScheme: appearance,
          reducedMotion: 'reduce',
        })
        for (const route of ['', 'models/', 'docs/', 'about/']) {
          await page.goto(`/${locale}/${route}`)
          await expect(page.locator('main h1')).toBeVisible()
          await page.evaluate(() => document.fonts.ready)
          const surface = await page.evaluate(() => {
            const body = getComputedStyle(document.body)
            const canvas = document.createElement('canvas')
            canvas.width = 1
            canvas.height = 1
            const context = canvas.getContext('2d')
            if (!context) throw new Error('Color measurement unavailable')
            function color(value: string): number[] {
              if (!context) throw new Error('Color measurement unavailable')
              context.clearRect(0, 0, 1, 1)
              context.fillStyle = value
              context.fillRect(0, 0, 1, 1)
              return Array.from(context.getImageData(0, 0, 1, 1).data).slice(
                0,
                3,
              )
            }
            return {
              foreground: color(body.color),
              background: color(body.backgroundColor),
              pageWidth: document.documentElement.clientWidth,
              contentWidth: document.documentElement.scrollWidth,
            }
          })
          expect(
            surface.contentWidth,
            `${route} must not overflow`,
          ).toBeLessThanOrEqual(surface.pageWidth + 1)
          expect(
            contrast(surface.foreground, surface.background),
          ).toBeGreaterThanOrEqual(4.5)
          if (route === '') {
            const action = page.locator('[data-testid="home-hero"] a').first()
            await expect(action).toBeVisible()
            const colors = await action.evaluate((element) => {
              const style = getComputedStyle(element)
              const parse = (value: string) =>
                value
                  .match(/[\d.]+/g)
                  ?.map(Number)
                  .slice(0, 3) ?? []
              return {
                text: parse(style.color),
                face: parse(style.backgroundColor),
              }
            })
            expect(contrast(colors.text, colors.face)).toBeGreaterThanOrEqual(
              4.5,
            )
          }
          const name = `${route.replaceAll('/', '') || 'home'}-${locale}-${appearance}-${width}`
          const screenshot = testInfo.outputPath(`${name}.png`)
          await page.screenshot({ path: screenshot })
          await testInfo.attach(name, {
            path: screenshot,
            contentType: 'image/png',
          })
        }
      })
    }
  }
}
