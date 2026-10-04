import { expect, test, type Page } from '@playwright/test'
import { PROTOTYPE_CONFIGURATION } from '../../src/cad-contract/units'
import { waitForCadReady } from './helpers'

async function openDrawer(page: Page): Promise<void> {
  await page.getByTestId('cad-params-pill').click()
  await expect(page.getByTestId('cad-params-drawer')).toBeVisible()
}

async function readViewportBox(page: Page) {
  return page.getByTestId('cad-viewport').boundingBox()
}

test('narrow workspace uses a translucent bottom drawer with external actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/cad/box')

  const pill = page.getByTestId('cad-params-pill')
  const drawer = page.getByTestId('cad-params-drawer')
  const cluster = page.getByTestId('cad-actions-cluster')

  await expect(page.getByTestId('cad-workspace-panel')).toHaveCount(0)
  await expect(pill).toBeVisible()
  await expect(pill).toHaveAttribute('aria-expanded', 'false')
  await expect(cluster.getByRole('button', { name: '下載 STL' })).toBeVisible()

  // The drawer overlays the viewport instead of resizing it, so the camera
  // framing contract must not see a size change across open/close.
  const viewportBoxBefore = await readViewportBox(page)
  expect(viewportBoxBefore).not.toBeNull()

  await pill.click()
  await expect(drawer).toBeVisible()
  await expect(pill).toHaveAttribute('aria-expanded', 'true')

  const viewportBoxWhileOpen = await readViewportBox(page)
  expect(
    Math.abs(viewportBoxWhileOpen!.y - viewportBoxBefore!.y),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(viewportBoxWhileOpen!.height - viewportBoxBefore!.height),
  ).toBeLessThanOrEqual(1)

  const windowHeight = await page.evaluate(() => window.innerHeight)
  await expect
    .poll(() =>
      drawer.evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeCloseTo(windowHeight * 0.65, -1)

  // The sheet must be translucent so the model stays visible behind it.
  const backgroundAlpha = await drawer.evaluate((element) => {
    const match = getComputedStyle(element).backgroundColor.match(/([\d.]+)\)$/)
    return match ? Number.parseFloat(match[1]) : 1
  })
  expect(backgroundAlpha).toBeLessThan(1)

  // Opening the drawer locks the page scroll behind it; closing restores it.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .toBe('hidden')
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .not.toBe('hidden')
  await expect(pill).toHaveAttribute('aria-expanded', 'false')
  await expect(pill).toBeFocused()
  const viewportBoxAfterClose = await readViewportBox(page)
  expect(
    Math.abs(viewportBoxAfterClose!.y - viewportBoxBefore!.y),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(viewportBoxAfterClose!.height - viewportBoxBefore!.height),
  ).toBeLessThanOrEqual(1)

  await pill.click()
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: '關閉參數面板' }).click()
  await expect(drawer).toBeHidden()
  await expect(pill).toBeFocused()

  // The pill toggles: a second tap on the open drawer's pill closes it.
  await pill.click()
  await expect(drawer).toBeVisible()
  await pill.click()
  await expect(drawer).toBeHidden()
  await expect(pill).toHaveAttribute('aria-expanded', 'false')
  await expect(pill).toBeFocused()
})

test('invalid input shows the pill status dot and keeps exports disabled', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/cad/box')

  const pill = page.getByTestId('cad-params-pill')
  const drawer = page.getByTestId('cad-params-drawer')
  const cluster = page.getByTestId('cad-actions-cluster')
  const invalidDot = pill.locator('span.bg-error')

  await expect(invalidDot).toHaveCount(0)
  await openDrawer(page)

  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('0')
  await expect(invalidDot).toBeVisible()
  await expect(cluster).toBeVisible()
  await expect(cluster.getByRole('button', { name: '下載 STL' })).toBeDisabled()

  await drawer.getByRole('button', { name: '全部恢復預設' }).click()
  await expect(width).toHaveValue(
    String(PROTOTYPE_CONFIGURATION.defaultDimensions.width),
  )
  await expect(invalidDot).toHaveCount(0)
})

test('a valid input change marks the pill stale until the new build commits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const pill = page.getByTestId('cad-params-pill')
  const staleDot = pill.locator('span.bg-stale')

  await openDrawer(page)
  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await expect(staleDot).toBeVisible({ timeout: 5_000 })
  await expect(staleDot).toBeHidden({ timeout: 30_000 })
  await expect(width).toHaveValue('25')
})

test('desktop keeps the drawer, pill and action cluster out of the DOM', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/cad/box')

  for (const testId of [
    'cad-params-pill',
    'cad-params-drawer',
    'cad-actions-cluster',
  ]) {
    await expect(page.getByTestId(testId)).toHaveCount(0)
  }
  await expect(page.getByTestId('cad-workspace-panel')).toBeVisible()

  await page.goto('/cad/playground')
  await expect(page.getByTestId('playground-sidebar')).toBeVisible()
  for (const testId of [
    'playground-sidebar-pill',
    'playground-sidebar-drawer',
  ]) {
    await expect(page.getByTestId(testId)).toHaveCount(0)
  }
})
