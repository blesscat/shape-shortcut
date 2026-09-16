import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('CAD workspaces restore valid parameters independently per component', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/cad/box')
  await waitForCadReady(page)
  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()

  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)
  const rows = page.getByRole('slider', { name: 'Y' })
  const columns = page.getByRole('slider', { name: 'X' })
  await expect(rows).toHaveValue('1')
  await expect(columns).toHaveValue('1')
  await rows.press('ArrowRight')
  await columns.press('ArrowRight')
  await columns.press('ArrowRight')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('3')

  await page.goto('/cad/hsw-cell')
  await waitForCadReady(page)
  const hswRows = page.getByRole('slider', { name: 'Y' })
  const hswColumns = page.getByRole('slider', { name: 'X' })
  await expect(hswRows).toHaveValue('1')
  await expect(hswColumns).toHaveValue('1')
  await hswRows.press('ArrowRight')
  await hswRows.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(hswRows).toHaveValue('3')
  await expect(hswColumns).toHaveValue('4')

  await page.goto('/cad/opengrid-divider')
  await waitForCadReady(page)
  const dividerUp = page.getByRole('slider', { name: '上臂（Y）' })
  const dividerHeight = page.getByRole('textbox', {
    name: '分隔牆高度（Z）',
  })
  const dividerThickness = page.getByRole('textbox', {
    name: '上方牆厚（Z）',
  })
  await dividerUp.press('ArrowRight')
  await dividerHeight.fill('25')
  await dividerThickness.fill('3')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(dividerUp).toHaveValue('0.5')
  await expect(dividerHeight).toHaveValue('25')
  await expect(dividerThickness).toHaveValue('3')

  await page.goto('/cad/box')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
})

test('migrates legacy divider snapshots with alignment and peg defaults', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'shape-shortcut.component-parameters',
      JSON.stringify({
        version: 2,
        values: {
          desk: {
            'opengrid-divider': {
              left: 1,
              right: 1,
              up: 0,
              down: 0,
              height: 20,
            },
          },
        },
      }),
    )
  })
  await page.goto('/cad/opengrid-divider?system=desk')
  await waitForCadReady(page)

  await expect(page.getByRole('slider', { name: '左臂（X）' })).toHaveValue('1')
  await expect(
    page.getByTestId('opengrid-divider-alignment-free'),
  ).toBeChecked()
  await expect(
    page.getByTestId('opengrid-divider-peg-length-snap'),
  ).toBeChecked()
})
