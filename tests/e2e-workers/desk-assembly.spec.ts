import { expect, test } from '@playwright/test'

for (const locale of ['en', 'zh-Hant']) {
  test(`${locale} hosted Docs scrolls every actual-model demonstration`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const cadRequests: string[] = []
    page.on('request', (request) => {
      if (/\.wasm|cad\.worker|\.(mp4|webm)(?:\?|$)/.test(request.url()))
        cadRequests.push(request.url())
    })
    for (const { scene, first } of [
      { scene: 'direct-placement', first: 'align' },
      { scene: 'snap-fixing', first: 'board' },
      { scene: 'locating-seats', first: 'align' },
    ]) {
      await page.goto(`/${locale}/docs/#assembly-${scene}-${first}`)
      const guide = page.locator(`[data-assembly-guide="${scene}"]`)
      await expect(guide).toHaveAttribute('data-assembly-state', 'ready')
      const progress = guide.locator('progress')
      await expect
        .poll(() =>
          progress.evaluate((element: HTMLProgressElement) => element.value),
        )
        .toBeCloseTo(0, 2)
      const canvas = (await guide.locator('canvas').boundingBox())!
      await page.mouse.move(
        canvas.x + canvas.width / 2,
        canvas.y + canvas.height / 2,
      )
      await page.mouse.wheel(0, 240)
      await expect
        .poll(() =>
          progress.evaluate((element: HTMLProgressElement) => element.value),
        )
        .toBeGreaterThan(0.1)
      await guide.locator('[data-assembly-step]').last().click()
      await expect
        .poll(() =>
          progress.evaluate((element: HTMLProgressElement) => element.value),
        )
        .toBeCloseTo(1, 2)
      await expect(
        guide.locator('[data-assembly-instruction]').last(),
      ).toBeInViewport()
      await expect(guide.locator('canvas')).toBeVisible()
    }
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
  test(`${appearance} hosted homepage links to Docs without page JavaScript or movies`, async ({
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
      await expect(page.locator('video, canvas')).toHaveCount(0)
      const image = page.getByTestId('home-hero-visual').locator('img:visible')
      await expect(image).toHaveAttribute(
        'src',
        `/home/desk.${appearance}.webp`,
      )
      expect(
        await image.evaluate(
          (element: HTMLImageElement) => element.naturalWidth,
        ),
      ).toBeGreaterThan(0)
      await page.getByTestId('home-guide').getByRole('link').click()
      await expect(
        page.locator('#assembly-direct-placement-align'),
      ).toBeVisible()
      await expect(
        page.locator('[data-assembly-guide="direct-placement"] img:visible'),
      ).toHaveCount(1)
    } finally {
      await context.close()
    }
  })
}
