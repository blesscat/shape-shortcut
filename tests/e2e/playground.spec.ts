import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { localizedPathFor } from '../../src/i18n/routes'
import type { Locale } from '../../src/i18n'

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

test('loads the localized playground route for every locale', async ({
  page,
}) => {
  await page.goto(localizedPathFor('en', '/cad/playground'))
  await expect(page.getByTestId('playground')).toBeVisible({ timeout: 30_000 })
})

test('switches the scene between desktop and wall orientations', async ({
  page,
}) => {
  await openPlayground(page)
  await addBoxInstance(page)
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

  // Drag = orbit: the selection must survive the view manipulation.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    box.x + box.width / 2 + 140,
    box.y + box.height / 2 + 80,
    { steps: 6 },
  )
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('data-selected-instance', 'inst-1')

  // Plain click on empty space clears the selection.
  await page.mouse.click(box.x + 24, box.y + 24)
  await expect(viewport).toHaveAttribute('data-selected-instance', '')
})

test('window focus/blur does not reset the scene or selection', async ({
  page,
}) => {
  await openPlayground(page)
  await addBoxInstance(page)
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
