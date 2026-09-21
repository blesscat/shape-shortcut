import { isValidThreeMfPackage } from '../../src/cad-contract/three-mf'
import { expect, test } from '@playwright/test'
import { DEFAULT_MODEL_COLORS } from '../../src/cad-contract/model-colors'
import { MODEL_COLORS_STORAGE_KEY } from '../../src/features/cad/model-colors/store'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('palette edits persist across components and locales, with independent resets', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)
  const viewport = page.getByTestId('cad-viewport')
  const revision = await viewport.getAttribute('data-model-revision')
  const beforeColors = await viewport.locator('canvas').screenshot()
  await page.getByRole('button', { name: '模型配色', exact: true }).click()
  const primary = page.getByRole('textbox', { name: '主色 HEX' })
  const secondary = page.getByRole('textbox', { name: '副色 HEX' })
  await primary.fill('#123456')
  await secondary.fill('#abcdef')
  await expect(page.getByLabel('主色', { exact: true })).toHaveValue('#123456')
  await primary.fill('#12')
  await expect(primary).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('主色', { exact: true })).toHaveValue('#123456')
  await primary.blur()
  await expect(primary).toHaveValue('#123456')
  await page.getByRole('button', { name: '交換主副色' }).click()
  await expect(primary).toHaveValue('#abcdef')
  await expect(viewport).toHaveAttribute('data-model-revision', revision!)
  await page.getByRole('button', { name: '模型配色', exact: true }).click()
  await expect
    .poll(async () =>
      (await viewport.locator('canvas').screenshot()).equals(beforeColors),
    )
    .toBe(false)
  await page.getByRole('button', { name: '模型配色', exact: true }).click()
  await page.getByRole('button', { name: '全部恢復預設', exact: true }).click()
  await page.getByRole('button', { name: '模型配色', exact: true }).click()
  await expect(primary).toHaveValue('#abcdef')
  await page.goto('/en/cad/opengrid-wall-cover')
  await page.getByRole('button', { name: 'Model colors', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Primary HEX' })).toHaveValue(
    '#abcdef',
  )
  await page.reload()
  await page.getByRole('button', { name: 'Model colors', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Secondary HEX' }),
  ).toHaveValue('#123456')
  const text = page.getByTestId('opengrid-wall-cover-text')
  await text.fill('AB')
  await page.getByRole('button', { name: 'Reset colors' }).click()
  await expect(text).toHaveValue('AB')
  await expect(page.getByRole('textbox', { name: 'Primary HEX' })).toHaveValue(
    DEFAULT_MODEL_COLORS.primary,
  )
})

test('palette controls support keyboard and narrow light/dark layouts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/en/cad/box')
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    const trigger = page.getByRole('button', {
      name: 'Model colors',
      exact: true,
    })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('textbox', { name: 'Primary HEX' }),
    ).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    await page.getByRole('textbox', { name: 'Primary HEX' }).press('Escape')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  }
})

test('catalog presentation keeps default rendering despite saved custom preferences', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box?preview=thumbnail')
  await waitForCadReady(page)
  const canvas = page.getByTestId('cad-viewport').locator('canvas')
  const defaultCapture = await canvas.screenshot()
  await page.evaluate(
    ({ key }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ primary: '#ff0000', secondary: '#00ff00' }),
      ),
    { key: MODEL_COLORS_STORAGE_KEY },
  )
  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByTestId('cad-viewport')).toHaveAttribute(
    'data-presentation',
    'thumbnail',
  )
  await expect(
    page.getByRole('button', { name: '模型配色', exact: true }),
  ).toHaveCount(0)
  expect((await canvas.screenshot()).equals(defaultCapture)).toBe(true)
})

for (const modelId of ['opengrid-wall-cover', 'opengrid-stackable-cylinder']) {
  test(`${modelId} downloads a valid 3MF with the selected palette`, async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await page.goto(`/en/cad/${modelId}`)
    if (modelId === 'opengrid-stackable-cylinder')
      await page
        .getByTestId('opengrid-stackable-cylinder-top-rim-enabled')
        .check()
    await expect(
      page.getByRole('button', { name: 'Download 3MF' }),
    ).toBeEnabled({ timeout: 90_000 })
    const revision = await page
      .getByTestId('cad-viewport')
      .getAttribute('data-model-revision')
    await page
      .getByRole('button', { name: 'Model colors', exact: true })
      .click()
    await page.getByRole('textbox', { name: 'Primary HEX' }).fill('#123abc')
    await page.getByRole('textbox', { name: 'Secondary HEX' }).fill('#def456')
    await expect(page.getByTestId('cad-viewport')).toHaveAttribute(
      'data-model-revision',
      revision!,
    )
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download 3MF' }).click()
    const stream = await (await downloading).createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
    const bytes = Buffer.concat(chunks)
    expect(isValidThreeMfPackage(Uint8Array.from(bytes).buffer)).toBe(true)
    const content = bytes.toString('utf8')
    expect(content).toContain('displaycolor="#123abc"')
    expect(content).toContain('displaycolor="#def456"')
    expect(content).toContain('"filament_colour": ["#123abc", "#def456"]')
    expect(content).toContain('key="extruder" value="1"')
    expect(content).toContain('key="extruder" value="2"')
  })
}
