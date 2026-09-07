import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('Wall Cover accepts up to eight characters and exports a two-color 3MF', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.addInitScript(() => {
    const captures: unknown[] = []
    ;(
      window as Window & { __cadModelGenerateCaptures?: unknown[] }
    ).__cadModelGenerateCaptures = captures
    const originalPostMessage = Worker.prototype.postMessage as (
      this: Worker,
      message: unknown,
      transfer?: Transferable[] | StructuredSerializeOptions,
    ) => void
    Worker.prototype.postMessage = function (message, transfer) {
      if (
        typeof message === 'object' &&
        message !== null &&
        'kind' in message &&
        message.kind === 'model.generate'
      ) {
        captures.push(message)
      }
      return originalPostMessage.call(this, message, transfer)
    }
  })

  await page.goto('/cad/opengrid-wall-cover?system=wall')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  const panel = page.getByTestId('opengrid-wall-cover-panel')
  const text = page.getByTestId('opengrid-wall-cover-text')
  const openConnect = page.getByTestId('opengrid-wall-cover-open-connect')
  await expect(panel).toBeVisible()
  await expect(text).toHaveValue('A')
  await expect(text).toHaveAttribute('maxlength', '8')
  await expect(openConnect).toBeVisible()
  await expect(openConnect).toBeChecked()
  await expect(openConnect).toHaveAccessibleName('移除孔')
  await expect(page.getByTestId('opengrid-wall-cover-text-count')).toHaveText(
    '1 / 8 字',
  )
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeVisible()
  await expect(page.getByRole('button', { name: '下載 STL' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '下載 3MF' })).toBeVisible()
  await expect(
    page.getByTestId('opengrid-wall-cover-three-mf-note'),
  ).toHaveText('雙色效果僅適用於 3MF。')
  await expect(panel.getByRole('slider')).toHaveCount(0)
  await expect(panel.getByRole('combobox')).toHaveCount(0)
  await expect(
    page.getByText('目前只支援中英文', { exact: true }),
  ).toBeVisible()

  await text.fill('123456789')
  await expect(text).toHaveValue('12345678')
  await expect(page.getByTestId('opengrid-wall-cover-text-count')).toHaveText(
    '8 / 8 字',
  )

  await text.fill(' IAN ')
  await expect(text).toHaveValue(' IAN ')
  await expect(page.getByTestId('opengrid-wall-cover-text-count')).toHaveText(
    '3 / 8 字',
  )
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (
            window as Window & { __cadModelGenerateCaptures?: unknown[] }
          ).__cadModelGenerateCaptures?.at(-1) ?? null,
      ),
    )
    .toMatchObject({
      modelId: 'opengrid-wall-cover',
      parameters: { text: 'IAN', openConnect: true },
    })

  await waitForCadReady(page, 90_000)
  await openConnect.uncheck()
  await expect(openConnect).not.toBeChecked()
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (
            window as Window & { __cadModelGenerateCaptures?: unknown[] }
          ).__cadModelGenerateCaptures?.at(-1) ?? null,
      ),
    )
    .toMatchObject({
      modelId: 'opengrid-wall-cover',
      parameters: { text: 'IAN', openConnect: false },
    })

  await waitForCadReady(page, 90_000)
  const threeMfButton = page.getByRole('button', { name: '下載 3MF' })
  await expect(threeMfButton).toBeEnabled()
  const downloadPromise = page.waitForEvent('download')
  await threeMfButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('opengrid-wall-cover.3mf')
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  let byteLength = 0
  for await (const chunk of stream ?? []) byteLength += chunk.length
  expect(byteLength).toBeGreaterThan(0)

  await page.getByRole('button', { name: '全部恢復預設' }).click()
  await expect(text).toHaveValue('A')
  await expect(openConnect).toBeChecked()
  await expect(page.getByTestId('opengrid-wall-cover-text-count')).toHaveText(
    '1 / 8 字',
  )

  await text.fill('嗎')
  await waitForCadReady(page, 90_000)
  await expect(threeMfButton).toBeEnabled()

  await text.fill('\uE000')
  await expect(panel.getByText('輸入文字有字元無法由預設字體建立')).toBeVisible(
    { timeout: 90_000 },
  )
  await expect(threeMfButton).toBeDisabled()
})
