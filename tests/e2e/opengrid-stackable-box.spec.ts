import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

const HONEYCOMB_RENDER_WARNING =
  '省料模式會明顯降低模型渲染速度；物件太大時可能導致建模失敗。建議先使用一般模式確認形狀，下載前再啟用省料模式。'

test('Desk System starts the stackable-box with its thin-shell preset', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box?system=desk')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await waitForCadReady(page)

  await expect(page.getByTestId('cad-system-context')).toHaveText(
    '目前系統：Desk System',
  )
  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('4')
  await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue('2')
  await expect(
    page.getByRole('textbox', { name: '盒內淨高（Z）' }),
  ).toHaveValue('30')
  await expect(page.getByRole('radio', { name: '薄殼模式' })).toBeChecked()
  await expect(page.getByRole('radio', { name: '堆疊模式' })).not.toBeChecked()
  await expect(page.getByRole('radio', { name: '底版模式' })).toHaveCount(0)
})

test('OpenGrid stackable-box is listed and exposes the half-cell controls', async ({
  page,
}) => {
  await page.goto('/zh-Hant/models')
  const modelLink = page
    .getByRole('heading', { name: 'Grid Box (方盒)', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 Grid Box (方盒)', exact: true })
  await expect(modelLink).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-stackable-box?system=desk',
  )
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')

  await expect(page).toHaveURL('/zh-Hant/cad/opengrid-stackable-box')
  await expect(
    page.getByRole('heading', { name: '目前編輯：Grid Box (方盒)' }),
  ).toBeVisible()
  await expect(
    page.getByText(/盒內淨高文字輸入為 10–500 mm、slider 為 10–200 mm/),
  ).toHaveCount(0)
  const modeGroup = page.getByRole('radiogroup', { name: '盒體模式' })
  await expect(modeGroup.getByRole('radio')).toHaveCount(2)
  const modeLabels = await modeGroup
    .getByRole('radio')
    .evaluateAll((radios) =>
      radios.map((radio) => radio.getAttribute('aria-label')),
    )
  expect(modeLabels).toEqual(['薄殼模式', '堆疊模式'])
  const x = page.getByRole('slider', { name: 'X' })
  const y = page.getByRole('slider', { name: 'Y' })
  const height = page.getByRole('textbox', { name: '盒內淨高（Z）' })
  const heightSlider = page.getByRole('slider', { name: '盒內淨高（Z）' })
  await expect(height).toHaveValue('20')
  await expect(x).toHaveAttribute('min', '0.5')
  await expect(x).toHaveAttribute('max', '10')
  await expect(x).toHaveAttribute('step', '0.5')
  await expect(y).toHaveAttribute('min', '0.5')
  await expect(y).toHaveAttribute('max', '10')
  await expect(y).toHaveAttribute('step', '0.5')
  await expect(height).toHaveAttribute('min', '10')
  await expect(height).toHaveAttribute('max', '500')
  await expect(heightSlider).toHaveAttribute('min', '10')
  await expect(heightSlider).toHaveAttribute('max', '200')
  const seatMode = page.getByTestId('opengrid-stackable-box-seat-mode')
  await expect(seatMode).toBeVisible()
  await expect(seatMode.getByRole('radio')).toHaveCount(3)
  const seatModeLabels = await seatMode
    .getByRole('radio')
    .evaluateAll((radios) =>
      radios.map((radio) => radio.getAttribute('aria-label')),
    )
  expect(seatModeLabels).toEqual(['無角座', '鎖定角座', '內建角座'])
  const detachableCornerSeatMode = seatMode.getByRole('radio', {
    name: '鎖定角座',
  })
  await expect(detachableCornerSeatMode).toBeChecked()
  const fullGrid = page.getByRole('checkbox', { name: '底部全孔模式' })
  await expect(fullGrid).toBeVisible()
  await expect(fullGrid).not.toBeChecked()
  const defaultMode = page.getByRole('radio', { name: '堆疊模式' })
  await expect(defaultMode).toBeVisible()
  await expect(defaultMode).toBeChecked()
  const thinShell = page.getByRole('radio', { name: '薄殼模式' })
  await expect(thinShell).toBeVisible()
  await expect(thinShell).not.toBeChecked()
  await expect(page.getByText(/預設模式：可堆疊滑動/)).toBeVisible()
  await thinShell.check()
  await expect(thinShell).toBeChecked()
  await expect(defaultMode).not.toBeChecked()
  await expect(page.getByText(/薄殼模式：不可堆疊/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('radio', { name: '薄殼模式' })).toBeChecked()
  await defaultMode.check()
  await expect(defaultMode).toBeChecked()
  await expect(page.getByText(/預設模式：可堆疊滑動/)).toBeVisible()
  await expect(page.getByText(/薄殼模式：不可堆疊/)).toHaveCount(0)
  await seatMode.getByRole('radio', { name: '無角座' }).check()
  await expect(seatMode.getByRole('radio', { name: '無角座' })).toBeChecked()
  await fullGrid.check()
  await expect(fullGrid).toBeChecked()
  await expect(page.getByText(/增加 14 mm 中心距/)).toHaveCount(0)

  const targetX = page.getByRole('textbox', { name: 'X（mm）' })
  const targetY = page.getByRole('textbox', { name: 'Y（mm）' })
  await targetX.fill('41.85')
  await targetY.fill('27.85')
  await page.getByRole('button', { name: '計算格數' }).click()
  await expect(x).toHaveValue('1.5')
  await expect(y).toHaveValue('1')
})

test('OpenGrid stackable-box expands only opening groups with non-default values', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')

  const disclosure = page.getByTestId(
    'opengrid-stackable-box-opening-disclosure',
  )
  const openingGroups = ['-Y', '+Y', '-X', '+X'] as const

  await expect(disclosure).not.toHaveAttribute('open', '')
  for (const direction of openingGroups) {
    await expect(
      page.getByTestId(`opengrid-stackable-box-opening-group-${direction}`),
    ).not.toHaveAttribute('open', '')
  }

  await disclosure.locator(':scope > summary').click()
  await expect(disclosure).toHaveAttribute('open', '')

  const frontGroup = page.getByTestId('opengrid-stackable-box-opening-group--Y')
  const frontDepth = frontGroup.getByRole('textbox', {
    name: '下切深度（前方）',
  })
  await frontGroup.locator(':scope > summary').click()
  await frontDepth.fill('4')
  await expect(frontDepth).toHaveValue('4')

  const rearGroup = page.getByTestId('opengrid-stackable-box-opening-group-+Y')
  const rearDepth = rearGroup.getByRole('textbox', {
    name: '下切深度（後方）',
  })
  await rearGroup.locator(':scope > summary').click()
  await rearDepth.fill('4')
  await expect(rearDepth).toHaveValue('4')
  await waitForCadReady(page)

  await page.goto('/zh-Hant/cad/opengrid-stackable-box')
  await waitForCadReady(page)
  await expect(disclosure).toHaveAttribute('open', '')
  await expect(frontGroup).toHaveAttribute('open', '')
  await expect(rearGroup).toHaveAttribute('open', '')
  for (const direction of openingGroups.filter(
    (direction) => direction !== '-Y' && direction !== '+Y',
  )) {
    await expect(
      page.getByTestId(`opengrid-stackable-box-opening-group-${direction}`),
    ).not.toHaveAttribute('open', '')
  }

  await frontGroup.getByRole('button', { name: '復原下切深度（前方）' }).click()
  await expect(frontGroup).not.toHaveAttribute('open', '')
  await expect(rearGroup).toHaveAttribute('open', '')
  await expect(disclosure).toHaveAttribute('open', '')

  await rearGroup.getByRole('button', { name: '復原下切深度（後方）' }).click()
  await expect(rearGroup).not.toHaveAttribute('open', '')
  await expect(disclosure).not.toHaveAttribute('open', '')
})

test('OpenGrid stackable-box keeps half-cell dimensions in export metadata', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')
  await waitForCadReady(page)

  const x = page.getByRole('slider', { name: 'X' })
  const y = page.getByRole('slider', { name: 'Y' })
  const height = page.getByRole('textbox', { name: '盒內淨高（Z）' })
  await x.press('ArrowLeft')
  await y.press('ArrowLeft')
  await height.fill('20')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-box-1.5x1.5-h20-seats-detachable-corner-seat.step',
  )

  await page.getByRole('radio', { name: '薄殼模式' }).check()
  await waitForCadReady(page)
  const thinDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const thinDownload = await thinDownloadPromise
  expect(thinDownload.suggestedFilename()).toBe(
    'opengrid-stackable-box-1.5x1.5-h20-seats-detachable-corner-seat-thin-shell.step',
  )
})

test('OpenGrid stackable-box exports the integrated seat mode', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')
  await waitForCadReady(page)

  await page.getByRole('radio', { name: '內建角座' }).check()
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-box-2x2-h20-seats-integrated.step',
  )
})

test('OpenGrid stackable-box persists the honeycomb saving switch and filename', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')
  await waitForCadReady(page)

  const honeycomb = page.getByRole('checkbox', {
    name: '省料模式（六角鏤空）',
    exact: true,
  })
  const honeycombWarning = page.getByTestId('honeycomb-render-warning')
  const honeycombBetaBadge = page
    .locator('label')
    .filter({ has: honeycomb })
    .getByText('Beta', { exact: true })
  await expect(honeycomb).toBeVisible()
  await expect(honeycombBetaBadge).toBeVisible()
  await expect(honeycomb).not.toBeChecked()
  await expect(honeycombWarning).toHaveCount(0)
  await expect(page.getByRole('radio', { name: '堆疊模式' })).toBeChecked()
  await honeycomb.check()
  await waitForCadReady(page, 90_000)
  await expect(honeycomb).toBeChecked()
  await expect(honeycombWarning).toHaveText(HONEYCOMB_RENDER_WARNING)

  await page.reload()
  await waitForCadReady(page, 90_000)
  await expect(
    page.getByRole('checkbox', {
      name: '省料模式（六角鏤空）',
      exact: true,
    }),
  ).toBeChecked()
  await expect(page.getByRole('radio', { name: '堆疊模式' })).toBeChecked()
  await expect(honeycombWarning).toHaveText(HONEYCOMB_RENDER_WARNING)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-box-2x2-h20-seats-detachable-corner-seat-honeycomb.step',
  )
  await honeycomb.uncheck()
  await expect(honeycombWarning).toHaveCount(0)
  await expect(honeycombBetaBadge).toBeVisible()
})

test('OpenGrid stackable-box estimates the honeycomb cut cell count', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')
  await waitForCadReady(page)

  const honeycomb = page.getByRole('checkbox', {
    name: '省料模式（六角鏤空）',
    exact: true,
  })
  const estimate = page.getByTestId('honeycomb-cell-count-estimate')
  const x = page.getByRole('slider', { name: 'X' })

  await expect(estimate).toHaveCount(0)
  await honeycomb.check()
  await expect(estimate).toBeVisible()
  await expect(estimate).toContainText(/預計切除 \d+ 格/)
  const initialEstimate = await estimate.innerText()

  await x.fill('3')
  await expect(estimate).toContainText(/預計切除 \d+ 格/)
  await expect(estimate).not.toHaveText(initialEstimate)

  await honeycomb.uncheck()
  await expect(estimate).toHaveCount(0)
})
