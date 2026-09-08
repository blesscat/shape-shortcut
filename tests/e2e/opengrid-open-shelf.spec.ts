import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

const HONEYCOMB_RENDER_WARNING =
  '省料模式會明顯降低模型渲染速度；物件太大時可能導致建模失敗。建議先使用一般模式確認形狀，下載前再啟用省料模式。'

test('OpenGrid Open Shelf exposes its Desk controls and front-opening workspace', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-open-shelf?system=desk')

  await expect(
    page.getByRole('heading', {
      name: '目前編輯：OpenGrid Open Shelf (斜開格櫃)',
    }),
  ).toBeVisible()
  await expect(page.getByTestId('cad-system-context')).toHaveText(
    '目前系統：Desk System',
  )
  await expect(page.getByTestId('opengrid-open-shelf-help')).toContainText(
    '整體高度包含所有板厚',
  )
  await expect(
    page.getByTestId('opengrid-open-shelf-cell-space'),
  ).toContainText('每格淨空（平行格層）')
  await expect(
    page.getByTestId('opengrid-open-shelf-cell-space'),
  ).toContainText('底部斜角區（不計入 Z 格數）')
  await expect(
    page.getByTestId('opengrid-open-shelf-honeycomb-mode'),
  ).not.toBeChecked()
  const honeycomb = page.getByTestId('opengrid-open-shelf-honeycomb-mode')
  const honeycombWarning = page.getByTestId('honeycomb-render-warning')
  await expect(honeycombWarning).toHaveCount(0)
  await honeycomb.check()
  await expect(honeycombWarning).toHaveText(HONEYCOMB_RENDER_WARNING)
  await waitForCadReady(page, 90_000)
  await page.reload()
  await waitForCadReady(page, 90_000)
  await expect(honeycomb).toBeChecked()
  await expect(honeycombWarning).toHaveText(HONEYCOMB_RENDER_WARNING)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-open-shelf-4x3-h50-cx1-cz2-a15-honeycomb.stl',
  )
  await honeycomb.uncheck()
  await expect(honeycombWarning).toHaveCount(0)
  const sliders = page.getByRole('slider')
  await expect(sliders).toHaveCount(6)
  for (const [index, label] of [
    'X',
    'Y',
    '整體高度（Z）',
    'X',
    'Z',
    '前方開口仰角（Y/Z）',
  ].entries()) {
    await expect(sliders.nth(index)).toHaveAttribute('aria-label', label)
  }

  await waitForCadReady(page)
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()
})

test('OpenGrid Open Shelf localizes the honeycomb render warning', async ({
  page,
}) => {
  await page.goto('/en/cad/opengrid-open-shelf')

  const honeycomb = page.getByTestId('opengrid-open-shelf-honeycomb-mode')
  const honeycombWarning = page.getByTestId('honeycomb-render-warning')
  await expect(honeycomb).toBeVisible()
  await expect(honeycomb).not.toBeChecked()
  await honeycomb.check()
  await expect(honeycombWarning).toHaveText(
    'Material-saving mode can significantly slow model rendering; very large objects may fail to build. Check the shape in normal mode first, then enable material-saving mode before downloading.',
  )
})
