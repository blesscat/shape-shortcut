import { expect, test, type Page } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

const HONEYCOMB_RENDER_WARNING =
  '省料模式會明顯降低模型渲染速度。建議先使用一般模式確認形狀，下載前再啟用省料模式。'

const sideOpeningGroups = [
  { direction: '-Y', label: '前方' },
  { direction: '+Y', label: '後方' },
  { direction: '-X', label: '左方' },
  { direction: '+X', label: '右方' },
] as const

async function openCylinderSideOpenings(page: Page) {
  const disclosure = page.getByTestId('opengrid-cylinder-opening-disclosure')
  const summary = disclosure.locator(':scope > summary')
  await expect(summary).toHaveText('四個方向開口設定')
  if ((await disclosure.getAttribute('open')) === null) {
    await summary.click()
  }
  await expect(disclosure).toHaveAttribute('open', '')
}

async function openCylinderSideOpeningGroup(
  page: Page,
  direction: (typeof sideOpeningGroups)[number]['direction'],
) {
  const group = page.getByTestId(`opengrid-cylinder-opening-group-${direction}`)
  if ((await group.getAttribute('open')) === null) {
    await group.locator(':scope > summary').click()
  }
  await expect(group).toHaveAttribute('open', '')
}

test('Desk System starts the stackable-cylinder with its thin-shell preset', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder?system=desk')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await waitForCadReady(page)

  await expect(page.getByTestId('cad-system-context')).toHaveText(
    '目前系統：Desk System',
  )
  await expect(page.getByRole('slider', { name: '外徑（D）' })).toHaveValue(
    '60',
  )
  await expect(page.getByRole('textbox', { name: '高度（Z）' })).toHaveValue(
    '30',
  )
  await expect(page.getByRole('radio', { name: '薄殼模式' })).toBeChecked()
  await expect(page.getByRole('radio', { name: '堆疊模式' })).not.toBeChecked()
  await expect(page.getByRole('radio', { name: '底版模式' })).toHaveCount(0)
})

test('OpenGrid stackable-cylinder is listed and exposes 1 mm controls', async ({
  page,
}) => {
  await page.goto('/zh-Hant/models')
  const modelLink = page
    .getByRole('heading', { name: 'Round Box (圓盒)', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 Round Box (圓盒)', exact: true })
  await expect(modelLink).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-stackable-cylinder?system=desk',
  )
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder')

  await expect(page).toHaveURL('/zh-Hant/cad/opengrid-stackable-cylinder')
  await expect(
    page.getByRole('heading', { name: '目前編輯：Round Box (圓盒)' }),
  ).toBeVisible()
  await expect(
    page.locator('p').filter({ hasText: '這是開口圓柱容器' }),
  ).toHaveCount(0)
  const modeOptions = page.getByTestId('opengrid-cylinder-mode-options')
  await expect(modeOptions.getByRole('radio')).toHaveCount(2)
  const modeLabels = await modeOptions
    .getByRole('radio')
    .evaluateAll((radios) =>
      radios.map((radio) => radio.getAttribute('aria-label')),
    )
  expect(modeLabels).toEqual(['薄殼模式', '堆疊模式'])
  const seatMode = page.getByTestId('opengrid-stackable-cylinder-seat-mode')
  await expect(seatMode.getByRole('radio')).toHaveCount(4)
  const seatModeLabels = await seatMode
    .getByRole('radio')
    .evaluateAll((radios) =>
      radios.map((radio) => radio.getAttribute('aria-label')),
    )
  expect(seatModeLabels).toEqual(['無角座', '角座孔', '內建角座', '中心卡勾'])
  await expect(
    modeOptions.locator(
      'xpath=following-sibling::p[@data-testid="opengrid-cylinder-mode-description"]',
    ),
  ).toHaveText('預設模式：可堆疊滑動，使用 9mm 定位柱')
  await expect(
    page.getByText(/高度文字輸入為 10–500 mm、slider 為 10–200 mm/),
  ).toHaveCount(0)
  await expect(page.getByRole('radio', { name: '堆疊模式' })).toBeChecked()
  await expect(page.getByRole('radio', { name: '薄殼模式' })).not.toBeChecked()
  await expect(page.locator('p').filter({ hasText: '目前模式：' })).toHaveCount(
    0,
  )
  await expect(page.locator('p').filter({ hasText: '底部孔洞：' })).toHaveCount(
    0,
  )
  await expect(seatMode.getByRole('radio', { name: '角座孔' })).toBeChecked()
  await seatMode.getByRole('radio', { name: '中心卡勾' }).check()
  await expect(seatMode).toContainText('Snap')
  await seatMode.getByRole('radio', { name: '角座孔' }).check()
  const openingDisclosure = page.getByTestId(
    'opengrid-cylinder-opening-disclosure',
  )
  await expect(openingDisclosure).toBeVisible()
  await expect(openingDisclosure).not.toHaveAttribute('open', '')
  await openCylinderSideOpenings(page)

  const diameter = page.getByRole('slider', { name: '外徑（D）' })
  const height = page.getByRole('slider', { name: '高度（Z）' })
  const heightInput = page.getByRole('textbox', { name: '高度（Z）' })
  await expect(diameter).toHaveValue('60')
  await expect(heightInput).toHaveValue('20')
  await expect(diameter).toHaveAttribute('min', '20')
  await expect(diameter).toHaveAttribute('max', '300')
  await expect(diameter).toHaveAttribute('step', '1')
  await expect(height).toHaveAttribute('min', '10')
  await expect(height).toHaveAttribute('max', '200')
  await expect(height).toHaveAttribute('step', '1')
  await expect(heightInput).toHaveAttribute('min', '10')
  await expect(heightInput).toHaveAttribute('max', '500')
  for (const [index, { direction, label }] of sideOpeningGroups.entries()) {
    const group = page.getByTestId(
      `opengrid-cylinder-opening-group-${direction}`,
    )
    await expect(group).toBeVisible()
    await expect(group.locator('summary')).toHaveText(label)
    if (index === 0) {
      await expect(group).toHaveAttribute('open', '')
    } else {
      await expect(group).not.toHaveAttribute('open', '')
    }
  }
  for (const { direction, label } of sideOpeningGroups) {
    await openCylinderSideOpeningGroup(page, direction)
    const group = page.getByTestId(
      `opengrid-cylinder-opening-group-${direction}`,
    )
    await expect(group.getByRole('slider')).toHaveCount(3)
    await expect(
      group.getByRole('textbox', { name: `切口底部長度（${label}）` }),
    ).toHaveValue('1')
    await expect(
      group.getByRole('slider', { name: `下切深度（${label}）` }),
    ).toHaveAttribute('max', '15')
    await expect(
      group.getByRole('slider', { name: `側壁角度（${label}）` }),
    ).toHaveAttribute('min', '1')
    await expect(
      group.getByRole('slider', { name: `側壁角度（${label}）` }),
    ).toHaveAttribute('max', '90')
    await expect(
      group.getByRole('slider', { name: `側壁角度（${label}）` }),
    ).toHaveAttribute('step', '1')
    await expect(
      group.getByRole('slider', { name: `側壁角度（${label}）` }),
    ).toHaveAttribute('dir', 'rtl')
  }
  const rightDepth = page.getByRole('textbox', { name: '下切深度（右方）' })
  const rightBottomLength = page.getByRole('slider', {
    name: '切口底部長度（右方）',
  })
  await rightDepth.fill('12')
  await expect(rightBottomLength).toHaveAttribute('min', '1')
  await expect(rightBottomLength).toHaveAttribute('max', '49')
  await page.getByRole('textbox', { name: '切口底部長度（右方）' }).fill('1')
  await page.getByRole('textbox', { name: '高度（Z）' }).fill('20')
  for (const { direction, label } of sideOpeningGroups) {
    await expect(
      page
        .getByTestId(`opengrid-cylinder-opening-group-${direction}`)
        .getByRole('slider', { name: `下切深度（${label}）` }),
    ).toHaveAttribute('max', '15')
  }
  await page.getByRole('radio', { name: '薄殼模式' }).check()
  await page.getByRole('radio', { name: '堆疊模式' }).check()
  await page.getByRole('radio', { name: '薄殼模式' }).check()
  for (const { direction, label } of sideOpeningGroups) {
    await expect(
      page
        .getByTestId(`opengrid-cylinder-opening-group-${direction}`)
        .getByRole('slider', { name: `下切深度（${label}）` }),
    ).toHaveAttribute('max', '18')
  }
  await diameter.press('ArrowRight')
  await expect(diameter).toHaveValue('61')
})

test('OpenGrid stackable-cylinder keeps four opening groups independent and restorable', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder')
  await openCylinderSideOpenings(page)
  await openCylinderSideOpeningGroup(page, '+X')
  await openCylinderSideOpeningGroup(page, '-X')

  const rightDepth = page.getByRole('textbox', { name: '下切深度（右方）' })
  const rightLength = page.getByRole('textbox', {
    name: '切口底部長度（右方）',
  })
  const leftDepth = page.getByRole('textbox', { name: '下切深度（左方）' })
  const leftLength = page.getByRole('textbox', {
    name: '切口底部長度（左方）',
  })
  await rightDepth.fill('5')
  await expect(rightDepth).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#openingPlusXDepth-error')).toHaveText(
    '參數 輸入無效，請檢查參數後重試。',
  )
  await rightDepth.fill('8')
  await expect(rightDepth).toHaveAttribute('aria-invalid', 'false')
  await expect(
    page.getByRole('textbox', { name: '切口底部長度（右方）' }),
  ).toHaveAttribute('aria-invalid', 'false')
  await rightLength.fill('12')
  await page.getByRole('textbox', { name: '側壁角度（右方）' }).fill('70')
  await leftDepth.fill('9')
  await leftLength.fill('10')
  await waitForCadReady(page)
  await expect(rightDepth).toHaveValue('8')
  await expect(leftDepth).toHaveValue('9')

  await page.getByRole('button', { name: '復原下切深度（右方）' }).click()
  await expect(rightDepth).toHaveValue('0')
  await expect(leftDepth).toHaveValue('9')
  await waitForCadReady(page)

  await page.reload()
  await waitForCadReady(page)
  await openCylinderSideOpenings(page)
  await openCylinderSideOpeningGroup(page, '+X')
  await openCylinderSideOpeningGroup(page, '-X')
  await expect(leftDepth).toHaveValue('9')
  await expect(rightDepth).toHaveValue('0')
})

test('OpenGrid stackable-cylinder updates and exports deterministic metadata', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('slider', { name: '外徑（D）' }).press('ArrowRight')
  await page.getByRole('textbox', { name: '高度（Z）' }).fill('31')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d61-h31-seats-hole.step',
  )
})

test('OpenGrid stackable-cylinder exports the selected thin and no-seat state', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('radio', { name: '薄殼模式' }).check()
  await page.getByRole('radio', { name: '無角座' }).check()
  await expect(
    page.getByTestId('opengrid-cylinder-mode-description'),
  ).toHaveText('薄殼模式：不可堆疊，使用 6mm 定位柱')
  await expect(page.locator('p').filter({ hasText: '底部孔洞：' })).toHaveCount(
    0,
  )
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d60-h20-seats-none-thin.step',
  )
})

test('OpenGrid stackable-cylinder exports the integrated seat mode', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('radio', { name: '內建角座' }).check()
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d60-h20-seats-integrated.step',
  )
})

test('OpenGrid stackable-cylinder exports the center-hook seat mode', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('radio', { name: '中心卡勾' }).check()
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d60-h20-seats-center-hook.step',
  )
})

test('OpenGrid stackable-cylinder export identity includes enabled opening settings', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)
  await openCylinderSideOpenings(page)
  await openCylinderSideOpeningGroup(page, '+X')

  await page.getByRole('textbox', { name: '下切深度（右方）' }).fill('8')
  await page.getByRole('textbox', { name: '切口底部長度（右方）' }).fill('12')
  await page.getByRole('textbox', { name: '側壁角度（右方）' }).fill('70')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d60-h20-seats-hole-open-8-12-70_0-1-90_0-1-90_0-1-90.step',
  )
})

test('OpenGrid stackable-cylinder persists the honeycomb saving switch and filename', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  const honeycomb = page.getByRole('checkbox', {
    name: '省料模式（六角鏤空）',
    exact: true,
  })
  const honeycombWarning = page.getByTestId('honeycomb-render-warning')
  await expect(honeycomb).toBeVisible()
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
    'opengrid-stackable-cylinder-d60-h20-seats-hole-honeycomb.step',
  )
  await honeycomb.uncheck()
  await expect(honeycombWarning).toHaveCount(0)
})
