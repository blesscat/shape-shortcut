import { expect, test } from '@playwright/test'
import { waitForCadReady, skipHeadlessFirefoxWithoutWebGL } from './helpers'

for (const model of ['shelf', 'organizer', 'tissue-box']) {
  test(`${model} groups rear-grid choices in a collapsed accessible section`, async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    const defaultVertical = model === 'tissue-box' ? 'bottom' : 'top'
    const editedVertical = model === 'tissue-box' ? 'top' : 'bottom'
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto(`/zh-Hant/cad/opengrid-openconnect-${model}?system=wall`)
    await waitForCadReady(page, 90_000)
    const section = page.getByTestId('openconnect-settings')
    const header = section.locator('summary')
    const horizontal = section.getByRole('combobox', { name: '水平對齊' })
    const vertical = section.getByRole('combobox', { name: '垂直對齊' })
    await expect(section).not.toHaveAttribute('open', '')
    await expect(horizontal).not.toBeVisible()
    await header.focus()
    await page.keyboard.press('Enter')
    await expect(horizontal).toBeVisible()
    await expect(horizontal).toHaveValue('center')
    await expect(vertical).toHaveValue(defaultVertical)
    await expect(horizontal.locator('option')).toHaveText([
      '靠左',
      '置中',
      '靠右',
    ])
    await expect(vertical.locator('option')).toHaveText([
      '靠上',
      '置中',
      '靠下',
    ])
    await expect(horizontal).toBeEnabled()
    await expect(vertical).toBeEnabled()
    const viewport = page.getByTestId('cad-viewport')
    const revision = await viewport.getAttribute('data-model-revision')
    await horizontal.selectOption('right')
    await vertical.selectOption(editedVertical)
    await expect(viewport).not.toHaveAttribute(
      'data-model-revision',
      revision ?? '',
      { timeout: 90_000 },
    )
    await waitForCadReady(page, 90_000)
    await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
    await header.click()
    await expect(horizontal).not.toBeVisible()
    await page.reload()
    await waitForCadReady(page, 90_000)
    await expect(horizontal).not.toBeVisible()
    await header.click()
    await expect(horizontal).toHaveValue('right')
    await expect(vertical).toHaveValue(editedVertical)
    await page
      .getByRole('button', { name: '復原水平對齊', exact: true })
      .click()
    await page
      .getByRole('button', { name: '復原垂直對齊', exact: true })
      .click()
    await expect(horizontal).toHaveValue('center')
    await expect(vertical).toHaveValue(defaultVertical)
    await horizontal.selectOption('left')
    await vertical.selectOption('center')
    await page
      .getByRole('button', { name: '全部恢復預設', exact: true })
      .click()
    await expect(horizontal).not.toBeVisible()
    await header.click()
    await expect(horizontal).toHaveValue('center')
    await expect(vertical).toHaveValue(defaultVertical)
    await waitForCadReady(page, 90_000)
  })
}
