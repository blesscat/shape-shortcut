import { expect, test } from '@playwright/test'
import { COMPONENT_PARAMETER_STORAGE_KEY } from '../../src/features/cad/parameters'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenConnect organizer is Wall-only and starts from the canonical snapshot', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/zh-Hant/models')
  const wallCard = page.locator(
    '[data-entry-key="opengrid-openconnect-organizer-wall"]',
  )
  await expect(wallCard).toHaveCount(1)
  await expect(
    wallCard.getByRole('link', {
      name: '編輯 OpenConnect Organizer（壁掛收納方格）',
    }),
  ).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-openconnect-organizer?system=wall',
  )
  await expect(
    page.locator('[data-entry-key="opengrid-openconnect-organizer-desk"]'),
  ).toHaveCount(0)

  await page.goto('/zh-Hant/cad/opengrid-openconnect-organizer?system=wall')
  await waitForCadReady(page, 90_000)

  await expect(
    page.getByRole('heading', {
      name: '目前編輯：OpenGrid OpenConnect Organizer（壁掛收納方格）',
    }),
  ).toBeVisible()
  await expect(page.getByTestId('cad-system-context')).toHaveText(
    '目前系統：Wall Related',
  )
  await expect(
    page.getByTestId('opengrid-openconnect-organizer-help'),
  ).toContainText('不需要底座或轉接件')
  await expect(
    page.getByTestId('opengrid-openconnect-organizer-help'),
  ).toContainText('母座開口面與牆面平行')

  const counts = page.getByTestId('opengrid-openconnect-organizer-hole-counts')
  await expect(counts.getByRole('slider').nth(0)).toHaveValue('2')
  await expect(counts.getByRole('slider').nth(1)).toHaveValue('2')
  await expect(page.getByRole('radio', { name: '連動' })).toBeChecked()
  await expect(
    page.getByRole('textbox', { name: '孔外圍間距（X）' }),
  ).toHaveValue('1')
  await expect(
    page.getByRole('textbox', { name: '孔外圍間距（Y）' }),
  ).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: '孔形狀' })).toHaveValue(
    'circle',
  )
  await expect(page.getByRole('textbox', { name: /孔直徑/ })).toHaveValue('20')
  await expect(page.getByRole('textbox', { name: '孔深度（Z）' })).toHaveValue(
    '28',
  )
  await expect(
    page.getByRole('textbox', { name: '腔體底部厚度（Z）' }),
  ).toHaveValue('1')
  await expect(
    page.getByRole('textbox', { name: '孔洞至外緣厚度（X/Y）' }),
  ).toHaveValue('1')
  await expect(
    page.getByTestId('opengrid-openconnect-organizer-thickness-help'),
  ).toContainText('底厚設為 0 mm 時孔洞會貫穿底部')
  const tilt = page.getByRole('slider', { name: /開口前傾角/ })
  await expect(tilt).toHaveValue('15')
  await expect(tilt).toHaveAttribute('step', '1')
  await expect(page.getByText(/收納孔開口上方會朝使用者移動/)).toBeVisible()
  await expect(
    page.getByTestId('opengrid-openconnect-organizer-interface-summary'),
  ).toContainText('1 欄 × 1 列 OpenConnect 母座')
  await expect(page.getByTestId('cad-attribution')).toContainText(
    'OpenConnect project',
  )
})

test('the default circular matrix stays exportable with an open bottom', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-openconnect-organizer?system=wall')
  await waitForCadReady(page, 90_000)

  const viewport = page.getByTestId('cad-viewport')
  const initialRevision = await viewport.getAttribute('data-model-revision')
  expect(initialRevision).toBeTruthy()

  await page.getByRole('textbox', { name: '腔體底部厚度（Z）' }).fill('0')
  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    initialRevision ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)

  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()
  await expect(
    page.getByRole('textbox', { name: '腔體底部厚度（Z）' }),
  ).toHaveValue('0')
})

test('OpenConnect organizer edits, persists, resets, and exports one committed revision', async ({
  page,
  browserName,
}) => {
  test.setTimeout(240_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-openconnect-organizer?system=wall')
  await waitForCadReady(page, 90_000)

  const viewport = page.getByTestId('cad-viewport')
  const initialRevision = await viewport.getAttribute('data-model-revision')
  expect(initialRevision).toBeTruthy()

  await page.getByRole('textbox', { name: '孔外圍間距（X）' }).fill('2.5')
  await page.getByRole('radio', { name: '分開' }).check()
  await expect(
    page.getByRole('textbox', { name: '孔外圍間距（Y）' }),
  ).toHaveValue('2.5')

  const shape = page.getByRole('combobox', { name: '孔形狀' })
  await expect(shape.locator('option')).toHaveCount(7)
  expect(
    await shape
      .locator('option')
      .evaluateAll((options) =>
        options.map((option) => option.getAttribute('value')),
      ),
  ).toEqual([
    'circle',
    'triangle',
    'square',
    'pentagon',
    'hexagon',
    'rectangle',
    'ellipse',
  ])
  for (const value of ['triangle', 'square', 'pentagon', 'hexagon'] as const) {
    await shape.selectOption(value)
    await expect(shape).toHaveValue(value)
  }
  await page.getByRole('textbox', { name: '腔體底部厚度（Z）' }).fill('0')
  await page.getByRole('textbox', { name: '孔洞至外緣厚度（X/Y）' }).fill('4')
  await page.getByRole('slider', { name: /開口前傾角/ }).fill('30')

  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    initialRevision ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()

  const persisted = await page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  }, COMPONENT_PARAMETER_STORAGE_KEY)
  expect(
    persisted?.values?.wall?.['opengrid-openconnect-organizer'],
  ).toMatchObject({
    holeSpacingMode: 'independent',
    holeSpacingX: 2.5,
    holeSpacingY: 2.5,
    holeShape: 'hexagon',
    bottomThickness: 0,
    edgeThickness: 4,
    tiltAngle: 30,
  })
  expect(
    persisted?.values?.desk?.['opengrid-openconnect-organizer'],
  ).toBeUndefined()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-openconnect-organizer-x2-y2-sm-independent-sx2.5-sy2.5-hexagon-d20-h28-b0-e4-a30.step',
  )

  await page.reload()
  await waitForCadReady(page, 90_000)
  await expect(page.getByRole('combobox', { name: '孔形狀' })).toHaveValue(
    'hexagon',
  )
  await expect(page.getByRole('slider', { name: /開口前傾角/ })).toHaveValue(
    '30',
  )
  await expect(
    page.getByRole('textbox', { name: '腔體底部厚度（Z）' }),
  ).toHaveValue('0')
  await expect(
    page.getByRole('textbox', { name: '孔洞至外緣厚度（X/Y）' }),
  ).toHaveValue('4')
  await page.getByRole('button', { name: /復原開口前傾角/ }).click()
  await expect(page.getByRole('slider', { name: /開口前傾角/ })).toHaveValue(
    '15',
  )
  await waitForCadReady(page, 90_000)
})

test('rectangle and ellipse shapes swap the size fields and rename exports', async ({
  page,
  browserName,
}) => {
  test.setTimeout(240_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/cad/opengrid-openconnect-organizer?system=wall')
  await waitForCadReady(page, 90_000)

  const shape = page.getByRole('combobox', { name: '孔形狀' })
  const diameter = page.getByRole('textbox', { name: /孔直徑/ })
  await expect(diameter).toBeVisible()

  await shape.selectOption('rectangle')
  await expect(diameter).toHaveCount(0)
  const width = page.getByRole('textbox', { name: '孔寬（X）' })
  const height = page.getByRole('textbox', { name: '孔高（Y）' })
  const cornerRadius = page.getByRole('textbox', { name: '孔圓角半徑' })
  await expect(width).toBeVisible()
  await expect(height).toBeVisible()
  await expect(cornerRadius).toBeVisible()
  await expect(width).toHaveValue('20')
  await expect(height).toHaveValue('20')
  await expect(cornerRadius).toHaveValue('0')

  await width.fill('30')
  await height.fill('20')
  await cornerRadius.fill('2')

  const viewport = page.getByTestId('cad-viewport')
  const initialRevision = await viewport.getAttribute('data-model-revision')
  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    initialRevision ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const rectangleDownload = await downloadPromise
  expect(rectangleDownload.suggestedFilename()).toContain(
    'opengrid-openconnect-organizer-x2-y2-sm-linked-sx1-sy1-rectangle-w30-h20-r2-h28-b1-e1-a15.step',
  )

  await shape.selectOption('ellipse')
  await expect(cornerRadius).toHaveCount(0)
  await expect(width).toBeVisible()
  await expect(height).toBeVisible()

  const ellipseDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const ellipseDownload = await ellipseDownloadPromise
  expect(ellipseDownload.suggestedFilename()).toContain(
    'opengrid-openconnect-organizer-x2-y2-sm-linked-sx1-sy1-ellipse-w30-h20-h28-b1-e1-a15.step',
  )
})
