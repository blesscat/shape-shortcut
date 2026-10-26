import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL } from './helpers'

const FIT_LABELS = {
  'zh-Hant': ['鬆 0.5 mm', '標準 0.6 mm', '緊 0.7 mm'],
  en: ['Loose 0.5 mm', 'Normal 0.6 mm', 'Tight 0.7 mm'],
} as const

for (const locale of ['zh-Hant', 'en'] as const) {
  test(`${locale}: ledge coupon persists width and fit and exports`, async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(180_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto(`/${locale}/cad/opengrid-label-ledge-test?system=desk`)
    const step = page.getByRole('button', {
      name: /^(下載 STEP|Download STEP)$/,
    })
    await expect(step).toBeEnabled({ timeout: 120_000 })
    for (const label of FIT_LABELS[locale]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    const pending = page.waitForEvent('download')
    await step.click()
    const download = await pending
    expect(download.suggestedFilename()).toBe(
      'opengrid-label-ledge-test-3u-fit-normal.step',
    )
    await download.saveAs(testInfo.outputPath(download.suggestedFilename()))

    await page.getByTestId('opengrid-label-ledge-test-snap-fit-tight').check()
    await page.getByRole('slider').press('ArrowRight')
    await expect(step).toBeEnabled({ timeout: 120_000 })
    const tightDownload = page.waitForEvent('download')
    await step.click()
    expect((await tightDownload).suggestedFilename()).toBe(
      'opengrid-label-ledge-test-4u-fit-tight.step',
    )
    await page.reload()
    await expect(step).toBeEnabled({ timeout: 120_000 })
    await expect(page.getByRole('slider')).toHaveValue('4')
    await expect(
      page.getByTestId('opengrid-label-ledge-test-snap-fit-tight'),
    ).toBeChecked()
  })

  test(`${locale}: box label ledge adds the export token and follows wall and fit`, async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto(`/${locale}/cad/opengrid-stackable-box?system=desk`)
    const step = page.getByRole('button', {
      name: /^(下載 STEP|Download STEP)$/,
    })
    await expect(step).toBeEnabled({ timeout: 120_000 })
    await page.getByTestId('opengrid-stackable-box-label-enabled').check()
    await expect(
      page.getByTestId('opengrid-stackable-box-label-units'),
    ).toHaveValue('4')
    await expect(step).toBeEnabled({ timeout: 180_000 })
    const pending = page.waitForEvent('download')
    await step.click()
    const download = await pending
    expect(download.suggestedFilename()).toContain('-label4u-back-fit-normal')
    await download.saveAs(testInfo.outputPath(download.suggestedFilename()))
    await page
      .getByTestId('opengrid-stackable-box-label-snap-fit-loose')
      .check()
    await page.getByTestId('opengrid-stackable-box-label-wall-front').check()
    await expect(step).toBeEnabled({ timeout: 180_000 })
    const frontDownload = page.waitForEvent('download')
    await step.click()
    expect((await frontDownload).suggestedFilename()).toContain(
      '-label4u-front-fit-loose',
    )
  })
}
