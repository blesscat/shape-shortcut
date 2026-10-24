import { expect, test } from '@playwright/test'

for (const locale of ['en', 'zh-Hant']) {
  test(`${locale} navigation preserves destinations and document position while compact`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/${locale}/docs/`)
    const nav = page.locator('[data-site-nav]')
    const main = page.locator('main')
    const documentTop = await main.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    )
    const theme = nav.locator('[data-theme-toggle]')
    const before = await theme.boundingBox()
    await page.evaluate(() => window.scrollTo(0, 700))
    await expect(nav).toHaveAttribute('data-compact', '')
    await expect(nav.locator('.site-desktop-links a')).toHaveCount(3)
    for (const link of await nav.locator('.site-desktop-links a').all()) {
      await expect(link).toBeVisible()
    }
    await expect
      .poll(() =>
        main.evaluate(
          (element) => element.getBoundingClientRect().top + window.scrollY,
        ),
      )
      .toBeCloseTo(documentTop, 0)
    const after = await theme.boundingBox()
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    // Firefox can report tiny fractional-pixel rounding after scrolling.
    expect(after!.height).toBeCloseTo(before!.height, 4)
    expect(after!.width).toBeCloseTo(before!.width, 4)
    await theme.click()
    await expect(nav).toHaveAttribute('data-compact', '')
    await expect
      .poll(() =>
        main.evaluate(
          (element) => element.getBoundingClientRect().top + window.scrollY,
        ),
      )
      .toBeCloseTo(documentTop, 0)
  })

  test(`${locale} narrow menu exposes complete routes and returns focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto(`/${locale}/docs/`)
    await page.evaluate(() => window.scrollTo(0, 600))
    const nav = page.locator('[data-site-nav]')
    const menu = nav.locator('[data-navigation-menu]')
    const trigger = menu.locator('summary')
    await expect(nav).toHaveAttribute('data-compact', '')
    await trigger.click()
    for (const link of await menu.locator('a').all()) {
      await expect(link).toBeVisible()
      expect(await link.getAttribute('href')).toContain(`/${locale}/`)
    }
    await menu.locator('a').first().focus()
    await page.keyboard.press('Escape')
    await expect(menu).not.toHaveAttribute('open')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await menu.locator('[data-navigation-close]').click()
    await expect(trigger).toBeFocused()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
}

test('native mobile navigation remains usable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await page.goto('/en/docs/')
  const menu = page.locator('[data-navigation-menu]')
  await menu.locator('summary').click()
  await expect(menu.locator('a')).toHaveCount(3)
  await menu.getByRole('link', { name: 'Pick a model', exact: true }).click()
  await expect(page).toHaveURL(/\/en\/models\/?$/)
  await context.close()
})

test('reduced-motion navigation changes state without transition', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en/docs/')
  await page.evaluate(() => window.scrollTo(0, 500))
  const nav = page.locator('[data-site-nav]')
  await expect(nav).toHaveAttribute('data-compact', '')
  expect(
    await nav.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe('0s')
})

test('narrow model dialog fits the viewport and keeps close and final content reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/en/models/')
  const opener = page.locator('[data-model-details-open]').first()
  await opener.click()
  const dialog = page.locator('[data-testid="model-details-dialog"][open]')
  await expect(dialog).toBeVisible()
  await expect
    .poll(() => dialog.evaluate((element) => getComputedStyle(element).opacity))
    .toBe('1')
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(700)
  const scrollRegion = dialog.locator('[data-testid="model-details-scroll"]')
  await scrollRegion.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  const finalText = scrollRegion.locator('section > p').last()
  await expect(finalText).toBeInViewport()
  const close = dialog.locator('[data-sw-dialog-close]')
  await close.focus()
  await expect(close).toBeFocused()
  await expect(close).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
})

for (const locale of ['en', 'zh-Hant']) {
  test(`${locale} mobile menu closes on forward and backward focus exit`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${locale}/`)
    const nav = page.locator('[data-site-nav]')
    const menu = nav.locator('[data-navigation-menu]')
    const trigger = menu.locator('summary')
    const theme = nav.locator('[data-theme-toggle]')
    await trigger.click()
    await menu.locator('[data-navigation-close]').focus()
    await page.keyboard.press('Tab')
    await expect(menu).not.toHaveAttribute('open')
    await expect(theme).toBeFocused()
    expect(
      await theme.evaluate((element) => {
        const box = element.getBoundingClientRect()
        return element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        )
      }),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await expect(theme).toBeFocused()
    await trigger.click()
    await page.keyboard.press('Shift+Tab')
    await expect(menu).not.toHaveAttribute('open')
    await expect(
      nav.getByRole('link', { name: 'Shape Shortcut', exact: true }),
    ).toBeFocused()
    await trigger.click()
    await menu.locator('a').first().focus()
    await page.keyboard.press('Escape')
    await expect(menu).not.toHaveAttribute('open')
    await expect(trigger).toBeFocused()
  })
  for (const appearance of ['light', 'dark'] as const) {
    test(`${locale} ${appearance} footer links retain accessible targets and keyboard focus`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.emulateMedia({ colorScheme: appearance })
      await page.goto(`/${locale}/`)
      const links = page.locator('footer a')
      await expect(links).toHaveCount(5)
      for (const link of await links.all()) {
        const box = await link.boundingBox()
        expect(box!.width).toBeGreaterThanOrEqual(44)
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
      const docs = links.nth(1)
      await docs.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(docs).toBeFocused()
      const focus = await docs.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          width: parseFloat(style.outlineWidth),
          style: style.outlineStyle,
          color: style.outlineColor,
        }
      })
      expect(focus.width).toBeGreaterThanOrEqual(3)
      expect(focus.style).toBe('solid')
      expect(focus.color).not.toBe('rgba(0, 0, 0, 0)')
    })
  }
}

for (const locale of ['en', 'zh-Hant']) {
  test(`${locale} navigation stays pinned, restores mid-page state and expands at the top`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/${locale}/docs/`)
    const nav = page.locator('[data-site-nav]')
    await expect(nav).not.toHaveAttribute('data-compact')
    const expanded = await nav.boundingBox()
    await page.evaluate(() => window.scrollTo(0, 900))
    await expect(nav).toHaveAttribute('data-compact', '')
    await expect
      .poll(async () => (await nav.boundingBox())!.y)
      .toBeCloseTo(0, 0)
    await page.reload()
    await expect(nav).toHaveAttribute('data-compact', '')
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(100)
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    )
    await expect
      .poll(async () => (await nav.boundingBox())!.y)
      .toBeCloseTo(0, 0)
    await expect(nav.locator('[data-theme-toggle]')).toBeInViewport()
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(nav).not.toHaveAttribute('data-compact')
    await expect
      .poll(async () => (await nav.boundingBox())!.height)
      .toBeCloseTo(expanded!.height, 0)
  })
}
