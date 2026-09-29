import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL } from './helpers'

for (const locale of ['zh-Hant', 'en']) {
  test(`${locale}: standalone slot slider persists and exports`, async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto(`/${locale}/cad/opengrid-label-slot-test?system=wall`)
    const step = page.getByRole('button', {
      name: /^(下載 STEP|Download STEP)$/,
    })
    await expect(step).toBeEnabled({ timeout: 90_000 })
    const slider = page.getByRole('slider')
    await expect(slider).toHaveValue('3')
    for (const format of ['STEP', 'STL']) {
      const pending = page.waitForEvent('download')
      await page
        .getByRole('button', {
          name: new RegExp(`^(下載 ${format}|Download ${format})$`),
        })
        .click()
      const download = await pending
      expect(download.suggestedFilename()).toBe(
        `opengrid-label-slot-test-3u.${format.toLowerCase()}`,
      )
      await download.saveAs(testInfo.outputPath(download.suggestedFilename()))
    }
    await page.screenshot({
      path: testInfo.outputPath('slot-test.png'),
      fullPage: true,
    })
    const viewport = page.getByTestId('cad-viewport')
    const previous = await viewport.getAttribute('data-model-revision')
    await slider.press('ArrowRight')
    await expect(viewport).not.toHaveAttribute(
      'data-model-revision',
      previous ?? '',
      { timeout: 90_000 },
    )
    await expect(step).toBeEnabled()
    await expect(page.getByText(/40 mm ·/)).toBeVisible()
    await page.reload()
    await expect(step).toBeEnabled({ timeout: 90_000 })
    await expect(slider).toHaveValue('4')
  })
}
