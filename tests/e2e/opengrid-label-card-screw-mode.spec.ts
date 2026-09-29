import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL } from './helpers'

test.describe('label card screw mode', () => {
  test('composes, exports, and persists screw selections', async (
    { page, browserName },
    testInfo,
  ) => {
    test.setTimeout(180_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto('/zh-Hant/cad/opengrid-label-card?system=wall')
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })

    await expect(page.getByTestId('opengrid-label-card-icon-gallery')).toBeVisible()
    await page.getByTestId('opengrid-label-card-screw-mode-on').click()
    await expect(page.getByTestId('opengrid-label-card-screw-head')).toBeVisible()
    await expect(page.getByTestId('opengrid-label-card-screw-diameter')).toBeVisible()
    await expect(page.getByTestId('opengrid-label-card-screw-length')).toBeVisible()
    await expect(
      page.getByTestId('opengrid-label-card-icon-gallery'),
    ).toBeHidden()
    await expect(page.getByTestId('opengrid-label-card-layout')).toBeHidden()

    await page.getByTestId('opengrid-label-card-screw-head-hex').click()
    const viewport = page.getByTestId('cad-viewport')
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 90_000,
    })
    await page.screenshot({
      path: testInfo.outputPath('screw-hex-m4.png'),
      fullPage: true,
    })

    const pendingDownload = page.waitForEvent('download')
    await page
      .getByRole('button', { name: '下載 STEP', exact: true })
      .click()
    const download = await pendingDownload
    expect(download.suggestedFilename()).toContain('-sm-hex-d4-l16.step')

    await page.getByTestId('opengrid-label-card-screw-head-phillips').click()
    await page.getByTestId('opengrid-label-card-screw-diameter').selectOption('2.5')
    await page.getByTestId('opengrid-label-card-screw-length').fill('30')
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })
    await page.screenshot({
      path: testInfo.outputPath('screw-phillips-m2.5.png'),
      fullPage: true,
    })

    await page.reload()
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })
    await expect(page.getByTestId('opengrid-label-card-screw-mode-on')).toBeVisible()
    await expect(
      page.getByTestId('opengrid-label-card-screw-head-phillips'),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByTestId('opengrid-label-card-screw-diameter'),
    ).toHaveValue('2.5')
    await expect(page.getByTestId('opengrid-label-card-screw-length')).toHaveValue(
      '30',
    )

    await page.getByTestId('opengrid-label-card-screw-mode-off').click()
    await expect(page.getByTestId('opengrid-label-card-icon-gallery')).toBeVisible()
    await expect(
      page.getByTestId('opengrid-label-card-screw-head'),
    ).toBeHidden()
  })
})
