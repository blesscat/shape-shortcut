import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid Snap Remover previews and exports without parameter controls', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)

  // Pin the localized path: the card links are emitted with the active
  // locale, and the assertions below expect the zh-Hant wording.
  await page.goto('/zh-Hant/models')

  // The Snap Remover lives in the collapsed tools zone; expand the zones so
  // the card re-enters the accessibility tree.
  const toolsSections = page.getByTestId('model-zone-tools-desk')
  const toolsCount = await toolsSections.count()
  for (let index = 0; index < toolsCount; index += 1) {
    await toolsSections.nth(index).locator('summary').click()
  }

  const modelLink = page
    .getByRole('heading', { name: 'Snap Remover', exact: true })
    .locator('xpath=ancestor::article[1]')
    .getByRole('link', { name: '編輯 Snap Remover', exact: true })
  await expect(modelLink).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-snap-remover?system=desk',
  )
  await modelLink.click()
  await expect(page).toHaveURL('/zh-Hant/cad/opengrid-snap-remover?system=desk')
  await expect(
    page.getByRole('heading', {
      name: '目前編輯：OpenGrid Snap Remover',
      exact: true,
    }),
  ).toBeVisible()

  const panel = page.getByTestId('cad-workspace-panel')
  await expect(panel.getByRole('textbox')).toHaveCount(0)
  await expect(panel.getByRole('slider')).toHaveCount(0)
  await expect(panel.getByRole('combobox')).toHaveCount(0)
  await expect(panel.getByRole('button', { name: '全部恢復預設' })).toHaveCount(
    0,
  )

  await waitForCadReady(page)
  await expect(page.getByTestId('cad-viewport').locator('canvas')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('snap remover.step')
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  let byteLength = 0
  for await (const chunk of stream ?? []) byteLength += chunk.length
  expect(byteLength).toBeGreaterThan(0)
})
