import { expect, test } from '@playwright/test'
import { PROTOTYPE_CONFIGURATION } from '../../src/cad-contract/units'
import {
  expectDimensionAnnotationBoxesToStayStable,
  isAstroDevToolbarError,
  readBinaryStlByteLength,
  readDimensionAnnotationBoxes,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

test('box CAD route exposes fallback and locked parameter controls', async ({
  page,
}) => {
  await page.goto('/cad/box')
  await expect(
    page.getByRole('heading', { name: '目前編輯：方塊', exact: true }),
  ).toBeVisible()
  for (const name of [/寬度/, /深度/, /高度/]) {
    const field = page.getByRole('textbox', { name })
    await expect(field).toBeVisible()
    await expect(field).toHaveAttribute('max', '500')
  }
  await expect(
    page.getByRole('combobox', { name: 'CAD component' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: '返回模型選擇' }),
  ).toHaveAttribute('href', '/zh-Hant/models')
  await expect(page.locator('#cad-fallback')).toBeHidden()
})

test('changed parameter controls expose a restore button', async ({ page }) => {
  await page.goto('/cad/box')

  const width = page.getByRole('textbox', { name: /寬度/ })
  const restoreWidth = page.getByRole('button', { name: '復原寬度' })

  await expect(restoreWidth).toHaveCount(0)
  await width.fill('25')
  await expect(width).toHaveValue('25')
  await expect(restoreWidth).toBeVisible()

  await restoreWidth.click()
  await expect(width).toHaveValue(
    String(PROTOTYPE_CONFIGURATION.defaultDimensions.width),
  )
  await expect(restoreWidth).toHaveCount(0)
})

test('CAD route shows the current loading stage', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.context().route('**/replicad_single.wasm', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })

  await page.goto('/cad/box')

  const progress = page.getByRole('progressbar', {
    name: '載入 CAD engine',
  })
  const viewport = page.getByTestId('cad-viewport')
  const provisionalStatus = page.getByTestId('cad-simplified-status')
  await Promise.all([
    expect(progress).toBeVisible(),
    expect(progress).toHaveAttribute('aria-valuenow', '1'),
    expect(page.getByTestId('cad-progress')).toContainText('載入 CAD engine'),
    expect(provisionalStatus).toBeVisible(),
    expect(viewport).toHaveAttribute('data-preview-kind', 'simplified'),
    expect(
      page.getByTestId('cad-progress').locator('[data-stage]'),
    ).toHaveCount(4),
  ])

  const viewportRect = () =>
    viewport.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { height: rect.height, top: rect.top }
    })
  const loadingViewport = await viewportRect()

  await waitForCadReady(page)
  const readyViewport = await viewportRect()

  expect(readyViewport).toEqual(loadingViewport)
})

test('CAD progress floats above the workspace while loading', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.context().route('**/replicad_single.wasm', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })

  await page.goto('/cad/box')

  const progress = page.getByTestId('cad-progress')
  await expect(progress).toBeVisible()

  const layout = await progress.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      position: getComputedStyle(element).position,
      right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.bottom,
    }
  })

  expect(layout.position).toBe('fixed')
  expect(layout.right).toBeGreaterThanOrEqual(0)
  expect(layout.bottom).toBeGreaterThanOrEqual(0)
})

test('CAD workspace shows the compact ready status after clearing progress', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')

  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 30_000,
  })
  await expect(page.getByTestId('cad-current-status')).toHaveText('模型已更新')
  await expect(page.getByTestId('cad-progress')).toHaveCount(0)
})

test('CAD route keeps a readable static fallback when JavaScript is unavailable', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/cad/box')
  await expect(
    page.getByRole('heading', { name: '目前編輯：方塊', exact: true }),
  ).toBeVisible()
  await expect(page.locator('#cad-fallback')).toBeVisible()
  await expect(page.getByText(/需要 JavaScript、WebAssembly/)).toBeVisible()
  await expect(page.getByLabel(/^(寬度 X|深度 Y|高度 Z) \d+ mm$/)).toHaveCount(
    0,
  )
  await context.close()
})

test('CAD workspace preserves responsive columns within the viewport', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => {
    if (!isAstroDevToolbarError(error.message))
      runtimeErrors.push(error.message)
  })
  page.on('console', (message) => {
    if (message.type() === 'error' && !isAstroDevToolbarError(message.text())) {
      runtimeErrors.push(message.text())
    }
  })

  await page.context().route('**/replicad_single.wasm', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    await route.continue()
  })

  await page.setViewportSize({ width: 760, height: 720 })
  await page.goto('/cad/box')
  const workspace = page.getByTestId('cad-workspace')
  const viewport = page.getByTestId('cad-viewport')
  await expect(workspace).toBeVisible()
  await expect(
    page.getByRole('progressbar', { name: '載入 CAD engine' }),
  ).toBeVisible()

  const columnCount = () =>
    workspace.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
    )

  await expect.poll(columnCount).toBe(1)
  const hasHorizontalOverflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    )
  const hasVerticalOverflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollHeight <=
        document.documentElement.clientHeight,
    )
  expect(await hasHorizontalOverflow()).toBeTruthy()

  await page.setViewportSize({ width: 761, height: 720 })
  await expect.poll(columnCount).toBe(2)
  await expect(page.getByTestId('cad-progress')).toBeVisible()
  await expect.poll(hasHorizontalOverflow).toBeTruthy()
  await expect.poll(hasVerticalOverflow).toBeTruthy()
  // The two-column viewport fills the window down to the main padding.
  await expect
    .poll(() =>
      viewport.evaluate((element) => {
        const mainPaddingBottom = Number.parseFloat(
          getComputedStyle(document.querySelector('main')!).paddingBottom,
        )
        return (
          window.innerHeight -
          mainPaddingBottom -
          element.getBoundingClientRect().bottom
        )
      }),
    )
    .toBeCloseTo(0, 0)
  expect(runtimeErrors).toEqual([])
})

test('CAD Worker builds the default box in a WebGL-enabled browser', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()
  await expect(page.getByTestId('cad-viewport').locator('canvas')).toHaveCount(
    1,
  )
  const viewport = page.getByTestId('cad-viewport')
  const viewportContentHeight = await viewport.evaluate(
    (element) => element.clientHeight,
  )
  const canvasHeight = await page
    .getByTestId('cad-viewport')
    .locator('canvas')
    .evaluate((element) => element.getBoundingClientRect().height)
  expect(canvasHeight).toBe(viewportContentHeight)
  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 30 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 40 mm')).toBeVisible()
})

test('CAD Worker exports one non-empty STEP download for the committed revision', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('box-20x30x40.step')
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  let byteLength = 0
  for await (const chunk of stream ?? []) byteLength += chunk.length
  expect(byteLength).toBeGreaterThan(0)
})

test('CAD Worker exports one non-empty STL download for the committed revision', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('box-20x30x40.stl')
  expect(await readBinaryStlByteLength(download)).toBeGreaterThan(84)
})

test('parameter updates use the latest valid generation and preserve stale preview on invalid input', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await waitForCadReady(page)
  await expect(width).toHaveValue('25')
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()

  await width.fill('25.5')
  await expect(width).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toContainText('寬度 輸入無效')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
  await expect(page.getByLabel('寬度 X 25.5 mm')).toHaveCount(0)

  await width.fill('26')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 26 mm')).toBeVisible()
})

test('dimension annotations remain attached through viewport resize and orbit interaction', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const canvas = page.getByTestId('cad-viewport').locator('canvas')
  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await page.setViewportSize({ width: 900, height: 720 })
  await expect(canvas).toBeVisible()

  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds) {
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 80,
      bounds.y + bounds.height / 2 + 25,
    )
    await page.mouse.up()
  }

  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 30 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 40 mm')).toBeVisible()
})
