import { expect, test, type Locator } from '@playwright/test'

// The shared nav collapses when the page scrolls, animating its height for
// ~200ms. Tests that compare document coordinates across an interaction
// must let that transition settle first, so they keep guarding what they
// actually guard: the interaction itself never shifts content.
async function expectNavGeometrySettled(navigation: Locator) {
  await expect
    .poll(() =>
      navigation.evaluate(
        (element) =>
          new Promise((resolve) => {
            const first = element.getBoundingClientRect().height
            requestAnimationFrame(() =>
              resolve(
                Math.abs(element.getBoundingClientRect().height - first) < 0.5,
              ),
            )
          }),
      ),
    )
    .toBe(true)
}

test('localized pages expose branded titles and a shared favicon', async ({
  page,
}) => {
  const pages = [
    {
      path: '/zh-Hant/',
      title: 'OpenGrid 客製化產生器｜Shape Shortcut 瀏覽器 CAD',
    },
    {
      path: '/en/',
      title: 'OpenGrid customizer | Shape Shortcut browser CAD',
    },
    {
      path: '/en/models',
      title: 'Choose a CAD model | Shape Shortcut',
    },
    {
      path: '/zh-Hant/models',
      title: '選擇 CAD 模型 | Shape Shortcut',
    },
    {
      path: '/en/docs/',
      title: 'Shape Shortcut documentation | Shape Shortcut',
    },
    {
      path: '/zh-Hant/docs/',
      title: 'Shape Shortcut 文件 | Shape Shortcut',
    },
    {
      path: '/en/cad/box?system=desk',
      title: 'Box CAD workspace | Shape Shortcut',
    },
    {
      path: '/zh-Hant/cad/box?system=desk',
      title: '方塊 CAD 工作區 | Shape Shortcut',
    },
  ]

  for (const entry of pages) {
    await page.goto(entry.path)
    await expect(page).toHaveTitle(entry.title)
    await expect(page.locator('head link[rel="icon"]')).toHaveAttribute(
      'href',
      '/favicon.png',
    )
    await expect(page.locator('head link[rel="icon"]')).toHaveAttribute(
      'type',
      'image/png',
    )
  }

  const faviconResponse = await page.request.get('/favicon.png')
  expect(faviconResponse.ok()).toBe(true)
  expect(faviconResponse.headers()['content-type']).toContain('image/png')
  expect((await faviconResponse.body()).byteLength).toBeGreaterThan(0)
})

test('localized model chooser exposes localized shell and search metadata', async ({
  page,
}) => {
  await page.goto('/en/models')

  await expect(page).toHaveURL(/\/en\/models\/?$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', { name: 'Choose a CAD model' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Models', exact: true }),
  ).toHaveAttribute('aria-current', 'page')

  const canonical = page.locator('link[rel="canonical"]')
  await expect(canonical).toHaveAttribute('href', /\/en\/models\/?$/)

  const alternateLinks = page.locator(
    'link[rel="alternate"][hreflang="zh-Hant"], link[rel="alternate"][hreflang="en"]',
  )
  await expect(alternateLinks).toHaveCount(2)
  await expect(
    page.locator('link[rel="alternate"][hreflang="x-default"]'),
  ).toHaveCount(1)
  await expect(
    page.getByRole('link', { name: 'Language', exact: true }),
  ).toHaveAttribute('href', '/zh-Hant/models')
})

test('model chooser keeps compact cards and stable modal details', async ({
  page,
}) => {
  await page.goto('/en/models')

  const cards = page.locator('[data-testid="model-selection"] [data-model-id]')
  await expect(cards).not.toHaveCount(0)
  const staticResponse = await page.request.get('/en/models')
  expect(staticResponse.ok()).toBe(true)
  const staticHtml = await staticResponse.text()
  expect(staticHtml).toContain('data-testid="model-details-dialog"')
  expect(staticHtml).not.toContain('Adjustable settings:')
  expect(staticHtml).toContain('Inner clear height')
  expect(staticHtml).toContain('10.5 displayed cells')
  const staticCadResponse = await page.request.get('/en/cad/opengrid')
  expect(staticCadResponse.ok()).toBe(true)
  expect(await staticCadResponse.text()).toContain('10.5 displayed cells')
  const cardCount = await cards.count()
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index)
    await expect(card.getByTestId('model-capability-summary')).toHaveCount(0)
    await expect(
      card.getByRole('button', { name: 'View full details', exact: true }),
    ).toBeVisible()
  }

  const board = page.locator('[data-entry-key="opengrid-desk"]')
  await expect(board).not.toContainText('Adjustable settings:')

  const parameterCard = page.locator(
    '[data-entry-key="opengrid-stackable-box-desk"]',
  )
  const opener = parameterCard.getByRole('button', {
    name: 'View full details',
    exact: true,
  })
  // Force the page into its scrolled state before the baseline: opening
  // the dialog itself scrolls the page (dialog focus), which collapses
  // the nav once. Holding the nav state constant across the baseline lets
  // this test keep guarding what it guards: the dialog must not shift
  // cards on its own.
  await page.evaluate(() => window.scrollTo(0, 400))
  await expectNavGeometrySettled(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  )
  await opener.scrollIntoViewIfNeeded()
  await expectNavGeometrySettled(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  )

  const boundsBefore = await cards.evaluateAll((cardElements) =>
    cardElements.map((card) => {
      const bounds = card.getBoundingClientRect()
      return {
        x: bounds.x + window.scrollX,
        y: bounds.y + window.scrollY,
        width: bounds.width,
        height: bounds.height,
      }
    }),
  )

  await opener.click()

  const dialog = parameterCard.getByTestId('model-details-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Grid Box' })).toBeVisible()
  await expect(dialog).not.toContainText('Adjustable settings:')
  await expect(dialog).toContainText('Inner clear height')
  await expect(dialog).toContainText(/STL.*3MF/)

  const boundsAfter = await cards.evaluateAll((cardElements) =>
    cardElements.map((card) => {
      const bounds = card.getBoundingClientRect()
      return {
        x: bounds.x + window.scrollX,
        y: bounds.y + window.scrollY,
        width: bounds.width,
        height: bounds.height,
      }
    }),
  )
  expect(boundsAfter).toHaveLength(boundsBefore.length)
  for (let index = 0; index < boundsBefore.length; index += 1) {
    const before = boundsBefore[index]
    const after = boundsAfter[index]
    expect(after?.x).toBeCloseTo(before?.x ?? 0, 3)
    expect(after?.y).toBeCloseTo(before?.y ?? 0, 3)
    expect(after?.width).toBeCloseTo(before?.width ?? 0, 3)
    expect(after?.height).toBeCloseTo(before?.height ?? 0, 3)
  }

  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()

  await opener.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('model chooser details remain readable without narrow-screen overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 360 })
  await page.goto('/en/models')

  const card = page.locator(
    '[data-entry-key="opengrid-stackable-cylinder-desk"]',
  )
  await card
    .getByRole('button', { name: 'View full details', exact: true })
    .click()

  const dialog = card.getByTestId('model-details-dialog')
  await expect(dialog).toBeVisible()
  const layout = await dialog.evaluate((dialogElement) => {
    const scrollElement = dialogElement.querySelector(
      '[data-testid="model-details-scroll"]',
    )
    if (!scrollElement) throw new Error('Expected scrollable dialog content')
    return {
      pageFitsViewport:
        document.documentElement.scrollWidth <= window.innerWidth,
      dialogFitsViewport:
        dialogElement.getBoundingClientRect().right <= window.innerWidth,
      contentScrolls: scrollElement.scrollHeight > scrollElement.clientHeight,
    }
  })

  expect(layout.pageFitsViewport).toBe(true)
  expect(layout.dialogFitsViewport).toBe(true)
  expect(layout.contentScrolls).toBe(true)
})

test('traditional Chinese model cards keep the compact presentation', async ({
  page,
}) => {
  await page.goto('/zh-Hant/models')

  const cards = page.locator('[data-testid="model-selection"] [data-model-id]')
  await expect(cards).not.toHaveCount(0)
  const cardCount = await cards.count()
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index)
    await expect(card.getByTestId('model-capability-summary')).toHaveCount(0)
    await expect(
      card.getByRole('button', { name: '查看完整資訊', exact: true }),
    ).toBeVisible()
  }
  await expect(
    page.locator('[data-entry-key="opengrid-desk"]'),
  ).not.toContainText('可調整設定：')
  await expect(
    page
      .locator('[data-entry-key="opengrid-desk"]')
      .getByRole('button', { name: '查看完整資訊', exact: true }),
  ).toBeVisible()
})

test('localized public pages and CAD controls expose both locales', async ({
  page,
}) => {
  await page.goto('/zh-Hant/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant')
  await expect(
    page.getByRole('heading', {
      name: /把 3D 列印收納模型\s*集中在同一個地方/,
    }),
  ).toBeVisible()

  await page.goto('/en/docs/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', { name: 'Shape Shortcut documentation' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Parameters and constraints' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Shared reference' }),
  ).toBeVisible()

  await page.goto('/en/about/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', { name: 'Shape Shortcut by Blesscat' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'About', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/en\/about\/?$/,
  )
  await expect(
    page.locator('link[rel="alternate"][hreflang="zh-Hant"]'),
  ).toHaveAttribute('href', /\/zh-Hant\/about\/?$/)
  await expect(
    page.getByRole('link', { name: 'GitHub', exact: true }).first(),
  ).toHaveAttribute('href', 'https://github.com/blesscat')
  await expect(
    page.getByRole('link', { name: 'blesscat@gmail.com' }),
  ).toHaveAttribute('href', 'mailto:blesscat@gmail.com')

  await page.goto('/en/cad/box?system=desk&view=search')
  await expect(
    page.getByRole('heading', { name: 'Editing: Box', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Width/ })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Back to model selection' }),
  ).toHaveAttribute('href', '/en/models')
  await expect(page.getByTestId('cad-static-summary')).toBeAttached()
  await expect(
    page.locator('link[rel="alternate"][hreflang="zh-Hant"]'),
  ).toHaveAttribute('href', /\/zh-Hant\/cad\/box$/)

  const width = page.getByRole('textbox', { name: /Width/ })
  await width.fill('25.5')
  await expect(page.locator('#width-error')).toContainText('Width is invalid')
  await expect(page.getByRole('link', { name: 'Language' })).toHaveAttribute(
    'href',
    '/zh-Hant/cad/box?system=desk&view=search',
  )

  await width.fill('25')
  await page.getByRole('link', { name: 'Language' }).click()
  await expect(page).toHaveURL(/\/zh-Hant\/cad\/box\?system=desk&view=search$/)
  await expect(page.getByRole('textbox', { name: /寬度/ })).toHaveValue('25')
})

test('legacy routes redirect to the default locale without hiding English routes', async ({
  page,
}) => {
  await page.goto('/models')
  await expect(page).toHaveURL(/\/zh-Hant\/models\/?$/)

  await page.goto('/cad/box?system=desk')
  await expect(page).toHaveURL(/\/zh-Hant\/cad\/box\?system=desk$/)

  await page.goto('/en/models')
  await expect(page).toHaveURL(/\/en\/models\/?$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('publishes canonical localized sitemap URLs', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('application/xml')

  const body = await response.text()
  const origin = new URL(response.url()).origin
  expect(body).toContain(`<loc>${origin}/en/</loc>`)
  expect(body).toContain(`<loc>${origin}/zh-Hant/cad/opengrid</loc>`)
  expect(body).not.toContain(`<loc>${origin}/cad/opengrid</loc>`)
})
