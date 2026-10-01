import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
} from './helpers'
import { COMPONENT_PARAMETER_STORAGE_KEY } from '../../src/features/cad/parameters'
import { OPENGRID_SNAP_CONFIGURATION } from '../../src/cad-contract/units'

test('Desk and Wall Snap entries use isolated presets and context resets', async ({
  page,
}) => {
  await page.goto('/cad/opengrid-snap?system=desk')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await expect(
    page.getByRole('heading', { name: '目前編輯：Snap (咔咔)' }),
  ).toBeVisible()
  const variant = page.getByRole('combobox', { name: 'OpenGrid Snap 型號' })
  const deskSystem = page.getByRole('radio', { name: '桌面系統' })
  const wallSystem = page.getByRole('radio', { name: '掛牆系統' })
  const cornerHoles = page.getByRole('checkbox', { name: '定位孔' })
  const centerRemover = page.getByRole('checkbox', { name: '移除孔' })
  const deskMagnetShape = page.getByRole('combobox', {
    name: 'Snap 磁鐵孔形狀',
  })
  const offset = page.getByRole('slider', { name: '外框總增量（X/Y）' })

  await expect(variant).toHaveValue('Lite')
  await expect(deskSystem).toBeChecked()
  await expect(wallSystem).not.toBeChecked()
  await expect(cornerHoles).toBeChecked()
  await expect(centerRemover).toBeChecked()
  await expect(deskMagnetShape).toBeVisible()
  await expect(offset).toHaveValue('0.25')
  await expect(
    page.getByText('目前系統：Desk System', { exact: true }),
  ).toBeVisible()

  await offset.press('ArrowRight')
  await cornerHoles.uncheck()
  await centerRemover.uncheck()
  await expect(offset).toHaveValue('0.3')

  await wallSystem.check()
  await expect(wallSystem).toBeChecked()
  await expect(variant).toHaveValue('Full')
  await expect(
    page.getByRole('combobox', { name: 'OpenGrid Snap 格型' }),
  ).toHaveCount(0)
  await expect(cornerHoles).toHaveCount(0)
  await expect(centerRemover).toHaveCount(0)
  const openConnect = page.getByRole('checkbox', { name: 'OpenConnect' })
  await expect(openConnect).toBeVisible()
  await expect(openConnect).not.toBeChecked()
  await expect(offset).toHaveValue('0')
  await expect(offset).toBeEnabled()
  await openConnect.check()
  await deskSystem.check()
  await expect(deskSystem).toBeChecked()
  await expect(openConnect).toHaveCount(0)
  await expect(cornerHoles).toBeVisible()
  await expect(cornerHoles).not.toBeChecked()
  await expect(centerRemover).not.toBeChecked()
  await expect(offset).toHaveValue('0.3')

  await wallSystem.check()
  await expect(openConnect).toBeChecked()

  await page.goto('/cad/opengrid-snap?system=wall')
  const wallVariant = page.getByRole('combobox', {
    name: 'OpenGrid Snap 型號',
  })
  const wallCornerHoles = page.getByRole('checkbox', { name: '定位孔' })
  const wallCenterRemover = page.getByRole('checkbox', { name: '移除孔' })
  const wallMagnetShape = page.getByRole('combobox', {
    name: 'Snap 磁鐵孔形狀',
  })
  const wallOffset = page.getByRole('slider', {
    name: '外框總增量（X/Y）',
  })
  await expect(wallVariant).toHaveValue('Full')
  await expect(wallCornerHoles).toHaveCount(0)
  await expect(wallCenterRemover).toHaveCount(0)
  await expect(
    page.getByRole('combobox', { name: 'OpenGrid Snap 格型' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('checkbox', { name: 'OpenConnect' }),
  ).toBeChecked()
  await expect(wallMagnetShape).toBeVisible()
  await expect(wallOffset).toHaveValue('0')
  await expect(
    page.getByText('目前系統：Wall System', { exact: true }),
  ).toBeVisible()

  await page.getByRole('button', { name: '全部恢復預設' }).click()
  await expect(wallVariant).toHaveValue('Full')
  await expect(wallOffset).toHaveValue('0')

  await page.goto('/cad/opengrid-snap?system=desk')
  await expect(
    page.getByRole('slider', { name: '外框總增量（X/Y）' }),
  ).toHaveValue('0.3')
  await expect(page.getByRole('checkbox', { name: '定位孔' })).not.toBeChecked()
})

test('OpenGrid Snap route exposes profiles, features, and one shared outer offset', async ({
  page,
}) => {
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
  await page.goto('/cad/opengrid-snap')
  await expect(page.getByTestId('opengrid-snap-panel')).toBeVisible()
  await expect(page.getByTestId('cad-system-context')).toHaveCount(0)
  const variant = page.getByRole('combobox', { name: 'OpenGrid Snap 型號' })
  await expect(variant).toBeVisible()
  await expect(variant.locator('option').nth(0)).toHaveAttribute(
    'value',
    'Lite',
  )
  await expect(variant.locator('option').nth(1)).toHaveAttribute(
    'value',
    'Full',
  )
  const profile = page.getByRole('combobox', { name: 'OpenGrid Snap 幾何版本' })
  await expect(profile.locator('option')).toHaveCount(2)
  const cornerHoles = page.getByRole('checkbox', {
    name: '定位孔',
  })
  const centerRemover = page.getByRole('checkbox', {
    name: '移除孔',
  })
  const magnetShape = page.getByRole('combobox', {
    name: 'Snap 磁鐵孔形狀',
  })
  await expect(cornerHoles).not.toBeChecked()
  await expect(centerRemover).not.toBeChecked()
  await expect(magnetShape).toHaveValue('none')
  await expect(magnetShape.locator('option[value="none"]')).toHaveText('無')
  await expect(magnetShape.locator('option')).toHaveCount(3)
  await magnetShape.selectOption('square')
  await expect(cornerHoles).not.toBeChecked()
  await expect(centerRemover).not.toBeChecked()
  const squareLength = page.getByRole('slider', { name: '長度（X）' })
  const squareWidth = page.getByRole('slider', { name: '寬度（Y）' })
  const squareThickness = page.getByRole('slider', { name: '厚度（Z）' })
  await expect(squareLength).toBeVisible()
  await expect(squareWidth).toBeVisible()
  await expect(squareThickness).toBeVisible()
  await expect(squareLength).toHaveAttribute('type', 'range')
  for (const slider of [squareLength, squareWidth, squareThickness]) {
    await expect(slider).toHaveAttribute('min', '1')
    await expect(slider).toHaveAttribute(
      'step',
      String(OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep),
    )
  }
  await expect(squareLength).toHaveValue('5')
  await expect(squareWidth).toHaveValue('5')
  await expect(squareThickness).toHaveValue('2')
  await expect(squareLength).toHaveAttribute('max', '15')
  await expect(squareWidth).toHaveAttribute('max', '15')
  await expect(squareThickness).toHaveAttribute('max', '6')
  await squareLength.press('Home')
  for (let index = 0; index < 100; index += 1) {
    await squareLength.press('ArrowRight')
  }
  await squareWidth.press('Home')
  for (let index = 0; index < 60; index += 1) {
    await squareWidth.press('ArrowRight')
  }
  await squareThickness.press('Home')
  for (let index = 0; index < 20; index += 1) {
    await squareThickness.press('ArrowRight')
  }
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const captures = (
          window as Window & { __cadModelGenerateCaptures?: unknown[] }
        ).__cadModelGenerateCaptures
        return captures?.at(-1) ?? null
      }),
    )
    .toMatchObject({
      modelId: 'opengrid-snap',
      parameters: {
        magnetHoleShape: 'square',
        magnetHoleLength: 6,
        magnetHoleWidth: 4,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 2,
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
      },
    })
  await cornerHoles.check()
  await expect(magnetShape).toHaveValue('none')
  await expect(page.getByRole('slider', { name: '長度（X）' })).toHaveCount(0)
  await cornerHoles.uncheck()
  await magnetShape.selectOption('round')
  const roundDiameter = page.getByRole('slider', { name: '直徑（XY）' })
  const roundThickness = page.getByRole('slider', { name: '厚度（Z）' })
  await expect(roundDiameter).toHaveValue('5')
  await expect(roundThickness).toHaveValue('2')
  await expect(roundDiameter).toHaveAttribute('min', '1')
  await expect(roundDiameter).toHaveAttribute('max', '15')
  await expect(roundDiameter).toHaveAttribute(
    'step',
    String(OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep),
  )
  await expect(roundThickness).toHaveAttribute('min', '1')
  await expect(roundThickness).toHaveAttribute('max', '6')
  await expect(roundThickness).toHaveAttribute(
    'step',
    String(OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep),
  )
  await roundDiameter.press('Home')
  for (let index = 0; index < 140; index += 1) {
    await roundDiameter.press('ArrowRight')
  }
  await roundThickness.press('Home')
  for (let index = 0; index < 20; index += 1) {
    await roundThickness.press('ArrowRight')
  }
  await profile.selectOption('Directional')
  await cornerHoles.check()
  await centerRemover.check()
  await expect(magnetShape).toHaveValue('none')
  await page.reload()
  await expect(profile).toHaveValue('Directional')
  await expect(cornerHoles).toBeChecked()
  await expect(centerRemover).toBeChecked()
  await profile.selectOption('Standard')
  await cornerHoles.uncheck()
  await centerRemover.uncheck()
  const offset = page.getByRole('slider', { name: '外框總增量（X/Y）' })
  await expect(offset).toHaveValue('0')
  await expect(offset).toHaveAttribute('min', '0')
  await expect(offset).toHaveAttribute(
    'max',
    String(OPENGRID_SNAP_CONFIGURATION.maxOffset),
  )
  await expect(offset).toHaveAttribute('step', '0.05')
  await expect(
    page.getByRole('textbox', { name: '外框總增量（X/Y）' }),
  ).toHaveCount(0)
  await expect(page.getByTestId('opengrid-snap-panel')).not.toContainText(
    '外框總尺寸',
  )
  const footprint = page.getByRole('combobox', {
    name: 'OpenGrid Snap 格型',
  })
  await expect(footprint.locator('option')).toHaveCount(3)
  await expect(footprint.locator('option[value="half"]')).toHaveText('Half')
  await expect(footprint.locator('option[value="quarter"]')).toHaveText(
    'Quarter',
  )
  await expect(page.getByText('格型測試中 不保證可使用')).toHaveCount(0)
  await expect(
    page.getByRole('combobox', { name: /Snap.*半格方向|Snap.*X|Snap.*Y/ }),
  ).toHaveCount(0)
  await footprint.selectOption('full')
  await offset.press('ArrowRight')
  await expect(offset).toHaveValue('0.05')
  const halfPreviewRequest = page.waitForRequest((request) =>
    request.url().endsWith('/downloads/snap-half.step'),
  )
  await footprint.selectOption('half')
  await halfPreviewRequest
  await expect(offset).toHaveValue('0')
  await expect(page.getByText('格型測試中 不保證可使用')).toHaveCount(0)
  await expect(offset).toBeDisabled()
  await expect(cornerHoles).toBeDisabled()
  await expect(centerRemover).toBeDisabled()
  await expect(page.getByText('增量無效', { exact: true })).toBeVisible()
  await expect(page.getByText('定位孔無效', { exact: true })).toBeVisible()
  await expect(page.getByText('移除孔無效', { exact: true })).toBeVisible()
  const quarterPreviewRequest = page.waitForRequest((request) =>
    request.url().endsWith('/downloads/snap-quarter.step'),
  )
  await footprint.selectOption('quarter')
  await quarterPreviewRequest
  await expect(offset).toHaveValue('0')
  await expect(page.getByText('格型測試中 不保證可使用')).toBeVisible()
  await expect(offset).toBeDisabled()
  await expect(cornerHoles).toBeDisabled()
  await expect(centerRemover).toBeDisabled()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const captures = (
          window as Window & { __cadModelGenerateCaptures?: unknown[] }
        ).__cadModelGenerateCaptures
        return captures?.at(-1) ?? null
      }),
    )
    .toMatchObject({
      kind: 'model.generate',
      modelId: 'opengrid-snap',
      parameters: {
        footprint: 'quarter',
        profile: 'Standard',
        variant: 'Full',
        offset: 0,
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
      },
    })
  const latestGenerate = await page.evaluate(() => {
    const captures = (
      window as Window & { __cadModelGenerateCaptures?: unknown[] }
    ).__cadModelGenerateCaptures
    return captures?.at(-1) as Record<string, unknown> | undefined
  })
  const latestParameters = latestGenerate?.parameters as
    Record<string, unknown> | undefined
  expect(latestParameters).not.toHaveProperty('halfCellX')
  expect(latestParameters).not.toHaveProperty('halfCellY')
  await page.reload()
  await expect(footprint).toHaveValue('quarter')
  const persistedSnap = await page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const payload = JSON.parse(raw) as {
      values?: { legacy?: Record<string, Record<string, unknown>> }
    }
    return payload.values?.legacy?.['opengrid-snap'] ?? null
  }, COMPONENT_PARAMETER_STORAGE_KEY)
  expect(persistedSnap).toMatchObject({ footprint: 'quarter' })
  expect(persistedSnap).not.toHaveProperty('halfCellX')
  expect(persistedSnap).not.toHaveProperty('halfCellY')
  await footprint.selectOption('full')
  await expect(page.getByText('格型測試中 不保證可使用')).toHaveCount(0)
  await expect(offset).toBeEnabled()
  await expect(cornerHoles).toBeEnabled()
  await expect(centerRemover).toBeEnabled()
  await expect(page.getByText('增量無效', { exact: true })).toHaveCount(0)
  await expect(page.getByText('定位孔無效', { exact: true })).toHaveCount(0)
  await expect(page.getByText('移除孔無效', { exact: true })).toHaveCount(0)
  await expect(page.getByTestId('opengrid-panel')).toHaveCount(0)
  await expect(
    page.getByTestId('opengrid-snap-panel').getByText(/板型|格數|螺絲|連接孔/),
  ).toHaveCount(0)

  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 型號' })
    .selectOption('Lite')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
})

test('OpenGrid Snap generates the complete assembly and exports the committed revision', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-snap')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })
  await expect(page.getByLabel('寬度 X 25.6 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 25.6 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 6.8 mm')).toBeVisible()

  const offset = page.getByRole('slider', { name: '外框總增量（X/Y）' })
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })
  await expect(page.getByLabel('寬度 X 25.8 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 25.8 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 6.8 mm')).toBeVisible()

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe(
    'opengrid-snap-standard-full-offset0.2-full-corners0-center0.step',
  )

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe(
    'opengrid-snap-standard-full-offset0.2-full-corners0-center0.stl',
  )
  await expect
    .poll(() => readBinaryStlByteLength(stlDownload))
    .toBeGreaterThan(84)

  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 幾何版本' })
    .selectOption('Directional')
  await page.getByRole('checkbox', { name: '定位孔' }).check()
  await page.getByRole('checkbox', { name: '移除孔' }).check()
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })
  const directionalStepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const directionalStepDownload = await directionalStepDownloadPromise
  expect(directionalStepDownload.suggestedFilename()).toBe(
    'opengrid-snap-directional-full-offset0.2-full-corners1-center1.step',
  )
})

test('OpenGrid Snap commits the user-reported Directional Lite offset build', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-snap')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })

  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 型號' })
    .selectOption('Lite')
  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 幾何版本' })
    .selectOption('Directional')
  await page.getByRole('checkbox', { name: '定位孔' }).check()
  await page.getByRole('checkbox', { name: '移除孔' }).check()

  const offset = page.getByRole('slider', { name: '外框總增量（X/Y）' })
  for (let step = 0; step < 7; step += 1) {
    await offset.press('ArrowRight')
  }
  await expect(offset).toHaveValue('0.35')
  await expect(page.getByLabel('寬度 X 25.95 mm')).toBeVisible({
    timeout: 90_000,
  })
  await expect(page.getByLabel('深度 Y 26.35 mm')).toBeVisible()

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe(
    'opengrid-snap-directional-lite-offset0.35-full-corners1-center1.step',
  )
})

test('OpenGrid Snap Wall OpenConnect keeps source geometry through export', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-snap?system=wall')

  const openConnect = page.getByRole('checkbox', { name: 'OpenConnect' })
  const offset = page.getByRole('slider', { name: '外框總增量（X/Y）' })
  const stepButton = page.getByRole('button', { name: '下載 STEP' })
  await expect(openConnect).toBeVisible()
  await expect(openConnect).not.toBeChecked()
  await expect(offset).toHaveValue('0')

  await openConnect.check()
  await expect(stepButton).toBeEnabled({ timeout: 90_000 })
  const zeroOffsetDownloadPromise = page.waitForEvent('download')
  await stepButton.click()
  const zeroOffsetDownload = await zeroOffsetDownloadPromise
  expect(zeroOffsetDownload.suggestedFilename()).toBe(
    'opengrid-snap-standard-full-offset0-full-corners0-center0-openconnect.step',
  )

  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await expect(offset).toHaveValue('0.1')
  await expect(stepButton).toBeEnabled({ timeout: 90_000 })
  const adjustedDownloadPromise = page.waitForEvent('download')
  await stepButton.click()
  const adjustedDownload = await adjustedDownloadPromise
  expect(adjustedDownload.suggestedFilename()).toBe(
    'opengrid-snap-standard-full-offset0.1-full-corners0-center0-openconnect.step',
  )
})
