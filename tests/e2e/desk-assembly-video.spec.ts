import { expect, test } from '@playwright/test'

for (const locale of ['zh-Hant', 'en']) {
  test(`${locale} homepage is a static entry to the assembly guide`, async ({
    page,
  }) => {
    const mediaRequests: string[] = []
    page.on('request', (request) => {
      if (
        /\.(mp4|webm|wasm)(?:\?|$)|cad\.worker|desk-scroll-assembly/.test(
          request.url(),
        )
      )
        mediaRequests.push(request.url())
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/${locale}/`)
    await expect(page.locator('video, canvas')).toHaveCount(0)
    await expect(
      page.getByTestId('home-workflow').getByRole('listitem'),
    ).toHaveCount(3)
    const sections = page
      .getByTestId('home-sections')
      .locator(':scope > section')
    await expect(sections).toHaveCount(5)
    const bounds = await sections.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().top),
    )
    expect(bounds).toEqual([...bounds].sort((a, b) => a - b))
    await expect(sections.nth(0)).toContainText('Shape Shortcut')
    await expect(sections.nth(1)).toContainText('OpenGrid Wall')
    await expect(sections.nth(2).getByRole('listitem')).toHaveCount(3)
    await expect(sections.nth(4)).toContainText('Prototype')
    expect(mediaRequests).toEqual([])
    await page.getByTestId('home-guide').getByRole('link').click()
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/docs/#assembly-direct-placement-align$`),
    )
    await expect(page.locator('#assembly-direct-placement-align')).toBeVisible()
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} homepage remains usable without JavaScript on mobile`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme: theme,
      viewport: { width: 390, height: 844 },
    })
    try {
      const page = await context.newPage()
      for (const locale of ['zh-Hant', 'en']) {
        await page.goto(`${baseURL}/${locale}/`)
        await expect(page.locator('video, canvas')).toHaveCount(0)
        await expect(
          page.getByTestId('home-hero').getByRole('link').first(),
        ).toHaveAttribute('href', `/${locale}/models`)
        const image = page
          .getByTestId('home-hero-visual')
          .locator('img:visible')
        await expect(image).toHaveAttribute('src', `/home/desk.${theme}.webp`)
        expect(
          await image.evaluate(
            (img: HTMLImageElement) =>
              img.complete &&
              img.naturalWidth === 1200 &&
              img.naturalHeight === 800,
          ),
        ).toBe(true)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await page.getByTestId('home-guide').getByRole('link').click()
        await expect(
          page.locator('#assembly-direct-placement-align'),
        ).toBeVisible()
      }
    } finally {
      await context.close()
    }
  })
}

test('homepage pictures follow the theme toggle without loading movie data', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/en/')
  const hero = page.getByTestId('home-hero-visual')
  await expect(hero.locator('img:visible')).toHaveAttribute(
    'src',
    '/home/desk.light.webp',
  )
  await page.locator('[data-theme-toggle]').click()
  await expect(hero.locator('img:visible')).toHaveAttribute(
    'src',
    '/home/desk.dark.webp',
  )
  await expect(page.locator('video')).toHaveCount(0)
})
