import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { localizedPathFor } from '../../src/i18n/routes'
import type { Locale } from '../../src/i18n'

type ViewportPoint = { x: number; y: number }

const LOCALE: Locale = 'zh-Hant'

async function openPlayground(page: Page): Promise<void> {
  await page.goto(localizedPathFor(LOCALE, '/cad/playground'))
  await expect(page.getByTestId('playground')).toBeVisible({ timeout: 30_000 })
}

async function addBoxInstance(page: Page): Promise<void> {
  await page.getByTestId('playground-add-model').selectOption('box')
  await page.getByTestId('playground-add').click()
}

async function waitForInstanceReady(
  page: Page,
  instanceId: string,
): Promise<void> {
  await expect(
    page.getByTestId(`playground-instance-${instanceId}`),
  ).toHaveAttribute('data-state', 'ready', { timeout: 120_000 })
}

async function useCompactPlaygroundGrid(page: Page): Promise<void> {
  await openPlayground(page)
  const gridX = page.getByTestId('playground-grid-size-x')
  const gridY = page.getByTestId('playground-grid-size-y')
  await gridX.fill('8')
  await gridX.blur()
  await gridY.fill('8')
  await gridY.blur()
  await page.reload()
  await openPlayground(page)
}

async function findInstancePoint(
  page: Page,
  instanceId: string,
): Promise<ViewportPoint> {
  const viewport = page.getByTestId('playground-viewport')
  const canvas = viewport.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Playground viewport canvas is not available')
  const screenshot = await canvas.screenshot()
  const candidates = await page.evaluate(async (encodedPng) => {
    const response = await fetch(`data:image/png;base64,${encodedPng}`)
    const bitmap = await createImageBitmap(await response.blob())
    const imageCanvas = document.createElement('canvas')
    imageCanvas.width = bitmap.width
    imageCanvas.height = bitmap.height
    const context = imageCanvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Playground screenshot decoder unavailable')
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    const points: Array<{ x: number; y: number }> = []
    for (let y = 0; y < bitmap.height; y += 3) {
      for (let x = 0; x < bitmap.width; x += 3) {
        const index = (y * bitmap.width + x) * 4
        const channels = [pixels[index], pixels[index + 1], pixels[index + 2]]
        const saturation = Math.max(...channels) - Math.min(...channels)
        if (saturation > 35 && Math.max(...channels) > 80) points.push({ x, y })
      }
    }
    const centerX = bitmap.width / 2
    const centerY = bitmap.height / 2
    points.sort(
      (left, right) =>
        Math.hypot(left.x - centerX, left.y - centerY) -
        Math.hypot(right.x - centerX, right.y - centerY),
    )
    return {
      points: points.slice(0, 800),
      width: bitmap.width,
      height: bitmap.height,
    }
  }, screenshot.toString('base64'))

  for (const candidate of candidates.points) {
    const point = {
      x: box.x + (candidate.x / candidates.width) * box.width,
      y: box.y + (candidate.y / candidates.height) * box.height,
    }
    await page.mouse.move(point.x, point.y)
    await page.evaluate(() => new Promise(requestAnimationFrame))
    if ((await viewport.getAttribute('data-hover-instance')) === instanceId) {
      return point
    }
  }

  throw new Error(`Could not locate rendered playground instance ${instanceId}`)
}

async function readSelectedPlacement(
  page: Page,
): Promise<{ cellX: number; cellY: number }> {
  return {
    cellX: Number(await page.locator('#playground-cell-x').inputValue()),
    cellY: Number(await page.locator('#playground-cell-y').inputValue()),
  }
}

async function moveActiveDragToCell(
  page: Page,
  around: ViewportPoint,
  cellX: number,
  cellY: number,
): Promise<void> {
  const viewport = page.getByTestId('playground-viewport')
  const target = `${cellX},${cellY}`
  const offsets = [0, 16, -16, 32, -32, 48, -48, 64, -64]

  for (const yOffset of offsets) {
    for (const xOffset of offsets) {
      await page.mouse.move(around.x + xOffset, around.y + yOffset)
      if ((await viewport.getAttribute('data-drag-cell')) === target) return
    }
  }

  throw new Error(`Could not move active drag to playground cell ${target}`)
}

function expectSerializedVectorCloseTo(
  actual: string | null,
  expected: string | null,
): void {
  expect(actual).toBeTruthy()
  expect(expected).toBeTruthy()
  const actualValues = actual!.split(',').map(Number)
  const expectedValues = expected!.split(',').map(Number)
  expect(actualValues).toHaveLength(expectedValues.length)
  actualValues.forEach((value, index) => {
    expect(value).toBeCloseTo(expectedValues[index], 5)
  })
}

test.describe('OpenGrid playground planner', () => {
  test('adds an instance, renders its proxy, and edits its placement', async ({
    page,
  }) => {
    await openPlayground(page)
    await addBoxInstance(page)

    await expect(page.getByTestId('playground-instance-inst-1')).toBeVisible()
    await expect(page.getByTestId('playground-viewport')).toBeVisible()
    await expect(page.getByTestId('playground-instance-help')).not.toBeEmpty()
    await expect(page.getByTestId('playground-param-width')).toContainText(/\S/)
    await waitForInstanceReady(page, 'inst-1')

    const cellX = page.locator('#playground-cell-x')
    await cellX.fill('3')
    await cellX.blur()
    await expect(page.getByTestId('playground-diagnostic')).toHaveCount(0)
  })

  test('regenerates only the edited instance when parameters change', async ({
    page,
  }) => {
    await openPlayground(page)
    await addBoxInstance(page)
    await waitForInstanceReady(page, 'inst-1')

    const widthInput = page
      .getByTestId('playground-param-width')
      .locator('input[type="text"]')
      .first()
    await widthInput.fill('25')
    await widthInput.blur()
    await expect(page.getByTestId('playground-diagnostic')).toHaveCount(0)
    await waitForInstanceReady(page, 'inst-1')
  })

  test('rejects overlapping placements with a visible diagnostic', async ({
    page,
  }) => {
    await openPlayground(page)
    await addBoxInstance(page)
    await waitForInstanceReady(page, 'inst-1')

    await page.getByTestId('playground-add-model').selectOption('box')
    await page.getByTestId('playground-add').click()
    await waitForInstanceReady(page, 'inst-2')

    await page.getByTestId('playground-instance-inst-2').click()
    const cellX = page.locator('#playground-cell-x')
    await cellX.fill('0')
    await cellX.blur()

    await expect(page.getByTestId('playground-diagnostic')).toBeVisible()
  })

  test('downloads the scene file and a per-instance STEP export', async ({
    page,
  }) => {
    await openPlayground(page)
    await addBoxInstance(page)
    await waitForInstanceReady(page, 'inst-1')

    const sceneDownload = page.waitForEvent('download')
    await page.getByTestId('playground-export-scene').click()
    const sceneFile = await sceneDownload
    expect(sceneFile.suggestedFilename()).toBe('playground-scene.json')

    // STEP download follows the workspace policy: dev builds only.
    const stepButton = page.getByTestId('playground-export-step')
    if (await stepButton.isVisible()) {
      const stepDownload = page.waitForEvent('download')
      await stepButton.click()
      const stepFile = await stepDownload
      expect(stepFile.suggestedFilename()).toContain('box-20x30x40-1.step')
    } else {
      await expect(stepButton).toHaveCount(0)
    }
  })

  test('imports a scene file into the playground', async ({ page }) => {
    const scene = {
      schemaVersion: 1,
      kind: 'shape-shortcut/scene',
      grid: { system: 'opengrid' },
      colors: { primary: '#112233', secondary: '#445566' },
      instances: [
        {
          modelId: 'box',
          parameters: { width: 20, depth: 30, height: 40 },
          placement: { cellX: 0, cellY: 0, rotation: 0, supportedBy: null },
          colors: { primary: '#112233', secondary: '#445566' },
        },
      ],
    }
    await openPlayground(page)
    await page.getByTestId('playground-import-input').setInputFiles({
      name: 'scene.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(scene)),
    })

    await expect(page.getByTestId('playground-instance-inst-1')).toBeVisible()
    await waitForInstanceReady(page, 'inst-1')
  })

  test('rejects scene files with unknown models without changing the scene', async ({
    page,
  }) => {
    await openPlayground(page)
    await addBoxInstance(page)
    await waitForInstanceReady(page, 'inst-1')

    const scene = {
      schemaVersion: 1,
      kind: 'shape-shortcut/scene',
      grid: { system: 'opengrid' },
      instances: [
        {
          modelId: 'not-a-model',
          parameters: {},
        },
      ],
    }
    await page.getByTestId('playground-import-input').setInputFiles({
      name: 'bad-scene.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(scene)),
    })

    await expect(page.getByTestId('playground-diagnostic')).toBeVisible()
    await expect(page.getByTestId('playground-instance-inst-1')).toBeVisible()
    await expect(page.getByTestId('playground-instance-inst-2')).toHaveCount(0)
  })

  test('delivers proxies to identical instances added in quick succession', async ({
    page,
  }) => {
    await openPlayground(page)
    await addBoxInstance(page)
    await addBoxInstance(page)

    // Both instances share one cache key; the first completed generation
    // must reach both without a second worker run.
    await waitForInstanceReady(page, 'inst-1')
    await waitForInstanceReady(page, 'inst-2')
  })

  test('marks the selected instance on the viewport', async ({ page }) => {
    await openPlayground(page)
    await addBoxInstance(page)
    await waitForInstanceReady(page, 'inst-1')
    await addBoxInstance(page)

    await page.getByTestId('playground-instance-inst-2').click()
    await expect(
      page
        .getByTestId('playground-viewport')
        .and(page.locator('[data-selected-instance="inst-2"]')),
    ).toBeVisible()
  })

  test('round-trips an exported scene back into the playground', async ({
    page,
  }) => {
    await openPlayground(page)
    await addBoxInstance(page)
    await waitForInstanceReady(page, 'inst-1')

    await page.locator('#playground-cell-x').fill('4')
    await page.locator('#playground-cell-x').blur()
    await page.locator('#playground-label').fill('測試片')

    const sceneDownload = page.waitForEvent('download')
    await page.getByTestId('playground-export-scene').click()
    const sceneFile = await sceneDownload
    const sceneText = readFileSync((await sceneFile.path())!, 'utf-8')

    await page.getByTestId('playground-import-input').setInputFiles({
      name: 'round-trip.json',
      mimeType: 'application/json',
      buffer: Buffer.from(sceneText),
    })

    const importedInstance = page.locator(
      '[data-testid^="playground-instance-inst"]',
    )
    await expect(importedInstance).toHaveCount(1)
    await expect(importedInstance.first()).toHaveAttribute(
      'data-state',
      'ready',
      { timeout: 120_000 },
    )
    await expect(page.locator('#playground-cell-x')).toHaveValue('4')
    await expect(page.locator('#playground-label')).toHaveValue('測試片')
  })
})

const localizedCameraResetLabels: ReadonlyArray<{
  locale: Locale
  label: string
}> = [
  { locale: 'zh-Hant', label: '恢復視角' },
  { locale: 'en', label: 'Reset view' },
]

for (const { locale, label } of localizedCameraResetLabels) {
  test(`loads the initialized playground viewport in ${locale}`, async ({
    page,
  }) => {
    await page.goto(localizedPathFor(locale, '/cad/playground'))

    await expect(page.getByTestId('playground-viewport')).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.getByRole('button', { name: label, exact: true }),
    ).toBeVisible()
  })
}

test('switches the scene between desktop and wall orientations', async ({
  page,
}) => {
  await openPlayground(page)
  // The board belongs to both systems, so it survives the mode switch.
  await page.getByTestId('playground-add-model').selectOption('opengrid')
  await page.getByTestId('playground-add').click()
  await waitForInstanceReady(page, 'inst-1')

  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-view-mode',
    'desktop',
  )

  await page.getByTestId('playground-mode-wall').click()
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-view-mode',
    'wall',
  )
  await expect(page.getByTestId('playground-instance-inst-1')).toHaveAttribute(
    'data-state',
    'ready',
  )

  await page.getByTestId('playground-mode-desktop').click()
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-view-mode',
    'desktop',
  )
})

test('orbit dragging keeps the selection; clicking empty space clears it', async ({
  page,
}) => {
  await openPlayground(page)
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-1')

  const viewport = page.getByTestId('playground-viewport')
  const box = (await viewport.boundingBox())!
  const placementBeforeOrbit = await readSelectedPlacement(page)

  // Drag = orbit: the selection must survive the view manipulation.
  await page.mouse.move(box.x + 32, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 172, box.y + box.height / 2 + 80, { steps: 6 })
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('data-selected-instance', 'inst-1')
  expect(await readSelectedPlacement(page)).toEqual(placementBeforeOrbit)

  // Plain click on empty space clears the selection.
  await page.mouse.click(box.x + 24, box.y + 24)
  await expect(viewport).toHaveAttribute('data-selected-instance', '')
})

test('window focus/blur does not reset the scene or selection', async ({
  page,
}) => {
  await openPlayground(page)
  await page.getByTestId('playground-add-model').selectOption('opengrid')
  await page.getByTestId('playground-add').click()
  await waitForInstanceReady(page, 'inst-1')
  await page.getByTestId('playground-mode-wall').click()
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-view-mode',
    'wall',
  )

  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('focus'))
  })
  await page.waitForTimeout(500)

  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-view-mode',
    'wall',
  )
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-selected-instance',
    'inst-1',
  )
  await expect(page.getByTestId('playground-instance-inst-1')).toHaveAttribute(
    'data-state',
    'ready',
  )
})

test('persists the camera pose per orientation and can reset it', async ({
  page,
}) => {
  await openPlayground(page)
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-1')

  const viewport = page.getByTestId('playground-viewport')
  await expect(viewport).toHaveAttribute('data-camera-pose', 'default')

  // Orbit: the pose becomes custom, survives a reload, and is restored.
  const box = (await viewport.boundingBox())!
  await page.mouse.move(box.x + 32, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 192, box.y + 60, {
    steps: 6,
  })
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('data-camera-pose', 'custom')
  await expect(viewport).toHaveAttribute('data-camera-settled', 'true')
  const settledPosition = await viewport.getAttribute('data-camera-position')
  const settledTarget = await viewport.getAttribute('data-camera-target')
  expect(settledPosition).toBeTruthy()
  expect(settledTarget).toBeTruthy()

  await page.reload()
  await openPlayground(page)
  await expect(viewport).toHaveAttribute('data-camera-pose', 'custom')
  await expect(viewport).toHaveAttribute('data-camera-settled', 'true')
  expectSerializedVectorCloseTo(
    await viewport.getAttribute('data-camera-position'),
    settledPosition,
  )
  expectSerializedVectorCloseTo(
    await viewport.getAttribute('data-camera-target'),
    settledTarget,
  )

  // Reset during active damping clears its remaining motion before applying
  // the default, so the reset pose stays fixed.
  const reloadedBox = (await viewport.boundingBox())!
  await page.mouse.move(
    reloadedBox.x + 32,
    reloadedBox.y + reloadedBox.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    reloadedBox.x + 192,
    reloadedBox.y + reloadedBox.height / 2 + 60,
    { steps: 6 },
  )
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('data-camera-settled', 'false')

  // Reset view restores the grid-fitting default pose.
  await page.getByTestId('playground-camera-reset').click()
  await expect(viewport).toHaveAttribute('data-camera-pose', 'default')
  await expect(viewport).toHaveAttribute('data-camera-settled', 'true')
  const resetPosition = await viewport.getAttribute('data-camera-position')
  const resetTarget = await viewport.getAttribute('data-camera-target')
  await page.waitForTimeout(300)
  await expect(viewport).toHaveAttribute('data-camera-position', resetPosition!)
  await expect(viewport).toHaveAttribute('data-camera-target', resetTarget!)

  await page.reload()
  await openPlayground(page)
  await expect(viewport).toHaveAttribute('data-camera-pose', 'default')
})

test('drags a ready instance on the desktop grid without moving the camera', async ({
  page,
}) => {
  await useCompactPlaygroundGrid(page)
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-1')

  const viewport = page.getByTestId('playground-viewport')
  const start = await findInstancePoint(page, 'inst-1')
  const beforePlacement = await readSelectedPlacement(page)
  const beforeCamera = await viewport.getAttribute('data-camera-position')

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await expect(viewport).toHaveAttribute('data-pointer-instance', 'inst-1')
  await page.mouse.move(start.x + 96, start.y, { steps: 8 })
  await expect(viewport).toHaveAttribute('data-drag-instance', 'inst-1')
  await expect(viewport).toHaveAttribute('data-drag-valid', 'true')
  await expect(viewport).toHaveCSS('cursor', 'grabbing')
  await expect(page.getByTestId('playground-instance-inst-1')).toHaveAttribute(
    'data-state',
    'ready',
  )
  await page.mouse.up()

  const afterPlacement = await readSelectedPlacement(page)
  expect(afterPlacement).not.toEqual(beforePlacement)
  await expect(page.getByTestId('playground-instance-inst-1')).toHaveAttribute(
    'data-state',
    'ready',
  )
  await expect(viewport).toHaveAttribute('data-camera-pose', 'default')
  expectSerializedVectorCloseTo(
    await viewport.getAttribute('data-camera-position'),
    beforeCamera,
  )
  await expect(viewport).toHaveAttribute('data-drag-instance', '')
})

test('keeps updating an active drag after the pointer returns inside the activation threshold', async ({
  page,
}) => {
  await useCompactPlaygroundGrid(page)
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-1')

  const viewport = page.getByTestId('playground-viewport')
  const start = await findInstancePoint(page, 'inst-1')
  const original = await readSelectedPlacement(page)

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 96, start.y, { steps: 8 })
  await expect(viewport).toHaveAttribute('data-drag-instance', 'inst-1')
  await expect(viewport).not.toHaveAttribute(
    'data-drag-cell',
    `${original.cellX},${original.cellY}`,
  )

  await page.mouse.move(start.x, start.y)
  await expect(viewport).toHaveAttribute(
    'data-drag-cell',
    `${original.cellX},${original.cellY}`,
  )
  await page.mouse.up()

  expect(await readSelectedPlacement(page)).toEqual(original)
})

test('freezes residual camera damping before an instance drag starts', async ({
  page,
}) => {
  await useCompactPlaygroundGrid(page)
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-1')

  const viewport = page.getByTestId('playground-viewport')
  const instancePoint = await findInstancePoint(page, 'inst-1')
  const viewportBox = (await viewport.boundingBox())!
  await page.mouse.move(
    viewportBox.x + 24,
    viewportBox.y + viewportBox.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    viewportBox.x + 210,
    viewportBox.y + viewportBox.height / 2 + 80,
    { steps: 2 },
  )
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('data-camera-pose', 'custom')
  await expect(viewport).toHaveAttribute('data-camera-settled', 'false')

  await page.mouse.move(instancePoint.x, instancePoint.y)
  await page.mouse.down()
  await expect(viewport).toHaveAttribute('data-pointer-instance', 'inst-1')
  const cameraAtDragStart = await viewport.getAttribute('data-camera-position')
  await page.waitForTimeout(100)
  await page.mouse.move(instancePoint.x + 96, instancePoint.y, { steps: 8 })

  expectSerializedVectorCloseTo(
    await viewport.getAttribute('data-camera-position'),
    cameraAtDragStart,
  )
  await expect(viewport).toHaveAttribute('data-camera-pose', 'custom')
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('data-camera-pose', 'custom')
})

test('keeps a dragged pending placeholder at its committed placement when its proxy becomes ready', async ({
  page,
}) => {
  let releaseWasm!: () => void
  const wasmGate = new Promise<void>((resolve) => {
    releaseWasm = resolve
  })
  await page.route('**/replicad_single.wasm', async (route) => {
    await wasmGate
    await route.continue()
  })
  await page.addInitScript(() => {
    localStorage.setItem(
      'shape-shortcut:playground-grid:v1',
      JSON.stringify({ x: 8, y: 8 }),
    )
  })

  try {
    await openPlayground(page)
    await addBoxInstance(page)
    await expect(
      page.getByTestId('playground-instance-inst-1'),
    ).toHaveAttribute('data-state', 'pending')

    const viewport = page.getByTestId('playground-viewport')
    const start = await findInstancePoint(page, 'inst-1')
    const before = await readSelectedPlacement(page)

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 96, start.y, { steps: 8 })
    await expect(viewport).toHaveAttribute('data-drag-instance', 'inst-1')
    await page.mouse.up()

    const committed = await readSelectedPlacement(page)
    expect(committed).not.toEqual(before)
    releaseWasm()
    await waitForInstanceReady(page, 'inst-1')
    expect(await readSelectedPlacement(page)).toEqual(committed)
  } finally {
    releaseWasm()
  }
})

test('selects an instance on tap and cancels a preview when orientation changes', async ({
  page,
}) => {
  await useCompactPlaygroundGrid(page)
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-1')
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-2')

  const viewport = page.getByTestId('playground-viewport')
  await page.getByTestId('playground-instance-inst-1').click()
  const firstPlacement = await readSelectedPlacement(page)
  await page.getByTestId('playground-instance-inst-2').click()
  const firstPoint = await findInstancePoint(page, 'inst-1')
  const beforeCamera = await viewport.getAttribute('data-camera-position')

  await page.mouse.move(firstPoint.x, firstPoint.y)
  await page.mouse.down()
  await page.mouse.up()

  await expect(viewport).toHaveAttribute('data-selected-instance', 'inst-1')
  expect(await readSelectedPlacement(page)).toEqual(firstPlacement)
  await expect(viewport).toHaveAttribute('data-camera-pose', 'default')
  expectSerializedVectorCloseTo(
    await viewport.getAttribute('data-camera-position'),
    beforeCamera,
  )
  const originalPlacement = await readSelectedPlacement(page)

  await page.mouse.move(firstPoint.x, firstPoint.y)
  await page.mouse.down()
  await page.mouse.move(firstPoint.x + 96, firstPoint.y, { steps: 8 })
  await expect(viewport).toHaveAttribute('data-drag-instance', 'inst-1')
  await page.getByTestId('playground-mode-wall').dispatchEvent('click')

  await expect(viewport).toHaveAttribute('data-view-mode', 'wall')
  await expect(viewport).toHaveAttribute('data-drag-instance', '')
  await page.mouse.up()
  await page.getByTestId('playground-mode-desktop').click()
  await page.getByTestId('playground-instance-inst-1').click()
  expect(await readSelectedPlacement(page)).toEqual(originalPlacement)
})

test('maps wall dragging to cell X and cell Y while preserving the mount', async ({
  page,
}) => {
  await useCompactPlaygroundGrid(page)
  await page.getByTestId('playground-mode-wall').click()
  await page.getByTestId('playground-add-model').selectOption('opengrid')
  await page.getByTestId('playground-add').click()
  await waitForInstanceReady(page, 'inst-1')

  const viewport = page.getByTestId('playground-viewport')
  const rotation = page.locator('#playground-rotation')
  await rotation.selectOption('90')
  const start = await findInstancePoint(page, 'inst-1')
  const before = await readSelectedPlacement(page)
  const rotationBeforeDrag = await rotation.inputValue()

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 90, start.y - 70, { steps: 8 })
  await expect(viewport).toHaveAttribute('data-drag-instance', 'inst-1')
  await page.mouse.up()

  const after = await readSelectedPlacement(page)
  expect(after.cellX).not.toBe(before.cellX)
  expect(after.cellY).not.toBe(before.cellY)
  await expect(rotation).toHaveValue(rotationBeforeDrag)
  await expect(viewport).toHaveAttribute('data-view-mode', 'wall')
})

test('previews an overlapping drag as invalid and restores the original placement', async ({
  page,
}) => {
  await useCompactPlaygroundGrid(page)
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-1')
  await addBoxInstance(page)
  await waitForInstanceReady(page, 'inst-2')

  await page.getByTestId('playground-instance-inst-2').click()
  const original = await readSelectedPlacement(page)
  const firstPoint = await findInstancePoint(page, 'inst-1')
  const secondPoint = await findInstancePoint(page, 'inst-2')
  const viewport = page.getByTestId('playground-viewport')

  await page.mouse.move(secondPoint.x, secondPoint.y)
  await page.mouse.down()
  await page.mouse.move(firstPoint.x, firstPoint.y, { steps: 8 })
  await moveActiveDragToCell(page, firstPoint, 0, 0)
  await expect(viewport).toHaveAttribute('data-drag-valid', 'false')
  await expect(viewport).toHaveCSS('cursor', 'not-allowed')
  expect(await readSelectedPlacement(page)).toEqual(original)
  await expect(page.getByTestId('playground-diagnostic')).toHaveCount(0)
  await page.mouse.up()

  expect(await readSelectedPlacement(page)).toEqual(original)
  await expect(page.getByTestId('playground-diagnostic')).toBeVisible()
})

test('refits only the default wall camera when framing inputs change', async ({
  page,
}) => {
  await openPlayground(page)
  await page.getByTestId('playground-mode-wall').click()

  const viewport = page.getByTestId('playground-viewport')
  await expect(viewport).toHaveAttribute('data-camera-target', '0,0,0')
  await viewport.click({ position: { x: 20, y: 20 } })
  await expect(viewport).toHaveAttribute('data-camera-pose', 'default')
  const initialPosition = await viewport.getAttribute('data-camera-position')
  expect(initialPosition).toBeTruthy()

  await page.setViewportSize({ width: 600, height: 1000 })
  await expect(viewport).not.toHaveAttribute(
    'data-camera-position',
    initialPosition!,
  )
  const aspectRefitPosition = await viewport.getAttribute(
    'data-camera-position',
  )
  expect(aspectRefitPosition).toBeTruthy()

  const gridY = page.getByTestId('playground-grid-size-y')
  await gridY.fill('80')
  await gridY.blur()
  await expect(viewport).toHaveAttribute('data-grid-size', '50x80')
  await expect(viewport).not.toHaveAttribute(
    'data-camera-position',
    aspectRefitPosition!,
  )

  const box = (await viewport.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + 50, {
    steps: 6,
  })
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('data-camera-pose', 'custom')
  await expect(viewport).toHaveAttribute('data-camera-settled', 'true')
  const customPosition = await viewport.getAttribute('data-camera-position')
  const customTarget = await viewport.getAttribute('data-camera-target')
  expect(customPosition).toBeTruthy()
  expect(customTarget).toBeTruthy()

  await gridY.fill('90')
  await gridY.blur()
  await expect(viewport).toHaveAttribute('data-grid-size', '50x90')
  await expect(viewport).toHaveAttribute(
    'data-camera-position',
    customPosition!,
  )
  await expect(viewport).toHaveAttribute('data-camera-target', customTarget!)

  await page.setViewportSize({ width: 900, height: 700 })
  await expect(viewport).toHaveAttribute(
    'data-camera-position',
    customPosition!,
  )
  await expect(viewport).toHaveAttribute('data-camera-target', customTarget!)
})

test('remembers the scene grid size across reloads', async ({ page }) => {
  await openPlayground(page)
  const gridX = page.getByTestId('playground-grid-size-x')
  const gridY = page.getByTestId('playground-grid-size-y')
  await expect(gridX).toHaveValue('50')
  await expect(gridY).toHaveValue('50')

  await gridX.fill('40')
  await gridX.blur()
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-grid-size',
    '40x50',
  )

  await gridY.fill('30')
  await gridY.blur()
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-grid-size',
    '40x30',
  )

  // Values below the minimum clamp to 1 cell.
  await gridX.fill('0')
  await gridX.blur()
  await expect(gridX).toHaveValue('1')
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-grid-size',
    '1x30',
  )

  await page.reload()
  await openPlayground(page)
  await expect(gridX).toHaveValue('1')
  await expect(gridY).toHaveValue('30')
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-grid-size',
    '1x30',
  )
})

test('separates wall and desk systems by orientation', async ({ page }) => {
  await openPlayground(page)
  await page.getByTestId('playground-add-model').selectOption('box')
  await page.getByTestId('playground-add').click()
  await waitForInstanceReady(page, 'inst-1')

  // Desktop mode: desk-system components are offered and render.
  await expect(page.getByTestId('playground-instance-inst-1')).toBeVisible()

  // Wall mode: desk-only instances disappear from the scene and the
  // wall-system components become available.
  await page.getByTestId('playground-mode-wall').click()
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-view-mode',
    'wall',
  )
  await expect(page.getByTestId('playground-instance-inst-1')).toHaveCount(0)

  await page
    .getByTestId('playground-add-model')
    .selectOption('opengrid-openconnect-tissue-box')
  await page.getByTestId('playground-add').click()
  await waitForInstanceReady(page, 'inst-2')
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-view-mode',
    'wall',
  )

  // Back to desktop: the wall piece hides and the desk piece returns.
  await page.getByTestId('playground-mode-desktop').click()
  await expect(page.getByTestId('playground-instance-inst-1')).toBeVisible()
  await expect(page.getByTestId('playground-instance-inst-2')).toHaveCount(0)
})
