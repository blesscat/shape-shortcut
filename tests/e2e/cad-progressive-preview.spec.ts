import { modelDefinitions } from '../../src/features/cad/model-catalog'
import { expect, test, type Page } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

type Observation = {
  messages: { kind: string; at: number }[]
  views: number[][]
}

async function observe(page: Page) {
  await page.addInitScript(() => {
    const observation: Observation = { messages: [], views: [] }
    Object.assign(window, { previewObservation: observation })
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        this.addEventListener('message', ({ data }) => {
          observation.messages.push({ kind: data.kind, at: performance.now() })
        })
        const send = this.postMessage.bind(this)
        this.postMessage = (
          data,
          transferOrOptions: Transferable[] | StructuredSerializeOptions = [],
        ) => {
          observation.messages.push({
            kind: `send:${data.kind}`,
            at: performance.now(),
          })
          if (Array.isArray(transferOrOptions)) send(data, transferOrOptions)
          else send(data, transferOrOptions)
        }
      }
    }
    // Observe actual rendered view matrices, not application implementation state.
    const names = new WeakMap<WebGLUniformLocation, string>()
    const prototype = WebGL2RenderingContext.prototype
    const getLocation = prototype.getUniformLocation
    prototype.getUniformLocation = function (program, name) {
      const location = getLocation.call(this, program, name)
      if (location) names.set(location, name)
      return location
    }
    const setMatrix = prototype.uniformMatrix4fv
    prototype.uniformMatrix4fv = function (
      location,
      transpose,
      data,
      ...offsets
    ) {
      if (location && names.get(location) === 'modelViewMatrix' && data) {
        const matrix = Array.from(data).slice(0, 16)
        if (matrix[12] || matrix[13] || matrix[14]) {
          observation.views.push(matrix)
          if (observation.views.length > 100) observation.views.shift()
        }
      }
      setMatrix.call(this, location, transpose, data, ...offsets)
    }
  })
}

async function history(page: Page): Promise<Observation> {
  return page.evaluate(
    () =>
      (window as unknown as { previewObservation: Observation })
        .previewObservation,
  )
}

for (const model of modelDefinitions.map((definition) => definition.id)) {
  test(`${model} displays an interactive provisional model before WASM and replaces it without a camera reset`, async ({
    page,
    browserName,
  }, testInfo) => {
    skipHeadlessFirefoxWithoutWebGL(browserName)
    test.setTimeout(120_000)
    await observe(page)
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/replicad_single.wasm', async (route) => {
      await held
      await route.continue()
    })
    await page.goto(`/zh-Hant/cad/${model}`)
    const viewport = page.getByTestId('cad-viewport')
    const canvas = viewport.locator('canvas').first()
    let viewBeforeCommit: number[] | undefined
    try {
      await expect(viewport).toHaveAttribute('data-preview-kind', 'simplified')
      await expect(page.getByTestId('cad-simplified-status')).toContainText(
        '完整模型計算中',
      )
      await expect(canvas).toBeVisible()
      await expect(
        page.getByRole('button', {
          name: model === 'opengrid-wall-cover' ? '下載 3MF' : '下載 STL',
          exact: true,
        }),
      ).toBeDisabled()
      expect(
        (await history(page)).messages.some((m) => m.kind === 'model.ready'),
      ).toBe(false)
      await expect
        .poll(async () => (await history(page)).views.length)
        .toBeGreaterThan(0)
      const beforeOrbit = (await history(page)).views.at(-1)
      const rect = (await canvas.boundingBox())!
      await page.mouse.move(
        rect.x + rect.width * 0.5,
        rect.y + rect.height * 0.45,
      )
      await page.mouse.down()
      await page.mouse.move(
        rect.x + rect.width * 0.65,
        rect.y + rect.height * 0.55,
        { steps: 12 },
      )
      await page.mouse.up()
      await page.mouse.wheel(0, -100)
      await expect
        .poll(async () => (await history(page)).views.at(-1))
        .not.toEqual(beforeOrbit)
      await page.screenshot({
        path: testInfo.outputPath(`${model}-simplified.png`),
      })
      // Let damping settle while exact generation is still blocked.
      await page.waitForTimeout(500)
      viewBeforeCommit = (await history(page)).views.at(-1)
      await canvas.evaluate((element) => {
        element.setAttribute('data-original-canvas', 'true')
      })
    } finally {
      release()
    }
    if (model === 'card-box') {
      // The assembly disables downloads, so readiness is the committed
      // preview kind rather than the STEP button.
      await expect(viewport).toHaveAttribute('data-preview-kind', 'committed', {
        timeout: 90_000,
      })
    } else {
      await waitForCadReady(page, 90_000)
    }
    await expect(viewport).toHaveAttribute('data-preview-kind', 'committed')
    await expect(page.getByTestId('cad-simplified-status')).toHaveCount(0)
    await expect(canvas).toHaveAttribute('data-original-canvas', 'true')
    const views = (await history(page)).views
    expect(
      views.some((view) =>
        view.every((v, i) => Math.abs(v - viewBeforeCommit![i]) < 0.001),
      ),
    ).toBe(true)
    expect(
      views.at(-1)!.every((v, i) => Math.abs(v - viewBeforeCommit![i]) < 0.001),
    ).toBe(true)
    await testInfo.attach('preview-worker-timing.json', {
      body: JSON.stringify(await history(page)),
      contentType: 'application/json',
    })
  })
}

test('new inputs update the provisional display and invalid/failing generations stay labeled and cannot export', async ({
  page,
  browserName,
}, testInfo) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await observe(page)
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/replicad_single.wasm', async (route) => {
    await held
    await route.abort()
  })
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')
  const status = page.getByTestId('cad-simplified-status')
  await expect(status).toContainText('完整模型計算中')
  const viewport = page.getByTestId('cad-viewport')
  const initial = await viewport.getAttribute('data-model-revision')
  const height = page.getByRole('textbox', {
    name: '盒內淨高（Z）',
    exact: true,
  })
  await height.fill('80')
  await expect(viewport).not.toHaveAttribute('data-model-revision', initial!)
  const edited = await viewport.getAttribute('data-model-revision')
  await height.fill('')
  await expect(status).toContainText('保留上次有效輸入')
  await expect(viewport).toHaveAttribute('data-model-revision', edited!)
  await height.fill('81')
  await expect(status).toContainText('完整模型計算中')
  release()
  await expect(status).toContainText('模型計算失敗', { timeout: 20_000 })
  await expect(viewport.locator('canvas').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: '下載 STL', exact: true }),
  ).toBeDisabled()
  await page.screenshot({ path: testInfo.outputPath('failed-simplified.png') })
})

test('mobile simplified status remains readable above the progress panel', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.setViewportSize({ width: 390, height: 844 })
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/replicad_single.wasm', async (route) => {
    await held
    await route.abort()
  })
  try {
    await page.goto('/zh-Hant/cad/opengrid-stackable-box')
    const badge = page.getByTestId('cad-simplified-status')
    await expect(badge).toBeVisible()
    await page.getByTestId('cad-viewport').scrollIntoViewIfNeeded()
    await expect(page.getByTestId('cad-progress')).toBeVisible()
    expect(
      await badge.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const top = document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        )
        return element.contains(top)
      }),
    ).toBe(true)
  } finally {
    release()
  }
})

test('exact replacement clears the old face highlight while the pointer stays still', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  test.setTimeout(90_000)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')
  await waitForCadReady(page)
  const input = page.getByRole('textbox', {
    name: '盒內淨高（Z）',
    exact: true,
  })
  await input.focus()
  const canvas = page.getByTestId('cad-viewport').locator('canvas').first()
  const rect = (await canvas.boundingBox())!
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.move(
    rect.x + rect.width / 2 + 4,
    rect.y + rect.height / 2 + 4,
  )
  await expect(page.getByTestId('cad-face-hover-tooltip')).toBeVisible()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('40')
  await expect(page.getByTestId('cad-simplified-status')).toBeVisible()
  await expect(page.getByTestId('cad-face-hover-tooltip')).toBeHidden()
  await waitForCadReady(page)
  await expect(page.getByTestId('cad-face-hover-tooltip')).toBeHidden()
  const stationary = await canvas.screenshot()
  await page.mouse.move(0, 0)
  const pointerAway = await canvas.screenshot()
  expect(stationary.equals(pointerAway)).toBe(true)
})
