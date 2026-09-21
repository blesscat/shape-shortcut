import { expect, test } from '@playwright/test'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  COMPONENT_PARAMETER_STORAGE_VERSION,
} from '../../src/features/cad/parameters'
import { skipHeadlessFirefoxWithoutWebGL } from './helpers'

for (const locale of ['zh-Hant', 'en'] as const) {
  test(`${locale}: integrated slot fits, persists and exports without clamping`, async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(180_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto(`/${locale}/cad/opengrid-openconnect-organizer?system=wall`)
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })
    const viewport = page.getByTestId('cad-viewport')
    const before = await viewport.getAttribute('data-model-revision')
    await page.getByTestId('organizer-label-slot-enabled').check()
    await expect(viewport).not.toHaveAttribute(
      'data-model-revision',
      before ?? '',
      { timeout: 90_000 },
    )
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })
    const units = page.getByTestId('organizer-label-grid-units')
    await expect(units).toHaveRole('slider')
    await expect(units).toHaveValue('3')
    await expect(
      page.getByTestId('organizer-label-width-summary'),
    ).toContainText('30 mm')
    await page.screenshot({
      path: testInfo.outputPath('integrated-slot.png'),
      fullPage: true,
    })
    const stepButton = page.getByRole('button', {
      name: locale === 'en' ? 'Download STEP' : '下載 STEP',
      exact: true,
    })
    const stlButton = page.getByRole('button', {
      name: locale === 'en' ? 'Download STL' : '下載 STL',
      exact: true,
    })
    for (const [button, extension] of [
      [stepButton, 'step'],
      [stlButton, 'stl'],
    ] as const) {
      const pendingDownload = page.waitForEvent('download')
      await button.click()
      const download = await pendingDownload
      expect(download.suggestedFilename()).toContain(`label3.${extension}`)
    }
    await units.press('ArrowRight')
    await expect(page.locator('#organizer-label-fit')).toContainText(
      locale === 'en' ? 'exceeds' : '超出',
    )
    await expect(units).toHaveValue('4')
    await expect(stepButton).toBeDisabled()
    await expect(stlButton).toBeDisabled()
    await page.reload()
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })
    await expect(page.getByTestId('organizer-label-slot-enabled')).toBeChecked()
    await expect(units).toHaveRole('slider')
    await expect(units).toHaveValue('3')
  })

  test(`${locale}: card units migrate and reject narrow text`, async ({
    page,
    browserName,
  }) => {
    test.setTimeout(180_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.addInitScript(
      ({ key, version }) => {
        if (localStorage.getItem(key)) return
        localStorage.setItem(
          key,
          JSON.stringify({
            version,
            values: {
              wall: {
                'opengrid-label-card': {
                  widthTier: 30,
                  style: 'raised',
                  icon: 'gear-fill',
                  text: '',
                },
              },
            },
          }),
        )
      },
      {
        key: COMPONENT_PARAMETER_STORAGE_KEY,
        version: COMPONENT_PARAMETER_STORAGE_VERSION,
      },
    )
    await page.goto(`/${locale}/cad/opengrid-label-card?system=wall`)
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })
    const units = page.getByTestId('opengrid-label-card-grid-units')
    await expect(units).toHaveRole('slider')
    await expect(units).toHaveValue('3')
    const viewport = page.getByTestId('cad-viewport')
    const before = await viewport.getAttribute('data-model-revision')
    await units.press('ArrowRight')
    await units.press('ArrowRight')
    await expect(viewport).not.toHaveAttribute(
      'data-model-revision',
      before ?? '',
      { timeout: 90_000 },
    )
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })
    await expect(page.getByTestId('label-card-width-summary')).toContainText(
      '50 mm',
    )
    const exportButton = page.getByRole('button', {
      name: locale === 'en' ? 'Download 3MF' : '下載 3MF',
      exact: true,
    })
    await expect(exportButton).toBeEnabled()
    const pendingDownload = page.waitForEvent('download')
    await exportButton.click()
    expect((await pendingDownload).suggestedFilename()).toContain('w50')
    await page.reload()
    await expect(
      page.getByRole('button', { name: /^(下載 STEP|Download STEP)$/ }),
    ).toBeEnabled({ timeout: 90_000 })
    await expect(units).toHaveValue('5')
    await units.press('Home')
    await page
      .getByRole('textbox', {
        name: locale === 'en' ? 'Label card text' : '標籤卡文字',
        exact: true,
      })
      .fill('ABCDEF')
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: locale === 'en' ? 'usable card width' : '可用寬度' })
        .first(),
    ).toBeVisible()
    await expect(exportButton).toBeDisabled()
    await expect(units).toHaveValue('1')
  })
}
