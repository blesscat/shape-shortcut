import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL } from './helpers'

test('model generation failure shows its reason in a toast and keeps export disabled', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.route('**/*.step', async (route) => {
    if (route.request().url().endsWith('/hsw-cell.step')) {
      await route.fulfill({
        status: 404,
        contentType: 'text/plain',
        body: 'forced model asset failure',
      })
      return
    }
    await route.continue()
  })

  await page.goto('/cad/hsw-cell')

  const toast = page.getByTestId('cad-error-toast')
  await expect(toast).toBeVisible({ timeout: 30_000 })
  await expect(toast).toHaveAttribute('role', 'alert')
  await expect(toast).toHaveAttribute('data-error-code', 'MODEL_ASSET_INVALID')
  await expect(toast.getByTestId('cad-error-toast-message')).toHaveText(
    '原因：模型建立失敗，請調整參數後重試。',
  )
  await toast.getByRole('button', { name: '關閉錯誤通知' }).click()
  await expect(toast).toBeHidden()
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
})
