import { expect, test } from '@playwright/test'

// These tests run against the production build (see playwright.prod.config.ts).
// The dev-server suite keeps exercising the STEP download action itself.

test('production build hides the STEP download action on interactive generators', async ({
  page,
}) => {
  await page.goto('/cad/opengrid-divider')
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled({
    timeout: 90_000,
  })
  await expect(page.getByRole('button', { name: '下載 STEP' })).toHaveCount(0)
})

test('production build keeps the Wall Cover 3MF action without STEP', async ({
  page,
}) => {
  await page.goto('/cad/opengrid-wall-cover?system=wall')
  const threeMfButton = page.getByRole('button', { name: '下載 3MF' })
  await expect(threeMfButton).toBeEnabled({ timeout: 90_000 })
  await expect(page.getByRole('button', { name: '下載 STEP' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '下載 STL' })).toHaveCount(0)
})

test('production build still loads the fixed Half preview without a STEP action', async ({
  page,
}) => {
  await page.goto('/cad/opengrid-snap')
  await expect(page.getByTestId('opengrid-snap-panel')).toBeVisible()
  const halfPreviewRequest = page.waitForRequest(
    (request) => request.url().endsWith('/downloads/snap-half.step'),
    { timeout: 90_000 },
  )
  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 格型' })
    .selectOption('half')
  await halfPreviewRequest
  await expect(page.getByText('增量無效', { exact: true })).toBeVisible()
  await expect(page.getByText('定位孔無效', { exact: true })).toBeVisible()
  await expect(page.getByText('移除孔無效', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('slider', { name: '外框總增量（X/Y）' }),
  ).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: '定位孔' })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: '移除孔' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STEP' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled({
    timeout: 90_000,
  })
})

test('production build hides the STEP action on the Snap remover', async ({
  page,
}) => {
  await page.goto('/cad/opengrid-snap-remover')
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled({
    timeout: 90_000,
  })
  await expect(page.getByRole('button', { name: '下載 STEP' })).toHaveCount(0)
})
