import { expect, test, type Locator, type Page } from '@playwright/test'

test('desktop parameter menu scrolls independently from the model viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/cad/opengrid')

  const panel = page.getByTestId('cad-workspace-panel')
  const viewport = page.getByTestId('cad-viewport')
  const workspace = page.getByTestId('cad-workspace')
  await expect(panel).toBeVisible()
  await expect(viewport).toBeVisible()

  const selectionColumnWidth = await workspace.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).gridTemplateColumns),
  )
  expect(selectionColumnWidth).toBeLessThanOrEqual(320)

  const panelMetrics = await panel.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: style.overflowY,
    }
  })
  const windowHeight = await page.evaluate(() => window.innerHeight)

  expect(panelMetrics.overflowY).toBe('auto')
  expect(panelMetrics.scrollHeight).toBeGreaterThan(panelMetrics.clientHeight)
  expect(panelMetrics.clientHeight).toBeLessThanOrEqual(windowHeight)

  const documentMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(documentMetrics.scrollHeight).toBeLessThanOrEqual(
    documentMetrics.clientHeight,
  )

  const viewportTopBeforeScroll = await viewport.evaluate(
    (element) => element.getBoundingClientRect().top,
  )
  await panel.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(() => panel.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  const viewportTopAfterScroll = await viewport.evaluate(
    (element) => element.getBoundingClientRect().top,
  )

  expect(viewportTopAfterScroll).toBe(viewportTopBeforeScroll)
})

test('wide OpenGrid workspace keeps document scrolling inside the parameter panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1394 })
  await page.goto('/cad/opengrid')

  const panel = page.getByTestId('cad-workspace-panel')
  const viewport = page.getByTestId('cad-viewport')
  await expect(panel).toBeVisible()
  await expect(viewport).toBeVisible()

  const documentMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(documentMetrics.scrollHeight).toBeLessThanOrEqual(
    documentMetrics.clientHeight,
  )

  const panelMetrics = await panel.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: style.overflowY,
    }
  })
  expect(panelMetrics.overflowY).toBe('auto')
  expect(panelMetrics.scrollHeight).toBeGreaterThan(panelMetrics.clientHeight)

  const viewportBeforeScroll = await viewport.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top, height: rect.height }
  })
  await panel.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(() => panel.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  const viewportAfterScroll = await viewport.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top, height: rect.height }
  })

  expect(viewportAfterScroll).toEqual(viewportBeforeScroll)
  expect(viewportAfterScroll.height).toBeLessThan(panelMetrics.scrollHeight)
  expect(
    viewportAfterScroll.top + viewportAfterScroll.height,
  ).toBeLessThanOrEqual(documentMetrics.clientHeight)
})

test('narrow CAD workspace collapses parameters into a bottom drawer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 720 })
  await page.goto('/cad/opengrid')

  const pill = page.getByTestId('cad-params-pill')
  const drawer = page.getByTestId('cad-params-drawer')
  const cluster = page.getByTestId('cad-actions-cluster')
  const viewport = page.getByTestId('cad-viewport')
  await expect(page.getByTestId('cad-workspace-panel')).toHaveCount(0)
  await expect(pill).toBeVisible()
  await expect(pill).toHaveAttribute('aria-expanded', 'false')
  await expect(viewport).toBeVisible()
  await expect(cluster.getByRole('button', { name: '下載 STL' })).toBeVisible()

  const windowHeight = await page.evaluate(() => window.innerHeight)
  await pill.click()
  await expect(drawer).toBeVisible()
  await expect(pill).toHaveAttribute('aria-expanded', 'true')
  await expect
    .poll(() =>
      drawer.evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeCloseTo(windowHeight * 0.65, -1)

  const scrollMetrics = await drawer.evaluate((element) => {
    const scroller = element.querySelector(':scope > div:last-child')
    if (!(scroller instanceof HTMLElement)) return null
    return {
      overflowY: getComputedStyle(scroller).overflowY,
      clientHeight: scroller.clientHeight,
      scrollHeight: scroller.scrollHeight,
    }
  })
  expect(scrollMetrics).not.toBeNull()
  expect(scrollMetrics?.overflowY).toBe('auto')

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBeTruthy()

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(pill).toHaveAttribute('aria-expanded', 'false')
  await expect(pill).toBeFocused()
})

test('short desktop keeps the preview, scrollable controls and attribution reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/zh-Hant/cad/opengrid')
  const panel = page.getByTestId('cad-workspace-panel')
  await expect(panel).toBeVisible()
  const metrics = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="cad-workspace-panel"]')!
    const attribution = document.querySelector(
      '[data-testid="cad-attribution"]',
    )!
    const viewport = document.querySelector('[data-testid="cad-viewport"]')!
    return {
      documentHeight: document.documentElement.scrollHeight,
      availableHeight: window.innerHeight,
      viewportHeight: viewport.getBoundingClientRect().height,
      panelScrolls: panel.scrollHeight > panel.clientHeight,
      attributionScrolls: attribution.scrollHeight > attribution.clientHeight,
      attributionOverflow: getComputedStyle(attribution).overflowY,
      attributionBottom: attribution.getBoundingClientRect().bottom,
    }
  })
  expect(metrics.documentHeight).toBeLessThanOrEqual(metrics.availableHeight)
  expect(metrics.viewportHeight).toBeGreaterThanOrEqual(96)
  expect(metrics.panelScrolls).toBe(true)
  expect(metrics.attributionScrolls).toBe(true)
  expect(metrics.attributionOverflow).toBe('auto')
  expect(metrics.attributionBottom).toBeLessThanOrEqual(metrics.availableHeight)
})

async function readDesktopFill(page: Page) {
  return page.evaluate(() => {
    const viewport = document
      .querySelector('[data-testid="cad-viewport"]')!
      .getBoundingClientRect()
    const main = document.querySelector('main')!
    const attribution = document.querySelector(
      '[data-testid="cad-attribution"]',
    )
    const attributionBlockHeight = attribution
      ? attribution.getBoundingClientRect().height +
        Number.parseFloat(getComputedStyle(attribution).marginTop)
      : 0
    const mainPaddingBottom = Number.parseFloat(
      getComputedStyle(main).paddingBottom,
    )
    return {
      windowHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: viewport.height,
      unusedHeightBelowViewport:
        window.innerHeight -
        mainPaddingBottom -
        attributionBlockHeight -
        viewport.bottom,
    }
  })
}

for (const size of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  for (const { model, attributionCount } of [
    { model: 'box', attributionCount: 0 },
    { model: 'opengrid', attributionCount: 1 },
  ]) {
    test(`${model} CAD workspace fills a ${size.width}x${size.height} window without a footer`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await page.goto(`/zh-Hant/cad/${model}`)
      await expect(page.getByTestId('cad-workspace-panel')).toBeVisible()

      await expect(page.locator('footer')).toHaveCount(0)
      await expect(page.locator('[data-site-nav]')).toBeVisible()
      await expect(
        page.locator('main').getByTestId('cad-attribution'),
      ).toHaveCount(attributionCount)

      const fill = await readDesktopFill(page)
      expect(fill.viewportHeight).toBeGreaterThan(520)
      expect(fill.documentHeight).toBeLessThanOrEqual(fill.windowHeight)
      expect(fill.unusedHeightBelowViewport).toBeCloseTo(0, 0)
    })
  }
}

test('a wrapped CAD title shrinks the desktop workspace instead of overflowing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 800 })
  await page.goto('/zh-Hant/cad/opengrid')
  await expect(page.getByTestId('cad-workspace-panel')).toBeVisible()

  const header = page.getByTestId('cad-header')
  const viewport = page.getByTestId('cad-viewport')
  const readHeight = (locator: Locator) =>
    locator.evaluate((element) => element.getBoundingClientRect().height)
  const headerBefore = await readHeight(header)
  const viewportBefore = await readHeight(viewport)

  await page.locator('#cad-title').evaluate((title) => {
    title.textContent = `${title.textContent} ${title.textContent} ${title.textContent}`
  })

  await expect.poll(() => readHeight(header)).toBeGreaterThan(headerBefore)
  const headerGrowth = (await readHeight(header)) - headerBefore
  await expect
    .poll(() => readHeight(viewport))
    .toBeCloseTo(viewportBefore - headerGrowth, 0)
  const fill = await readDesktopFill(page)
  expect(fill.documentHeight).toBeLessThanOrEqual(fill.windowHeight)
})

test('stacked CAD page omits the footer and keeps its mobile controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/zh-Hant/cad/opengrid')

  await expect(page.getByTestId('cad-viewport')).toBeVisible()
  await expect(page.locator('[data-site-nav]')).toBeVisible()
  await expect(page.getByTestId('cad-params-pill')).toBeVisible()
  await expect(page.getByTestId('cad-actions-cluster')).toBeVisible()
  await expect(page.locator('main').getByTestId('cad-attribution')).toHaveCount(
    1,
  )
  await expect(page.locator('footer')).toHaveCount(0)
})

for (const fixture of [
  { size: { width: 1440, height: 900 }, model: 'box' },
  { size: { width: 844, height: 390 }, model: 'opengrid' },
]) {
  test(`static loading preview reserves the ${fixture.model} desktop viewport height at ${fixture.size.width}x${fixture.size.height}`, async ({
    browser,
  }) => {
    const route = `/zh-Hant/cad/${fixture.model}`
    const staticContext = await browser.newContext({
      viewport: fixture.size,
      javaScriptEnabled: false,
    })
    const staticPage = await staticContext.newPage()
    await staticPage.goto(route)
    const preview = staticPage.getByTestId('cad-loading-preview')
    await expect(preview).toBeVisible()
    const fallback = await staticPage.evaluate(() => ({
      previewHeight: document
        .querySelector('[data-testid="cad-loading-preview"]')!
        .getBoundingClientRect().height,
      documentHeight: document.documentElement.scrollHeight,
      windowHeight: window.innerHeight,
    }))
    await staticContext.close()

    const hydratedContext = await browser.newContext({ viewport: fixture.size })
    const hydratedPage = await hydratedContext.newPage()
    await hydratedPage.goto(route)
    await expect(hydratedPage.getByTestId('cad-workspace-panel')).toBeVisible()
    const viewportHeight = await hydratedPage
      .getByTestId('cad-viewport')
      .evaluate((element) => element.getBoundingClientRect().height)
    await hydratedContext.close()

    expect(fallback.documentHeight).toBeLessThanOrEqual(fallback.windowHeight)
    expect(fallback.previewHeight).toBeCloseTo(viewportHeight, 0)
  })
}

test('catalog preview capture keeps one viewport frame regardless of page chrome', async ({
  page,
}) => {
  const readThumbnailFrame = async (
    route: string,
    size: { width: number; height: number },
  ) => {
    await page.setViewportSize(size)
    await page.goto(`${route}?preview=thumbnail`)
    const viewport = page.getByTestId('cad-viewport')
    await expect(viewport).toHaveAttribute('data-presentation', 'thumbnail')
    return viewport.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })
  }

  const withoutAttribution = await readThumbnailFrame('/zh-Hant/cad/box', {
    width: 1440,
    height: 900,
  })
  const withAttribution = await readThumbnailFrame('/zh-Hant/cad/opengrid', {
    width: 1440,
    height: 900,
  })
  const tallerWindow = await readThumbnailFrame('/zh-Hant/cad/opengrid', {
    width: 1440,
    height: 1080,
  })

  expect(withAttribution).toEqual(withoutAttribution)
  expect(tallerWindow).toEqual(withoutAttribution)
})
