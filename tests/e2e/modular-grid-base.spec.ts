import { expect, test, type Page } from '@playwright/test'
import {
  readBinaryStlByteLength,
  readDimensionAnnotationBoxes,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

// While a valid input waits for the exact build, the viewport shows the
// simplified preview instead of annotations for the previous revision.
async function expectSimplifiedPreviewWhileBuilding(page: Page) {
  await expect(page.getByTestId('cad-viewport')).toHaveAttribute(
    'data-preview-kind',
    'simplified',
  )
  await expect(page.getByTestId('cad-simplified-status')).toContainText(
    '完整模型計算中',
  )
  await expect
    .poll(async () => (await readDimensionAnnotationBoxes(page)).length)
    .toBe(0)
}

test('CAD workspace switches to the modular grid component and exports a 2x2 base', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)

  await expect(page).toHaveURL('/zh-Hant/cad/modular-grid-base')
  await expect(
    page.getByRole('combobox', { name: 'CAD component' }),
  ).toHaveCount(0)
  const rows = page.getByRole('slider', { name: 'Y' })
  const columns = page.getByRole('slider', { name: 'X' })
  await expect(rows).toHaveAttribute('min', '1')
  await expect(rows).toHaveAttribute('max', '20')
  await expect(columns).toHaveAttribute('min', '1')
  await expect(columns).toHaveAttribute('max', '20')
  await expect(rows).toHaveValue('1')
  await expect(columns).toHaveValue('1')
  await rows.press('ArrowRight')
  await columns.press('ArrowRight')
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('2')

  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 40 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 40 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 5 mm')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('modular-grid-base-2x2.step')
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  let byteLength = 0
  for await (const chunk of stream ?? []) byteLength += chunk.length
  expect(byteLength).toBeGreaterThan(0)

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe('modular-grid-base-2x2.stl')
  expect(await readBinaryStlByteLength(stlDownload)).toBeGreaterThan(84)

  await page.getByRole('link', { name: '返回模型選擇' }).click()
  await expect(page).toHaveURL('/zh-Hant/models')
  await expect(
    page.getByRole('heading', { name: '挑一個你喜歡的，帶回家列印' }),
  ).toBeVisible()
})

test('modular grid slider drag shows the simplified preview until the new revision commits', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)

  const rows = page.getByRole('slider', { name: 'Y' })
  await rows.scrollIntoViewIfNeeded()
  expect(await readDimensionAnnotationBoxes(page)).not.toHaveLength(0)
  const sliderBox = await rows.boundingBox()
  expect(sliderBox).not.toBeNull()
  if (!sliderBox) return

  const y = sliderBox.y + sliderBox.height / 2
  await page.mouse.move(sliderBox.x + sliderBox.width * 0.18, y)
  await page.mouse.down()
  await page.mouse.move(sliderBox.x + sliderBox.width * 0.3, y, { steps: 3 })
  await page.waitForTimeout(100)

  await expectSimplifiedPreviewWhileBuilding(page)

  await page.mouse.up()
  const committedRows = Number(await rows.inputValue())
  await waitForCadReady(page)
  await expect(page.getByLabel(`深度 Y ${committedRows * 20} mm`)).toBeVisible()
})

test('keyboard slider input shows the simplified preview until the new revision commits', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)

  const rows = page.getByRole('slider', { name: 'Y' })
  await rows.scrollIntoViewIfNeeded()
  expect(await readDimensionAnnotationBoxes(page)).not.toHaveLength(0)
  await rows.press('ArrowRight')

  await expectSimplifiedPreviewWhileBuilding(page)

  await waitForCadReady(page)
  await expect(page.getByTestId('cad-viewport')).toHaveAttribute(
    'data-preview-kind',
    'committed',
  )
  await expect(page.getByLabel('深度 Y 40 mm')).toBeVisible()
})

test('modular grid reports cell progress for a larger generation', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)

  const rows = page.getByRole('slider', { name: 'Y' })
  const columns = page.getByRole('slider', { name: 'X' })
  await rows.scrollIntoViewIfNeeded()
  await columns.scrollIntoViewIfNeeded()
  const viewport = page.getByTestId('cad-viewport')
  const viewportRect = () =>
    viewport.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { height: rect.height, top: rect.top }
    })
  const readyViewport = await viewportRect()
  // The bar flips between cell and stage mode on every boolean-op event, so
  // cell mode is only briefly on screen; record every state instead of polling.
  await page.evaluate(() => {
    const states: { max: string | null; text: string | null }[] = []
    Object.assign(window, { progressStates: states })
    new MutationObserver(() => {
      const bar = document.querySelector(
        '[role="progressbar"][aria-label="建立 B-Rep"]',
      )
      if (!bar) return
      states.push({
        max: bar.getAttribute('aria-valuemax'),
        text: bar.getAttribute('aria-valuetext'),
      })
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-valuemax', 'aria-valuetext'],
      childList: true,
      subtree: true,
    })
  })
  for (let value = 1; value < 10; value += 1) {
    await rows.press('ArrowRight')
    await columns.press('ArrowRight')
  }

  const progress = page.getByRole('progressbar', { name: '建立 B-Rep' })
  await expect(progress).toBeVisible({ timeout: 30_000 })
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (
            window as unknown as {
              progressStates: { max: string | null; text: string | null }[]
            }
          ).progressStates.some(
            ({ max, text }) => max === '100' && /格/.test(text ?? ''),
          ),
        ),
      { timeout: 30_000 },
    )
    .toBe(true)
  expect(await viewportRect()).toEqual(readyViewport)
  await waitForCadReady(page)
})
