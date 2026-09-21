import { expect, test, type Page } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

const TOOLTIP_SELECTOR = '[data-testid="cad-face-hover-tooltip"]'
const FACE_EXTENT_PATTERN =
  /(20\.00 × 30\.00 × 0\.00|20\.00 × 0\.00 × 40\.00|0\.00 × 30\.00 × 40\.00) mm/

async function viewportBox(page: Page) {
  const box = await page.getByTestId('cad-viewport').boundingBox()
  expect(box).not.toBeNull()
  return box!
}

test('hovering the box model shows the hovered face extent', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/cad/box')
  await waitForCadReady(page)

  const box = await viewportBox(page)
  const tooltip = page.locator(TOOLTIP_SELECTOR)
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2

  // Hover near the middle of the viewport where the model surface sits.
  await page.mouse.move(centerX, centerY)
  await page.mouse.move(centerX + 4, centerY + 4)
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText(FACE_EXTENT_PATTERN)

  // The tooltip must stay inside the viewport while following the pointer.
  await page.mouse.move(centerX - 40, centerY + 30)
  await page.mouse.move(centerX - 80, centerY - 10)
  await expect(tooltip).toBeVisible()
  const tooltipBox = await tooltip.boundingBox()
  expect(tooltipBox).not.toBeNull()
  expect(tooltipBox!.x).toBeGreaterThanOrEqual(box.x)
  expect(tooltipBox!.y).toBeGreaterThanOrEqual(box.y)
  expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(
    box.x + box.width,
  )
  expect(tooltipBox!.y + tooltipBox!.height).toBeLessThanOrEqual(
    box.y + box.height,
  )

  // Moving off the model hides the tooltip.
  await page.mouse.move(box.x + 5, box.y + 5)
  await expect(tooltip).toBeHidden()

  // A new committed revision updates the measured extents.
  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await waitForCadReady(page)
  await page.mouse.move(centerX, centerY)
  await page.mouse.move(centerX + 4, centerY + 4)
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText(
    /(25\.00 × 30\.00 × 0\.00|0\.00 × 30\.00 × 40\.00|25\.00 × 0\.00 × 40\.00) mm/,
  )
})

test('hovering a multi-part model measures faces on each part', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/cad/opengrid-wall-cover')
  await waitForCadReady(page)

  const box = await viewportBox(page)
  const tooltip = page.locator(TOOLTIP_SELECTOR)
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2

  await page.mouse.move(centerX, centerY)
  await page.mouse.move(centerX + 4, centerY + 4)
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText(/\d+\.\d{2} × \d+\.\d{2} × \d+\.\d{2} mm/)

  // Sweeping across the plate keeps reporting a measurable face.
  await page.mouse.move(centerX - 40, centerY + 20)
  await expect(tooltip).toBeVisible()
})

test('orbit dragging suppresses the hover tooltip', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/cad/box')
  await waitForCadReady(page)

  const box = await viewportBox(page)
  const tooltip = page.locator(TOOLTIP_SELECTOR)
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2

  await page.mouse.move(centerX, centerY)
  await page.mouse.move(centerX + 4, centerY + 4)
  await expect(tooltip).toBeVisible()

  // Drag to orbit: the tooltip must disappear during the drag.
  await page.mouse.down()
  await page.mouse.move(centerX + 80, centerY - 60, { steps: 8 })
  await expect(tooltip).toBeHidden()
  await page.mouse.up()

  // Hovering again after the drag shows the tooltip once more.
  await page.mouse.move(centerX, centerY)
  await page.mouse.move(centerX + 4, centerY + 4)
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText(FACE_EXTENT_PATTERN)
})

test('static dimension annotations remain visible during hover', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/cad/box')
  await waitForCadReady(page)

  const before = await page
    .getByTestId('cad-viewport')
    .locator('[aria-label*="mm"]')
    .count()
  expect(before).toBeGreaterThan(0)

  const box = await viewportBox(page)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 4)
  await expect(page.locator(TOOLTIP_SELECTOR)).toBeVisible()

  const after = await page
    .getByTestId('cad-viewport')
    .locator('[aria-label*="mm"]')
    .count()
  expect(after).toBeGreaterThanOrEqual(before)
})
