import { expect, test } from '@playwright/test'

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
  expect(viewportAfterScroll.height).toBeLessThanOrEqual(520)
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
