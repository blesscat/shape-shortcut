import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('Stackable box panel shows the defaults button followed by its preset', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box?system=desk')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await waitForCadReady(page)

  const restoreButton = page.getByRole('button', { name: '全部恢復預設' })
  const presetButton = page.getByTestId('cad-preset-3x3-desk-style')
  await expect(restoreButton).toBeVisible()
  await expect(presetButton).toHaveText('3×3 測試樣式')

  const labels = await page
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons
        .filter((button) =>
          button.matches(
            '[data-testid^="cad-preset-"], [aria-label="全部恢復預設"]',
          ),
        )
        .map((button) => button.getAttribute('aria-label')),
    )
  expect(labels).toEqual(['全部恢復預設', '3×3 測試樣式'])
})

test('Applying the 3x3 preset overwrites parameters and persists in desk scope', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box?system=desk')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await waitForCadReady(page)

  await page.getByTestId('cad-preset-3x3-desk-style').click()
  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('3')
  await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue('3')
  await expect(
    page.getByRole('textbox', { name: '盒內淨高（Z）' }),
  ).toHaveValue('30')
  const topRimGroup = page.getByRole('radiogroup', { name: '上緣' })
  await expect(topRimGroup.getByRole('radio', { name: '平頂' })).toBeChecked()
  const bottomGroup = page.getByRole('radiogroup', { name: '盒底' })
  await expect(bottomGroup.getByRole('radio', { name: '薄殼' })).toBeChecked()
  await waitForCadReady(page)

  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('3')
  await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue('3')
  await expect(
    page.getByRole('textbox', { name: '盒內淨高（Z）' }),
  ).toHaveValue('30')
})

test('Defaults button keeps the system-aware restore behavior', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box?system=desk')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await waitForCadReady(page)

  await page.getByTestId('cad-preset-3x3-desk-style').click()
  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('3')
  await waitForCadReady(page)

  await page.getByRole('button', { name: '全部恢復預設' }).click()
  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('4')
  await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue('2')
  await expect(
    page.getByRole('textbox', { name: '盒內淨高（Z）' }),
  ).toHaveValue('30')
})

test('Applying a preset on one component leaves other components untouched', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/zh-Hant/cad/opengrid-stackable-box?system=desk')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await waitForCadReady(page)
  await page.getByTestId('cad-preset-3x3-desk-style').click()
  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('3')
  await waitForCadReady(page)

  await page.goto('/zh-Hant/cad/box')
  await waitForCadReady(page)
  await page.getByRole('textbox', { name: /寬度/ }).fill('25')
  await waitForCadReady(page)

  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
})

test('Components without presets keep the single defaults button', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/box')
  await waitForCadReady(page)

  await expect(page.getByRole('button', { name: '全部恢復預設' })).toBeVisible()
  await expect(page.getByTestId('cad-preset-3x3-desk-style')).toHaveCount(0)
})
