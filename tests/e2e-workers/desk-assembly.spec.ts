import { expect, test } from '@playwright/test'

for (const locale of ['en', 'zh-Hant']) {
  test(`${locale} hosted Docs loads prebuilt geometry and follows step navigation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const cadRequests: string[] = []
    page.on('request', (request) => {
      if (/\.wasm|cad\.worker|\.(mp4|webm)(?:\?|$)/.test(request.url()))
        cadRequests.push(request.url())
    })
    await page.goto(`/${locale}/docs/`)
    const guide = page.locator('[data-assembly-guide="snap-fixing"]')
    await guide.scrollIntoViewIfNeeded()
    await expect(guide).toHaveAttribute('data-assembly-state', 'ready')
    await guide.locator('[data-assembly-step="3"]').click()
    await expect
      .poll(() =>
        guide
          .locator('progress')
          .evaluate((element: HTMLProgressElement) => element.value),
      )
      .toBeCloseTo(1, 2)
    await expect(
      guide.locator('[data-assembly-instruction="3"]'),
    ).toBeInViewport()
    await expect(guide.locator('canvas')).toBeVisible()
    expect(cadRequests).toEqual([])
  })
}

test('assembly movies advertise byte seeking through the deployed asset service', async ({
  request,
}) => {
  for (const scene of ['direct-placement', 'snap-fixing', 'locating-seats']) {
    for (const appearance of ['light', 'dark']) {
      for (const format of ['mp4', 'webm']) {
        const response = await request.get(
          `/docs/desk-assembly/${scene}.${appearance}.${format}`,
        )
        expect(response.status()).toBe(200)
        expect(response.headers()['accept-ranges']).toBe('bytes')
        expect(response.headers()['content-type']).toBe(`video/${format}`)
      }
    }
  }
})

for (const appearance of ['light', 'dark'] as const) {
  test(`${appearance} hosted movies seek through native controls without page JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme: appearance,
      viewport: { width: 390, height: 844 },
    })
    try {
      const page = await context.newPage()
      await page.goto(`${baseURL}/zh-Hant/`)
      const movies = page.locator('[data-assembly-video] video:visible')
      await expect(movies).toHaveCount(1)
      for (const movie of await movies.all()) {
        await movie.scrollIntoViewIfNeeded()
        await movie.focus()
        await page.keyboard.press('Space')
        await expect
          .poll(() =>
            movie.evaluate((element: HTMLVideoElement) => element.currentTime),
          )
          .toBeGreaterThan(0.1)
        await page.keyboard.press('Space')
        await expect
          .poll(() =>
            movie.evaluate((element: HTMLVideoElement) => {
              if (element.seekable.length === 0) return false
              return (
                element.seekable.end(element.seekable.length - 1) >=
                element.duration - 0.1
              )
            }),
          )
          .toBe(true)
        await movie.evaluate((element: HTMLVideoElement) => {
          element.currentTime = element.duration / 2
        })
        await expect
          .poll(() =>
            movie.evaluate((element: HTMLVideoElement) =>
              Math.abs(element.currentTime - element.duration / 2),
            ),
          )
          .toBeLessThan(0.1)
        await expect
          .poll(() =>
            movie.evaluate((element: HTMLVideoElement) => element.seeking),
          )
          .toBe(false)
      }
    } finally {
      await context.close()
    }
  })
}
