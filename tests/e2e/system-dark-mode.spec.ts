import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  expectDimensionAnnotationBoxesToStayStable,
  readCadViewportAppearance,
  readDimensionAnnotationBoxes,
  waitForCadReady,
} from './helpers'

type SurfaceStyles = {
  colorScheme: string
  bodyBackground: string
  bodyColor: string
  navBackground: string
  navColor: string
  panelBackground: string
  panelColor: string
}

type ControlStyles = {
  colorScheme: string
  inputBackground: string
  inputColor: string
  inputBorder: string
  selectBackground: string
  selectColor: string
  selectBorder: string
}

function parseRgb(value: string): [number, number, number] {
  const components = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []
  if (components.length < 3) throw new Error(`Unsupported color: ${value}`)
  return [components[0] ?? 0, components[1] ?? 0, components[2] ?? 0]
}

function relativeLuminance(value: string): number {
  const channels = parseRgb(value).map((channel) => channel / 255)
  const linearChannels = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return (
    0.2126 * (linearChannels[0] ?? 0) +
    0.7152 * (linearChannels[1] ?? 0) +
    0.0722 * (linearChannels[2] ?? 0)
  )
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

async function readSurfaceStyles(page: Page): Promise<SurfaceStyles> {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const body = getComputedStyle(document.body)
    const nav = document.querySelector('nav')
    const panel = document.querySelector(
      '[data-testid="model-selection"] [data-entry-key]',
    )
    if (!nav || !panel) throw new Error('Expected navigation and model panel')

    const navStyle = getComputedStyle(nav)
    const panelStyle = getComputedStyle(panel)
    return {
      colorScheme: root.colorScheme,
      bodyBackground: body.backgroundColor,
      bodyColor: body.color,
      navBackground: navStyle.backgroundColor,
      navColor: navStyle.color,
      panelBackground: panelStyle.backgroundColor,
      panelColor: panelStyle.color,
    }
  })
}

async function readControlStyles(page: Page): Promise<ControlStyles> {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const input = document.querySelector('input[type="text"]')
    const select = document.querySelector('select')
    if (!input || !select) throw new Error('Expected CAD form controls')

    const inputStyle = getComputedStyle(input)
    const selectStyle = getComputedStyle(select)
    return {
      colorScheme: root.colorScheme,
      inputBackground: inputStyle.backgroundColor,
      inputColor: inputStyle.color,
      inputBorder: inputStyle.borderColor,
      selectBackground: selectStyle.backgroundColor,
      selectColor: selectStyle.color,
      selectBorder: selectStyle.borderColor,
    }
  })
}

async function readCanvasCornerLuminance(
  page: Page,
  canvas: Locator,
): Promise<number> {
  const screenshot = await canvas.screenshot()
  return page.evaluate(async (encodedPng) => {
    const response = await fetch(`data:image/png;base64,${encodedPng}`)
    const bitmap = await createImageBitmap(await response.blob())
    const imageCanvas = document.createElement('canvas')
    imageCanvas.width = bitmap.width
    imageCanvas.height = bitmap.height
    const context = imageCanvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas screenshot decoder unavailable')

    context.drawImage(bitmap, 0, 0)
    const pixel = context.getImageData(4, 4, 1, 1).data
    return 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]
  }, screenshot.toString('base64'))
}

test('static pages follow light and dark system appearances', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/models')
  const light = await readSurfaceStyles(page)

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect
    .poll(async () => (await readSurfaceStyles(page)).colorScheme)
    .toBe('dark')
  const dark = await readSurfaceStyles(page)

  expect(light.colorScheme).toBe('light')
  expect(dark.bodyBackground).not.toBe(light.bodyBackground)
  expect(dark.panelBackground).not.toBe(light.panelBackground)
  expect(dark.bodyColor).not.toBe(dark.bodyBackground)
  expect(dark.navColor).not.toBe(dark.navBackground)
  expect(contrastRatio(dark.bodyColor, dark.bodyBackground)).toBeGreaterThan(7)
  expect(contrastRatio(dark.navColor, dark.navBackground)).toBeGreaterThan(7)
})

test('dark CAD controls retain contrast and keyboard focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/cad/hexagonal-column')
  await expect(page.getByRole('combobox', { name: '擺放方向' })).toBeVisible()

  const panel = page.getByTestId('cad-workspace-panel')
  const viewport = page.getByTestId('cad-viewport')
  const panelBox = await panel.boundingBox()
  const viewportBox = await viewport.boundingBox()
  if (!panelBox || !viewportBox)
    throw new Error('Expected desktop workspace boxes')
  expect(viewportBox.x).toBeGreaterThan(panelBox.x + panelBox.width)
  expect(viewportBox.width).toBeGreaterThan(0)
  expect(viewportBox.height).toBeGreaterThan(0)

  const styles = await readControlStyles(page)
  expect(styles.colorScheme).toBe('dark')
  expect(styles.inputBackground).not.toBe(styles.inputColor)
  expect(styles.selectBackground).not.toBe(styles.selectColor)
  expect(styles.inputBorder).not.toBe(styles.inputBackground)
  expect(styles.selectBorder).not.toBe(styles.selectBackground)
  expect(
    contrastRatio(styles.inputBorder, styles.inputBackground),
  ).toBeGreaterThan(3)
  expect(
    contrastRatio(styles.selectBorder, styles.selectBackground),
  ).toBeGreaterThan(3)
  expect(
    contrastRatio(styles.inputColor, styles.inputBackground),
  ).toBeGreaterThan(4.5)
  expect(
    contrastRatio(styles.selectColor, styles.selectBackground),
  ).toBeGreaterThan(4.5)

  const restoreButton = page.getByRole('button', { name: '全部恢復預設' })
  await restoreButton.focus()
  const focusStyle = await restoreButton.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
      backgroundColor: style.backgroundColor,
    }
  })
  expect(focusStyle.outlineStyle).not.toBe('none')
  expect(focusStyle.outlineWidth).toBeGreaterThan(0)
  expect(
    contrastRatio(focusStyle.outlineColor, focusStyle.backgroundColor),
  ).toBeGreaterThan(3)
})

test('live system theme changes preserve the committed CAD viewport state', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox' && process.env.PW_HEADFUL !== '1',
    'The headless Firefox image used in this environment has no WebGL context.',
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const canvas = page.getByTestId('cad-viewport').locator('canvas')
  const lightViewportBackground = await page
    .getByTestId('cad-viewport')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  const lightCanvasLuminance = await readCanvasCornerLuminance(page, canvas)
  const lightAppearance = await readCadViewportAppearance(page, canvas)
  const dimensionsBefore = await readDimensionAnnotationBoxes(page)

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect
    .poll(async () =>
      page.getByTestId('cad-viewport').evaluate((element) => {
        return getComputedStyle(element).backgroundColor
      }),
    )
    .not.toBe(lightViewportBackground)
  const darkCanvasLuminance = await readCanvasCornerLuminance(page, canvas)
  const darkAppearance = await readCadViewportAppearance(page, canvas)
  const dimensionsAfter = await readDimensionAnnotationBoxes(page)

  expect(darkCanvasLuminance).toBeLessThan(lightCanvasLuminance)
  expect(darkAppearance.modelPixelCount).toBeGreaterThan(1000)
  expect(darkAppearance.darkPixelCount).toBeGreaterThan(
    lightAppearance.darkPixelCount,
  )
  expectDimensionAnnotationBoxesToStayStable(dimensionsBefore, dimensionsAfter)
  await expect(page.getByRole('textbox', { name: /寬度/ })).toHaveValue('20')
  const viewport = page.getByTestId('cad-viewport')
  await expect(viewport.locator('canvas')).toBeVisible()
  const gizmo = page.locator('#cad-viewport-xyz-gizmo')
  await expect(gizmo).toBeVisible()
  const viewportBox = await viewport.boundingBox()
  const gizmoBox = await gizmo.boundingBox()
  if (!viewportBox || !gizmoBox) throw new Error('Expected dark viewport aids')
  expect(gizmoBox.x).toBeGreaterThanOrEqual(viewportBox.x)
  expect(gizmoBox.y).toBeGreaterThanOrEqual(viewportBox.y)
  expect(gizmoBox.x + gizmoBox.width).toBeLessThanOrEqual(
    viewportBox.x + viewportBox.width,
  )
  expect(gizmoBox.y + gizmoBox.height).toBeLessThanOrEqual(
    viewportBox.y + viewportBox.height,
  )
  await expect(gizmo).toHaveScreenshot('box-initial-dark-gizmo.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  })
  await expect(viewport).toHaveScreenshot('box-initial-dark.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  })
})

test('dark mobile CAD workspace keeps the parameter drawer usable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })
    await page.goto('/cad/hexagonal-column')
    const pill = page.getByTestId('cad-params-pill')
    const drawer = page.getByTestId('cad-params-drawer')
    await expect(pill).toBeVisible()
    await pill.click()
    await expect(drawer).toBeVisible()
    await expect(page.getByRole('combobox', { name: '擺放方向' })).toBeVisible()
    await expect(page.getByTestId('cad-viewport')).toBeVisible()

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBeTruthy()
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).colorScheme,
      ),
    ).toBe(colorScheme)

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(pill).toBeFocused()
  }
})
