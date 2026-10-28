import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL } from './helpers'

test.describe('card-box', () => {
  test('gates assembly downloads, switches parts, and persists parameters', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto('/zh-Hant/cad/card-box')

    // Assembly default: the exact model commits, downloads stay disabled
    // and the pick-a-part hint is visible.
    const viewport = page.getByTestId('cad-viewport')
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
    await expect(page.getByTestId('cad-download-hint')).toBeVisible()
    const stepButton = page.getByRole('button', { name: '下載 STEP' })
    const stlButton = page.getByRole('button', { name: '下載 STL' })
    await expect(stepButton).toBeDisabled()
    await expect(stlButton).toBeDisabled()

    // Picking a part enables its downloads and hides the hint.
    await page.getByTestId('card-box-part').selectOption('box')
    await expect(page.getByTestId('cad-download-hint')).toBeHidden()
    await expect(stepButton).toBeEnabled({ timeout: 120_000 })
    const pendingDownload = page.waitForEvent('download')
    await stepButton.click()
    const download = await pendingDownload
    expect(download.suggestedFilename()).toBe('card-box-box-70x120x72.step')

    // Cover: two-color 3MF appears with accent art and either style.
    await page.getByTestId('card-box-part').selectOption('cover')
    const threeMfButton = page.getByRole('button', { name: '下載 3MF' })
    await expect(threeMfButton).toBeEnabled({ timeout: 120_000 })
    // Raised is covered by the default; switching style keeps 3MF available.
    await page.getByLabel('封面樣式').selectOption('flat')
    await expect(threeMfButton).toBeEnabled({ timeout: 120_000 })
    // Blank cover (no title/subtitle/SVG): the 3MF button disappears
    // entirely (STEP/STL only), like the label card's blank plate.
    await page.getByLabel('標題', { exact: true }).fill('')
    await expect(threeMfButton).toBeHidden({ timeout: 120_000 })
    await expect(stepButton).toBeEnabled()

    // The SVG import control shows the Beta badge in the cover section.
    await expect(page.getByTestId('card-box-svg-import')).toBeVisible()
    await expect(
      page
        .getByTestId('card-box-svg-import')
        .getByText('Beta', { exact: true }),
    ).toBeVisible()

    // Parameters persist across reloads, including the part selection.
    await page.getByTestId('card-box-part').selectOption('box')
    await page.getByLabel('卡片寬').first().fill('63')
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
    await page.reload()
    await expect(page.getByTestId('card-box-part')).toHaveValue('box', {
      timeout: 30_000,
    })
    await expect(page.getByRole('textbox', { name: /卡片寬/ })).toHaveValue(
      '63',
      { timeout: 30_000 },
    )
  })

  test('surfaces oversized divider text as a field error without shrinking', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto('/zh-Hant/cad/card-box')

    await page.getByTestId('card-box-part').selectOption('divider')
    await page.getByLabel('分隔板文字（選配）').fill('WWWWWWWWWWWWWWWWWWWW')
    // The worker must refuse the build (never shrink the text) and the
    // field error lands on the divider text input.
    await expect(page.getByTestId('cad-error-toast')).toBeVisible({
      timeout: 120_000,
    })
    await expect(page.locator('#dividerText-error')).toBeVisible({
      timeout: 30_000,
    })
    const stepButton = page.getByRole('button', { name: '下載 STEP' })
    await expect(stepButton).toBeDisabled()
  })
})
