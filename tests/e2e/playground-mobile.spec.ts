import { devices, expect, test, type Page } from '@playwright/test'

import { localizedPathFor } from '../../src/i18n/routes'
import { dispatchMobileTouchFrames, type MobileTouchFrame } from './helpers'

const CHROMIUM_MOBILE_DEVICE = {
  userAgent: devices['iPhone 13'].userAgent,
  viewport: devices['iPhone 13'].viewport,
  deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
  isMobile: devices['iPhone 13'].isMobile,
  hasTouch: devices['iPhone 13'].hasTouch,
}

test.use(CHROMIUM_MOBILE_DEVICE)

type ViewportPoint = { x: number; y: number }

async function openCompactPlayground(page: Page): Promise<void> {
  await page.goto(localizedPathFor('zh-Hant', '/cad/playground'))
  await expect(page.getByTestId('playground')).toBeVisible({ timeout: 30_000 })
  const gridX = page.getByTestId('playground-grid-size-x')
  const gridY = page.getByTestId('playground-grid-size-y')
  await gridX.fill('8')
  await gridX.blur()
  await gridY.fill('8')
  await gridY.blur()
  await page.reload()
  await expect(page.getByTestId('playground')).toBeVisible({ timeout: 30_000 })
}

async function addReadyBox(page: Page): Promise<void> {
  await page.getByTestId('playground-add-model').selectOption('box')
  await page.getByTestId('playground-add').click()
  await expect(page.getByTestId('playground-instance-inst-1')).toHaveAttribute(
    'data-state',
    'ready',
    { timeout: 120_000 },
  )
}

async function findInstancePoint(page: Page): Promise<ViewportPoint> {
  const viewport = page.getByTestId('playground-viewport')
  const canvas = viewport.locator('canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Playground viewport canvas is not available')
  const screenshot = await canvas.screenshot()
  const modelCenter = await page.evaluate(async (encodedPng) => {
    const response = await fetch(`data:image/png;base64,${encodedPng}`)
    const bitmap = await createImageBitmap(await response.blob())
    const imageCanvas = document.createElement('canvas')
    imageCanvas.width = bitmap.width
    imageCanvas.height = bitmap.height
    const context = imageCanvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Playground screenshot decoder unavailable')
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    let count = 0
    let sumX = 0
    let sumY = 0
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue)
      const isHighlightedModel =
        saturation > 70 && red > blue + 40 && green > blue + 20
      if (!isHighlightedModel) continue
      const pixelIndex = index / 4
      sumX += pixelIndex % bitmap.width
      sumY += Math.floor(pixelIndex / bitmap.width)
      count += 1
    }
    if (count === 0) throw new Error('Rendered playground instance not found')
    return {
      x: sumX / count,
      y: sumY / count,
      width: bitmap.width,
      height: bitmap.height,
    }
  }, screenshot.toString('base64'))

  return {
    x: box.x + (modelCenter.x / modelCenter.width) * box.width,
    y: box.y + (modelCenter.y / modelCenter.height) * box.height,
  }
}

function oneFingerDragFrames(start: ViewportPoint): MobileTouchFrame[] {
  const frames: MobileTouchFrame[] = []
  for (let step = 0; step <= 8; step += 1) {
    frames.push([{ x: start.x + step * 10, y: start.y }])
  }
  return frames
}

async function selectedCellX(page: Page): Promise<number> {
  return Number(await page.locator('#playground-cell-x').inputValue())
}

test('one touch drags an instance while empty-space touch remains a camera gesture', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Mobile touch coverage runs on Chromium',
  )

  await openCompactPlayground(page)
  await addReadyBox(page)
  const start = await findInstancePoint(page)
  const before = await selectedCellX(page)

  await dispatchMobileTouchFrames(page, oneFingerDragFrames(start))

  expect(await selectedCellX(page)).not.toBe(before)
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-drag-instance',
    '',
  )

  const viewport = page.getByTestId('playground-viewport')
  const canvas = viewport.locator('canvas')
  const canvasBox = await canvas.boundingBox()
  if (!canvasBox) throw new Error('Playground viewport canvas is not available')
  const emptyStart = {
    x: canvasBox.x + 20,
    y: canvasBox.y + canvasBox.height / 2,
  }
  const cameraBeforeOrbit = await viewport.getAttribute('data-camera-position')

  await dispatchMobileTouchFrames(page, oneFingerDragFrames(emptyStart))

  await expect(viewport).not.toHaveAttribute(
    'data-camera-position',
    cameraBeforeOrbit!,
  )
})

test('a second touch cancels an instance preview and hands the gesture to the camera', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Mobile touch coverage runs on Chromium',
  )

  await openCompactPlayground(page)
  await addReadyBox(page)
  const start = await findInstancePoint(page)
  const viewport = page.getByTestId('playground-viewport')
  const originalCellX = await selectedCellX(page)
  const originalCamera = await viewport.getAttribute('data-camera-position')
  const client = await page.context().newCDPSession(page)
  const firstMoved = { x: start.x + 70, y: start.y }
  const second = { x: start.x - 50, y: start.y }

  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ id: 1, x: start.x, y: start.y }],
    })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ id: 1, x: firstMoved.x, y: firstMoved.y }],
    })
    await expect(viewport).toHaveAttribute('data-drag-instance', 'inst-1')

    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { id: 1, x: firstMoved.x, y: firstMoved.y },
        { id: 2, x: second.x, y: second.y },
      ],
    })
    await expect(viewport).toHaveAttribute('data-drag-instance', '')

    for (let step = 1; step <= 6; step += 1) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { id: 1, x: firstMoved.x + step * 8, y: firstMoved.y },
          { id: 2, x: second.x - step * 8, y: second.y },
        ],
      })
    }
  } finally {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
  }

  expect(await selectedCellX(page)).toBe(originalCellX)
  await expect(viewport).not.toHaveAttribute(
    'data-camera-position',
    originalCamera!,
  )
})
