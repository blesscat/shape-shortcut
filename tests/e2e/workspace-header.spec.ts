import { expect, test } from '@playwright/test'

test('CAD header shows the current model and a return link', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')

  await expect(
    page.getByRole('heading', { name: '目前編輯：opengrid board (底版)' }),
  ).toBeVisible()
  await expect(page.getByText('Browser CAD Prototype')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'CAD workspace' }),
  ).toHaveCount(0)
  await expect(
    page.getByText('OpenGrid 底板參數', { exact: true }),
  ).toHaveCount(0)
  await expect(page.getByText(/目前編輯此 component/)).toHaveCount(0)
  await expect(
    page.getByText('OpenGrid 官方參數', { exact: true }),
  ).toHaveCount(0)

  const returnLink = page.getByRole('link', { name: '返回模型選擇' })
  await expect(returnLink).toBeVisible()
  await expect(returnLink).toHaveAttribute('href', '/zh-Hant/models')
  await returnLink.click()
  await expect(page).toHaveURL('/zh-Hant/models')
})

test('English CAD header returns to the English model catalog', async ({
  page,
}) => {
  await page.goto('/en/cad/box')
  await expect(
    page.getByRole('heading', { name: 'Editing: Box', exact: true }),
  ).toBeVisible()
  const returnLink = page.locator('[data-testid="cad-header"] a')
  await expect(returnLink).toBeVisible()
  await expect(returnLink).toHaveAttribute('href', '/en/models')
  await returnLink.click()
  await expect(page).toHaveURL('/en/models')
})
