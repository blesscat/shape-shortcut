import { expect, test, type Locator, type Page } from '@playwright/test'

type ControlBox = {
  left: number
  right: number
  width: number
}

async function readControlBox(locator: Locator): Promise<ControlBox> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: rect.right, width: rect.width }
  })
}

async function readTextBox(locator: Locator): Promise<ControlBox> {
  return locator.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const rect = range.getBoundingClientRect()
    return { left: rect.left, right: rect.right, width: rect.width }
  })
}

function expectControlBoxToStayStable(
  before: ControlBox,
  after: ControlBox,
): void {
  expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1)
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBeTruthy()
}

async function openParameterDrawer(page: Page): Promise<void> {
  await page.getByTestId('cad-params-pill').click()
  await expect(page.getByTestId('cad-params-drawer')).toBeVisible()
}

test('restore actions keep narrow controls stable and usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/cad/opengrid')
  await openParameterDrawer(page)

  const variant = page.getByRole('combobox', { name: 'OpenGrid 板型' })
  const variantBefore = await readControlBox(variant)
  await variant.selectOption('Full')
  const restoreVariant = page.getByRole('button', {
    name: '復原OpenGrid 板型',
  })
  await expect(restoreVariant).toBeVisible()
  await expect(restoreVariant).toBeEnabled()
  expectControlBoxToStayStable(variantBefore, await readControlBox(variant))
  await expectNoHorizontalOverflow(page)
  await restoreVariant.click()
  await expect(variant).toHaveValue('Lite')
  expectControlBoxToStayStable(variantBefore, await readControlBox(variant))

  const rows = page.getByRole('slider', { name: 'Y' })
  const rowsBefore = await readControlBox(rows)
  await rows.press('ArrowRight')
  const restoreRows = page.getByRole('button', {
    name: '復原Y',
  })
  await expect(restoreRows).toBeVisible()
  await expect(restoreRows).toBeEnabled()
  const rowsUnit = page.getByText('3 格', { exact: true })
  await expect(rowsUnit).toBeVisible()
  expect((await readTextBox(rowsUnit)).right).toBeLessThanOrEqual(
    (await readControlBox(restoreRows)).left,
  )
  expectControlBoxToStayStable(rowsBefore, await readControlBox(rows))
  await expectNoHorizontalOverflow(page)
  await restoreRows.click()
  await expect(rows).toHaveValue('2')
  expectControlBoxToStayStable(rowsBefore, await readControlBox(rows))

  const targetX = page
    .getByTestId('grid-dimension-calculator')
    .getByRole('textbox', { name: '目標 X（mm）' })
  const targetXBefore = await readControlBox(targetX)
  await targetX.fill('56')
  await expect(page.getByRole('button', { name: '復原X' })).toHaveCount(0)
  expectControlBoxToStayStable(targetXBefore, await readControlBox(targetX))
  await expectNoHorizontalOverflow(page)
  expectControlBoxToStayStable(targetXBefore, await readControlBox(targetX))

  await page.goto('/cad/hexagonal-column')
  await openParameterDrawer(page)
  const orientation = page.getByRole('combobox', { name: '擺放方向' })
  const orientationBefore = await readControlBox(orientation)
  await orientation.selectOption('standing')
  const restoreOrientation = page.getByRole('button', {
    name: '復原擺放方向',
  })
  await expect(restoreOrientation).toBeVisible()
  await expect(restoreOrientation).toBeEnabled()
  expectControlBoxToStayStable(
    orientationBefore,
    await readControlBox(orientation),
  )
  await expectNoHorizontalOverflow(page)
  await restoreOrientation.click()
  await expect(orientation).toHaveValue('lying')
  expectControlBoxToStayStable(
    orientationBefore,
    await readControlBox(orientation),
  )
})
