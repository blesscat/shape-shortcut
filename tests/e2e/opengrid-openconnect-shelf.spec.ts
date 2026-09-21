import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('selects X/Y/Z cells and clamps the half-degree angle slider', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/zh-Hant/cad/opengrid-openconnect-shelf?system=wall')
  await waitForCadReady(page)

  const limit = page.getByTestId('opengrid-openconnect-shelf-angle-limit')
  const rows = page.getByRole('slider', { name: 'Y', exact: true })
  const connectorRows = page.getByRole('slider', { name: 'Z', exact: true })
  const angleSlider = page.getByRole('slider', {
    name: /列印斜面角度/,
  })
  const angleInput = page.getByRole('textbox', {
    name: /列印斜面角度/,
  })

  await expect(
    page.getByTestId('opengrid-openconnect-shelf-help'),
  ).toContainText('水平安裝面')
  await expect(limit).toContainText('目前 Y=3 格、Z=1 格可用的最大角度為 14°')
  await expect(angleSlider).toHaveAttribute('max', '14')
  await expect(angleSlider).toHaveAttribute('step', '0.5')
  await expect(angleInput).toHaveCount(0)

  await page.getByTestId('openconnect-settings').locator('summary').click()
  await expect(connectorRows).toHaveValue('1')
  await connectorRows.fill('2')
  await expect(limit).toContainText('目前 Y=3 格、Z=2 格可用的最大角度為 30°')
  await expect(angleSlider).toHaveAttribute('max', '30')
  await angleSlider.fill('29.5')
  await waitForCadReady(page)

  await page.reload()
  await waitForCadReady(page)
  await page.getByTestId('openconnect-settings').locator('summary').click()
  await expect(rows).toHaveValue('3')
  await expect(connectorRows).toHaveValue('2')
  await expect(angleSlider).toHaveValue('29.5')

  await connectorRows.fill('1')
  await expect(limit).toContainText('目前 Y=3 格、Z=1 格可用的最大角度為 14°')
  await expect(angleSlider).toHaveAttribute('max', '14')
  await expect(angleSlider).toHaveValue('14')
  await waitForCadReady(page)
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
})
