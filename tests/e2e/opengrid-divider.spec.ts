import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid divider is listed with independent directional controls', async ({
  page,
}) => {
  await page.goto('/models')
  const modelLink = page
    .getByRole('heading', { name: 'divider (分隔牆)', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 divider (分隔牆)', exact: true })
  await expect(modelLink).toHaveAttribute(
    'href',
    '/cad/opengrid-divider?system=desk',
  )
  await modelLink.click()

  await expect(page).toHaveURL('/cad/opengrid-divider?system=desk')
  await expect(
    page.getByRole('heading', { name: '目前編輯：divider (分隔牆)' }),
  ).toBeVisible()
  await expect(
    page.getByText(/官方 OpenGrid 間距：整格 28 mm、半格 14 mm/),
  ).toHaveCount(0)
  await expect(page.getByText(/自製底座半格 7 mm、整格 14 mm/)).toHaveCount(0)
  await expect(page.getByText(/中心距 28 mm/)).toHaveCount(0)
  await expect(page.getByTestId('opengrid-divider-summary')).toHaveCount(0)
  await expect(
    page.getByTestId('opengrid-divider-honeycomb-mode'),
  ).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(1)
  await expect(page.getByText(/Full|Lite|Heavy|螺絲|接頭孔/)).toHaveCount(0)

  for (const name of ['左臂（X）', '右臂（X）', '上臂（Y）', '下臂（Y）']) {
    await expect(page.getByRole('slider', { name })).toHaveAttribute('min', '0')
    await expect(page.getByRole('slider', { name })).toHaveAttribute(
      'max',
      '10',
    )
    await expect(page.getByRole('slider', { name })).toHaveAttribute(
      'step',
      '0.5',
    )
  }
  await expect(page.getByRole('slider', { name: '左臂（X）' })).toHaveValue(
    '1.5',
  )
  await expect(page.getByRole('slider', { name: '右臂（X）' })).toHaveValue(
    '1.5',
  )
  await expect(page.getByRole('slider', { name: '上臂（Y）' })).toHaveValue('0')
  await expect(page.getByRole('slider', { name: '下臂（Y）' })).toHaveValue('0')
  const height = page.getByRole('textbox', { name: '分隔牆高度（Z）' })
  const heightSlider = page.getByRole('slider', { name: '分隔牆高度（Z）' })
  await expect(height).toHaveAttribute('min', '2')
  await expect(height).toHaveAttribute('max', '500')
  await expect(heightSlider).toHaveAttribute('min', '2')
  await expect(heightSlider).toHaveAttribute('max', '200')
  const wallThickness = page.getByRole('textbox', { name: '上方牆厚（Z）' })
  await expect(wallThickness).toHaveAttribute('min', '1')
  await expect(wallThickness).toHaveAttribute('max', '5')
  await expect(wallThickness).toHaveValue('2')

  await wallThickness.fill('4')
  await expect(wallThickness).toHaveValue('4')

  await page.getByRole('slider', { name: '上臂（Y）' }).press('ArrowRight')
})

test('OpenGrid divider saving mode gates by height and shows the cell estimate', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-divider')
  await waitForCadReady(page)

  const toggle = page.getByTestId('opengrid-divider-honeycomb-mode')
  await expect(toggle).toBeEnabled()

  await toggle.check()
  await expect(page.getByTestId('honeycomb-cell-count-estimate')).toBeVisible()
  await waitForCadReady(page)

  const height = page.getByRole('textbox', { name: '分隔牆高度（Z）' })
  await height.fill('11')
  await expect(
    page.getByTestId('opengrid-divider-honeycomb-too-small'),
  ).toBeVisible()
  await expect(toggle).toBeEnabled()
  await toggle.uncheck()
  await expect(toggle).toBeDisabled()
})

test('OpenGrid divider saving mode disables over-limit sizes with a hint', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-divider')
  await waitForCadReady(page)

  for (const name of ['左臂（X）', '右臂（X）', '上臂（Y）', '下臂（Y）']) {
    await page.getByRole('slider', { name }).fill('8')
  }
  const height = page.getByRole('textbox', { name: '分隔牆高度（Z）' })
  await height.fill('500')
  await waitForCadReady(page)

  const toggle = page.getByTestId('opengrid-divider-honeycomb-mode')
  await expect(toggle).toBeDisabled()
  await expect(
    page.getByTestId('opengrid-divider-honeycomb-too-large'),
  ).toBeVisible()
})

test('OpenGrid divider exports the committed normalized shape', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-divider')
  await waitForCadReady(page)

  const height = page.getByRole('textbox', { name: '分隔牆高度（Z）' })
  await height.fill('24')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-divider-l1.5-r1.5-u0-d0-t2-h24.step',
  )
})

test('OpenGrid divider rejects a planar footprint above 500 mm', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-divider')
  await waitForCadReady(page)

  const left = page.getByRole('slider', { name: '左臂（X）' })
  const right = page.getByRole('slider', { name: '右臂（X）' })
  await left.fill('10')
  await right.fill('10')

  await expect(right).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toContainText('500 mm')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
})
