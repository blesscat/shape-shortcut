import { expect, test } from '@playwright/test'
import { waitForCadReady, skipHeadlessFirefoxWithoutWebGL } from './helpers'

test('tissue box exposes XYZ, persists input, guards invalid slots and exports', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/models')
  await expect(
    page.locator('[data-entry-key="opengrid-openconnect-tissue-box-wall"]'),
  ).toHaveCount(1)
  await expect(
    page.locator('[data-entry-key="opengrid-openconnect-tissue-box-desk"]'),
  ).toHaveCount(0)
  await page.goto('/zh-Hant/cad/opengrid-openconnect-tissue-box?system=wall')
  await waitForCadReady(page, 90000)
  await expect(page.getByTestId('tissue-box-help')).toContainText('X 沿牆左右')
  const x = page.getByRole('textbox', { name: '內尺寸（X）', exact: true })
  await x.fill('230')
  await waitForCadReady(page, 90000)
  await page.reload()
  await waitForCadReady(page, 90000)
  await expect(x).toHaveValue('230')
  const slot = page.getByRole('textbox', {
    name: '抽取槽長度（X）',
    exact: true,
  })
  await slot.fill('500')
  await expect(slot).toHaveAttribute('aria-invalid', 'true')
  await expect(
    page.getByRole('button', { name: '下載 STEP', exact: true }),
  ).toBeDisabled()
  await slot.fill('160')
  await waitForCadReady(page, 90000)
  for (const format of ['STEP', 'STL']) {
    const download = page.waitForEvent('download')
    await page
      .getByRole('button', { name: `下載 ${format}`, exact: true })
      .click()
    expect((await download).suggestedFilename()).toContain(
      'opengrid-openconnect-tissue-box-x-230',
    )
  }
  // Use a smaller holder to exercise saving without an expensive default lattice.
  await slot.fill('45')
  await page
    .getByRole('textbox', { name: '抽取槽寬度（Y）', exact: true })
    .fill('15')
  await x.fill('70')
  await page
    .getByRole('textbox', { name: '內尺寸（Y）', exact: true })
    .fill('50')
  await page
    .getByRole('textbox', { name: '內尺寸（Z）', exact: true })
    .fill('35')
  await waitForCadReady(page, 90000)
  const saving = page.getByRole('checkbox', { name: /省料模式/ })
  await saving.check()
  await expect(page.getByText(/省料模式會明顯降低模型渲染速度/)).toBeVisible()
  await waitForCadReady(page, 90000)
  await page.reload()
  await waitForCadReady(page, 90000)
  await expect(saving).toBeChecked()
  await saving.uncheck()
  await waitForCadReady(page, 90000)
})
