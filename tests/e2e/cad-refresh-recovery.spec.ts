import { expect, test } from '@playwright/test'

for (const locale of ['zh-Hant', 'en'] as const) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`legacy mobile recovery and export ${locale} ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.emulateMedia({ colorScheme })
      await page.route('**/hsw-cell.step', (route) =>
        route.fulfill({ status: 404, body: 'unavailable' }),
      )
      await page.goto(`/${locale}/cad/hsw-cell`)
      const toast = page.getByTestId('cad-error-toast')
      await expect(toast).toHaveAttribute(
        'data-error-code',
        'MODEL_ASSET_INVALID',
        { timeout: 30_000 },
      )
      await expect(toast.getByTestId('cad-error-toast-message')).not.toBeEmpty()
      const actions = page.getByTestId('cad-actions-cluster')
      const stl = actions.getByRole('button', { name: /STL/ })
      await expect(stl).toBeDisabled()
      await expect(page.getByTestId('cad-progress')).toHaveCount(0)
      await toast.getByRole('button').click()
      await page.unroute('**/hsw-cell.step')
      await actions
        .getByRole('button', {
          name: locale === 'en' ? 'Retry' : '重試',
          exact: true,
        })
        .click()
      await expect(stl).toBeEnabled({ timeout: 30_000 })
      await expect(toast).toHaveCount(0)
      await expect(page.getByTestId('cad-progress')).toHaveCount(0)
      const downloadPromise = page.waitForEvent('download')
      await stl.click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.stl$/)
      expect(await download.failure()).toBeNull()
    })
  }
}
