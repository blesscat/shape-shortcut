import { expect, test, type Page } from '@playwright/test'
import { SCENE_FILE_SCHEMA_VERSION } from '../../src/cad-contract/scene'
import { localizedPathFor } from '../../src/i18n/routes'
import type { Locale } from '../../src/i18n'

const LOCALES: readonly Locale[] = ['zh-Hant', 'en']
// Across both locales these cover a one-row toolbar (Chinese at 1280px and
// wider), a wrapped toolbar (English at 1280px, both locales at 800px) and the
// smaller CAD shell padding used at heights of 600px and below.
const DESKTOP_WINDOWS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 800, height: 600 },
  { width: 1280, height: 560 },
] as const
// In Chinese the toolbar stays on one row at 1280px and wraps at 844px; in
// English it wraps at both, so together they cover the shortest and tallest
// toolbar on top of the workspace floor. At 340px tall the space below the
// header is smaller than the usual floor, so the floor itself has to shrink to
// stay reachable.
const SHORT_DESKTOP_WINDOWS = [
  { width: 844, height: 390 },
  { width: 1280, height: 390 },
  { width: 844, height: 340 },
] as const
const PHONE_WINDOW = { width: 390, height: 844 }
const SHORT_DESKTOP_MIN_ROW_HEIGHT = 240

type PlaygroundLayout = {
  documentHeight: number
  windowHeight: number
  siteHeaderBottom: number
  mainPaddingBottom: number
  playgroundBottom: number
  rowTop: number
  rowBottom: number
  sidebarBottom: number | null
  sidebarScrolls: boolean
  sidebarScrollTop: number
  windowScrollY: number
  viewportBottom: number
  viewportHeight: number
  viewportContentHeight: number
  canvasHeight: number | null
}

async function openPlayground(
  page: Page,
  locale: Locale = 'zh-Hant',
): Promise<void> {
  await page.goto(localizedPathFor(locale, '/cad/playground'))
  await expect(page.getByTestId('playground-viewport')).toBeVisible({
    timeout: 30_000,
  })
}

async function addStackableBox(page: Page): Promise<void> {
  await page
    .getByTestId('playground-add-model')
    .selectOption('opengrid-stackable-box')
  await page.getByTestId('playground-add').click()
}

async function importUnknownModelScene(page: Page): Promise<void> {
  await page.getByTestId('playground-import-input').setInputFiles({
    name: 'unknown-model-scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: SCENE_FILE_SCHEMA_VERSION,
        kind: 'shape-shortcut/scene',
        grid: { system: 'opengrid' },
        instances: [
          {
            modelId: 'not-a-model',
            parameters: {},
            placement: { cellX: 0, cellY: 0, rotation: 0, supportedBy: null },
            wallPlacement: {
              cellX: 0,
              cellY: 0,
              rotation: 0,
              supportedBy: null,
            },
          },
        ],
      }),
    ),
  })
  await expect(page.getByTestId('playground-diagnostic')).toBeVisible()
}

async function readPlaygroundLayout(page: Page): Promise<PlaygroundLayout> {
  return page.evaluate(() => {
    const rectOf = (selector: string): DOMRect | null =>
      document.querySelector(selector)?.getBoundingClientRect() ?? null
    const viewport = document.querySelector<HTMLElement>(
      '[data-testid="playground-viewport"]',
    )!
    const viewportRect = viewport.getBoundingClientRect()
    const sidebar = document.querySelector<HTMLElement>(
      '[data-testid="playground-sidebar"]',
    )
    const sidebarRect = sidebar?.getBoundingClientRect() ?? null
    const canvas = viewport.querySelector('canvas')
    return {
      documentHeight: document.documentElement.scrollHeight,
      windowHeight: window.innerHeight,
      siteHeaderBottom: rectOf('.site-header')!.bottom,
      mainPaddingBottom: Number.parseFloat(
        getComputedStyle(document.querySelector('main')!).paddingBottom,
      ),
      playgroundBottom: rectOf('[data-testid="playground"]')!.bottom,
      rowTop: Math.min(viewportRect.top, sidebarRect?.top ?? Infinity),
      rowBottom: Math.max(viewportRect.bottom, sidebarRect?.bottom ?? 0),
      sidebarBottom: sidebarRect?.bottom ?? null,
      sidebarScrolls: sidebar
        ? sidebar.scrollHeight > sidebar.clientHeight
        : false,
      sidebarScrollTop: sidebar?.scrollTop ?? 0,
      windowScrollY: window.scrollY,
      viewportBottom: viewportRect.bottom,
      viewportHeight: viewportRect.height,
      viewportContentHeight: viewport.clientHeight,
      canvasHeight: canvas?.getBoundingClientRect().height ?? null,
    }
  })
}

async function expectScreenFilled(page: Page): Promise<PlaygroundLayout> {
  // The renderer resizes from a ResizeObserver, so wait for the canvas to
  // match the viewport before reading the settled layout.
  await expect
    .poll(async () => {
      const layout = await readPlaygroundLayout(page)
      if (layout.canvasHeight === null) return false
      return Math.abs(layout.canvasHeight - layout.viewportContentHeight) <= 1
    })
    .toBe(true)
  const layout = await readPlaygroundLayout(page)
  expect(layout.documentHeight).toBeLessThanOrEqual(layout.windowHeight)
  expect(layout.viewportBottom).toBeCloseTo(layout.playgroundBottom, 0)
  expect(layout.windowHeight - layout.viewportBottom).toBeCloseTo(
    layout.mainPaddingBottom,
    0,
  )
  expect(layout.sidebarBottom).not.toBeNull()
  expect(layout.sidebarBottom!).toBeLessThanOrEqual(layout.viewportBottom + 1)
  return layout
}

for (const locale of LOCALES) {
  for (const size of [DESKTOP_WINDOWS[0], PHONE_WINDOW]) {
    test(`${locale} playground at ${size.width}x${size.height} renders no site footer`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await openPlayground(page, locale)
      await expect(page.locator('footer')).toHaveCount(0)
      await expect(page.getByText('All rights reserved')).toHaveCount(0)
      await expect(page.locator('[data-site-nav]')).toBeVisible()
    })
  }
}

for (const locale of LOCALES) {
  for (const size of DESKTOP_WINDOWS) {
    test(`${locale} desktop ${size.width}x${size.height} playground fills the remaining height`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await openPlayground(page, locale)
      await expectScreenFilled(page)
    })
  }
}

test('desktop sidebar scrolls inside the row when the instance editor is taller', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP_WINDOWS[0])
  await openPlayground(page)
  await addStackableBox(page)
  await expect(page.getByTestId('playground-instance-inst-1')).toBeVisible()

  const before = await expectScreenFilled(page)
  expect(before.sidebarScrolls).toBe(true)

  const sidebar = page.getByTestId('playground-sidebar')
  const sidebarBox = (await sidebar.boundingBox())!
  await page.mouse.move(
    sidebarBox.x + sidebarBox.width / 2,
    sidebarBox.y + sidebarBox.height / 2,
  )
  await page.mouse.wheel(0, 300)
  await expect
    .poll(async () => (await readPlaygroundLayout(page)).sidebarScrollTop)
    .toBeGreaterThan(0)
  const after = await expectScreenFilled(page)
  expect(after.windowScrollY).toBe(before.windowScrollY)
})

test('desktop playground stays filled and interactive as notices and the window change', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP_WINDOWS[0])
  await openPlayground(page)
  const initial = await expectScreenFilled(page)

  await importUnknownModelScene(page)
  const withNotice = await expectScreenFilled(page)
  expect(withNotice.viewportHeight).toBeLessThan(initial.viewportHeight)

  await page.setViewportSize({
    width: DESKTOP_WINDOWS[0].width,
    height: DESKTOP_WINDOWS[0].height + 180,
  })
  const taller = await expectScreenFilled(page)
  expect(taller.viewportHeight).toBeGreaterThan(withNotice.viewportHeight)

  await page.setViewportSize(DESKTOP_WINDOWS[0])
  const restored = await expectScreenFilled(page)
  expect(restored.viewportHeight).toBeCloseTo(withNotice.viewportHeight, 0)

  // An empty-space drag still orbits the camera at the resized viewport.
  const viewport = page.getByTestId('playground-viewport')
  await expect(viewport).toHaveAttribute('data-camera-pose', 'default')
  const box = (await viewport.boundingBox())!
  await page.mouse.move(box.x + 32, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 192, box.y + 60, { steps: 6 })
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('data-camera-pose', 'custom')

  // Adding an instance clears the diagnostic and the row grows back.
  await addStackableBox(page)
  await expect(page.getByTestId('playground-diagnostic')).toHaveCount(0)
  const cleared = await expectScreenFilled(page)
  expect(cleared.viewportHeight).toBeCloseTo(initial.viewportHeight, 0)
})

async function expectWorkspaceRowReachable(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0))
  const top = await readPlaygroundLayout(page)
  expect(top.rowBottom - top.rowTop).toBeGreaterThanOrEqual(
    SHORT_DESKTOP_MIN_ROW_HEIGHT,
  )
  expect(top.documentHeight).toBeGreaterThan(top.windowHeight)

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  )
  const scrolled = await readPlaygroundLayout(page)
  // Allow sub-pixel rounding where the floor exactly fills the visible area.
  expect(scrolled.rowTop).toBeGreaterThanOrEqual(scrolled.siteHeaderBottom - 1)
  expect(scrolled.rowBottom).toBeLessThanOrEqual(scrolled.windowHeight)
}

for (const locale of LOCALES) {
  for (const size of SHORT_DESKTOP_WINDOWS) {
    test(`${locale} short desktop ${size.width}x${size.height} keeps a usable workspace row reachable by scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await openPlayground(page, locale)
      await expectWorkspaceRowReachable(page)

      await importUnknownModelScene(page)
      await expectWorkspaceRowReachable(page)
    })
  }
}

test('phone playground keeps the narrow layout', async ({ page }) => {
  await page.setViewportSize(PHONE_WINDOW)
  await openPlayground(page)

  await expect(page.getByTestId('playground-sidebar-pill')).toBeVisible()
  await expect(page.getByTestId('playground-sidebar-drawer')).toBeHidden()
  const layout = await readPlaygroundLayout(page)
  expect(layout.viewportHeight).toBeGreaterThan(layout.windowHeight / 2)
  expect(layout.documentHeight).toBeGreaterThan(layout.windowHeight)
})
