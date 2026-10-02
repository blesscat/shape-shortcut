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
      title: 'Shape Shortcut｜OpenGrid 模型客製化，調一調就能印',
    },
    {
      path: '/en/',
      title: 'Shape Shortcut | OpenGrid customizer — tweak it, print it',
    },
    {
      path: '/en/models',
      title: 'Pick one you like, take it home to print | Shape Shortcut',
    },
    {
      path: '/zh-Hant/models',
      title: '挑一個你喜歡的，帶回家列印 | Shape Shortcut',
    },
    {
      path: '/en/docs/',
      title: 'Docs | Shape Shortcut — first time, done right',
    },
    {
      path: '/zh-Hant/docs/',
      title: '文件｜Shape Shortcut — 第一次玩就上手',
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
    page.getByRole('heading', {
      name: 'Pick one you like, take it home to print',
    }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Pick a model', exact: true }),
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

  // Tools live in a collapsed zone by default; expand the Desk panel's zone
  // so every card is measurable and visible before the layout assertions
  // below (the switcher keeps the other panels out of layout).
  await page.getByTestId('model-zone-tools-desk').locator('summary').click()

  const cards = page
    .locator('[data-testid="model-selection"]')
    .locator('[data-system-panel="desk"]')
    .locator('[data-model-id]')
  await expect(cards).toHaveCount(10)
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
      card.getByRole('button', { name: 'Details', exact: true }),
    ).toBeVisible()
  }

  // The other panels keep the same card anatomy; verify via the switcher.
  // Park the pointer first: tab clicks above the panels leave it hovering a
  // card, whose hover lift keeps the layout (and the next tab) unstable.
  const stableClick = async (key: string) => {
    const tab = page.locator(`[data-system-tab="${key}"]`)
    await page.mouse.move(0, 0)
    await expect
      .poll(() =>
        tab.evaluate(
          (element) =>
            new Promise((resolve) => {
              const first = element.getBoundingClientRect().y
              requestAnimationFrame(() =>
                resolve(
                  Math.abs(element.getBoundingClientRect().y - first) < 0.5,
                ),
              )
            }),
        ),
      )
      .toBe(true)
    await tab.click()
  }
  await stableClick('wall')
  await expect(
    page
      .locator('[data-system-panel="wall"]')
      .locator('[data-model-id]')
      .first()
      .getByRole('button', { name: 'Details', exact: true }),
  ).toBeVisible()
  await stableClick('hsw')
  await expect(
    page
      .locator('[data-system-panel="hsw"]')
      .locator('[data-model-id="hsw-cell"]')
      .getByRole('button', { name: 'Details', exact: true }),
  ).toBeVisible()
  await page.mouse.move(0, 0)
  await stableClick('desk')

  const board = page.locator('[data-entry-key="opengrid-desk"]')
  await expect(board).not.toContainText('Adjustable settings:')

  const parameterCard = page.locator(
    '[data-entry-key="opengrid-stackable-box-desk"]',
  )
  const opener = parameterCard.getByRole('button', {
    name: 'Details',
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
  // Opening the dialog focuses it, and firefox's focus auto-scroll then moves
  // the window (nav collapse tail included). The dialog itself never shifts
  // layout, so the baseline is recorded right after the dialog is visible and
  // the scroll has settled: the comparison below then measures what this test
  // guards — that keeping the dialog open does not move any card.
  // The capsule nav is sticky and in-flow, so the tail of its ~200ms collapse
  // still drifts document coordinates by a couple of pixels after the nav's
  // own height settles. Wait for the cards to stop moving instead of sleeping
  // a fixed duration.
  await expect
    .poll(() =>
      cards.first().evaluate(
        (card) =>
          new Promise((resolve) => {
            const first = card.getBoundingClientRect().top
            requestAnimationFrame(() =>
              resolve(Math.abs(card.getBoundingClientRect().top - first) < 0.5),
            )
          }),
      ),
    )
    .toBe(true)
  await page.evaluate(() => document.fonts.ready)
  // Expansion clicks park the pointer over a card; the hover lift
  // (-translate-y-0.5) would masquerade as a dialog-induced shift.
  await page.mouse.move(0, 0)

  await opener.click()
  const dialog = parameterCard.getByTestId('model-details-dialog')
  await expect(dialog).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            const first = window.scrollY
            requestAnimationFrame(() =>
              resolve(Math.abs(window.scrollY - first) < 0.5),
            )
          }),
      ),
    )
    .toBe(true)
  await expectNavGeometrySettled(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  )
  // Freeze the measurement environment before recording either side: hover
  // lifts off, no pointer-enter side effects, one pinned scroll offset.
  await page.locator('[data-testid="model-selection"]').evaluate((element) => {
    element.style.pointerEvents = 'none'
  })
  // The opener click re-hovers the card (its -translate-y-0.5 lift runs on a
  // 200ms transition), and the freeze above ends that hover. Let the lift
  // decay fully BEFORE the baseline, otherwise the decay tail lands between
  // the two measurements and masquerades as a 2px dialog-induced shift.
  await page.waitForTimeout(300)
  const readCards = () =>
    cards.evaluateAll((cardElements) =>
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
  const scrollYBefore = await page.evaluate(() => window.scrollY)
  const boundsBefore = await readCards()

  await expect(dialog.getByRole('heading', { name: 'Grid Box' })).toBeVisible()
  await expect(dialog).not.toContainText('Adjustable settings:')
  await expect(dialog).toContainText('Inner clear height')
  await expect(dialog).toContainText(/STL.*3MF/)

  // Pin the scroll back to the baseline offset (the assertions above must not
  // scroll, but a stray subpixel delta from firefox's focus auto-scroll is
  // not a layout shift either), then measure again.
  await page.evaluate((y) => window.scrollTo(0, y), scrollYBefore)
  await expectNavGeometrySettled(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  )

  const boundsAfter = await readCards()
  await page.locator('[data-testid="model-selection"]').evaluate((element) => {
    element.style.pointerEvents = ''
  })
  expect(boundsAfter).toHaveLength(boundsBefore.length)
  // Both sides were recorded with the dialog open, the scroll pinned, and
  // the hover lift already decayed (300ms wait above), so this comparison
  // measures exactly what the test guards: keeping the dialog open must not
  // move, resize, or reflow any card. 0.5px absorbs subpixel noise — any
  // real dialog-induced shift is several pixels.
  for (let index = 0; index < boundsBefore.length; index += 1) {
    const before = boundsBefore[index]
    const after = boundsAfter[index]
    expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThanOrEqual(
      0.5,
    )
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(
      0.5,
    )
    expect(
      Math.abs((after?.width ?? 0) - (before?.width ?? 0)),
    ).toBeLessThanOrEqual(0.5)
    expect(
      Math.abs((after?.height ?? 0) - (before?.height ?? 0)),
    ).toBeLessThanOrEqual(0.5)
  }

  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()

  await page.mouse.move(0, 0)
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
  await card.getByRole('button', { name: 'Details', exact: true }).click()

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

  await page.getByTestId('model-zone-tools-desk').locator('summary').click()
  await page.mouse.move(0, 0)

  const cards = page
    .locator('[data-testid="model-selection"]')
    .locator('[data-system-panel="desk"]')
    .locator('[data-model-id]')
  await expect(cards).toHaveCount(10)
  const cardCount = await cards.count()
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index)
    await expect(card.getByTestId('model-capability-summary')).toHaveCount(0)
    await expect(
      card.getByRole('button', { name: '詳情', exact: true }),
    ).toBeVisible()
  }
  await expect(
    page.locator('[data-entry-key="opengrid-desk"]'),
  ).not.toContainText('可調整設定：')
  await expect(
    page
      .locator('[data-entry-key="opengrid-desk"]')
      .getByRole('button', { name: '詳情', exact: true }),
  ).toBeVisible()
})

test('localized public pages and CAD controls expose both locales', async ({
  page,
}) => {
  await page.goto('/zh-Hant/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant')
  await expect(
    page.getByRole('heading', {
      name: /桌面好亂？挑個模型調一調\s*列印出來就對了。/,
    }),
  ).toBeVisible()

  await page.goto('/en/docs/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', {
      name: 'First time with Desk System? This page is all you need',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Parameters and constraints' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Terms & specs' }),
  ).toBeVisible()

  await page.goto('/en/about/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', {
      name: 'Indie developer, and a 3D-printing enthusiast.',
    }),
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

test('model chooser badges and home summaries expose localized part categories', async ({
  page,
}) => {
  const deskBaseBadge = () =>
    page
      .getByTestId('model-subgroup-desk')
      .getByTestId('model-zone-base-desk')
      .locator(
        '[data-model-id="opengrid"] [data-testid="model-category-badge"]',
      )

  await page.goto('/en/models')
  await expect(deskBaseBadge()).toHaveText('Base')
  await expect(
    page
      .getByTestId('model-subgroup-desk')
      .getByTestId('model-zone-containers-desk')
      .locator(
        '[data-model-id="opengrid-stackable-box"] [data-testid="model-category-badge"]',
      ),
  ).toHaveText('Container')

  await page.goto('/en/')
  await expect(
    page.getByTestId('home-explore-desk-category-summary'),
  ).toContainText('Board and Snap are your base')
  await expect(
    page.getByTestId('home-explore-wall-category-summary'),
  ).toContainText('Shelves, organizers, and the tissue box are containers')

  await page.goto('/zh-Hant/models')
  await expect(deskBaseBadge()).toHaveText('基礎')
  await expect(
    page
      .getByTestId('model-subgroup-desk')
      .getByTestId('model-zone-containers-desk')
      .locator(
        '[data-model-id="opengrid-stackable-box"] [data-testid="model-category-badge"]',
      ),
  ).toHaveText('容器')

  await page.goto('/zh-Hant/')
  await expect(
    page.getByTestId('home-explore-desk-category-summary'),
  ).toContainText('底版跟 Snap 是基礎')
  await expect(
    page.getByTestId('home-explore-wall-category-summary'),
  ).toContainText('層架、方格、面紙盒都是容器')
})
