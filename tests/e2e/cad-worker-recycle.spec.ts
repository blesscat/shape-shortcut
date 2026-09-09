import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { PROTOTYPE_CONFIGURATION } from '../../src/cad-contract/units'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

type WorkerRecord = {
  id: number
  kind: string
  at: number
  generation?: number
  epoch?: string
  parameters?: Record<string, unknown>
}

type ObservedWindow = Window & { workerRecords: WorkerRecord[] }

async function observeWorkers(page: Page) {
  await page.addInitScript(() => {
    const records: WorkerRecord[] = []
    ;(window as unknown as ObservedWindow).workerRecords = records
    const NativeWorker = window.Worker
    let nextId = 0
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        const id = ++nextId
        const record = (kind: string, data: Partial<WorkerRecord> = {}) => {
          records.push({ id, kind, at: performance.now(), ...data })
        }
        record('created')
        this.addEventListener('message', ({ data }) => {
          // Retain only metadata; keeping transferred meshes would distort memory measurements.
          record(data.kind, {
            generation: data.generation,
            epoch: data.workerEpoch,
          })
        })
        const send = this.postMessage.bind(this)
        this.postMessage = (
          data,
          transferOrOptions: Transferable[] | StructuredSerializeOptions = [],
        ) => {
          record(`send:${data.kind}`, {
            generation: data.generation,
            parameters: data.parameters,
          })
          if (Array.isArray(transferOrOptions)) send(data, transferOrOptions)
          else send(data, transferOrOptions)
        }
        const terminate = this.terminate.bind(this)
        this.terminate = () => {
          record('terminated')
          terminate()
        }
      }
    }
  })
}

async function records(page: Page) {
  return page.evaluate(
    () => (window as unknown as ObservedWindow).workerRecords,
  )
}

test('settled inputs recycle the real Worker and preserve the committed preview', async ({
  page,
  browserName,
}, testInfo) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await observeWorkers(page)
  await page.goto('/cad/box')
  await waitForCadReady(page)
  const width = page.getByRole('textbox', { name: /寬度/ })
  // Hold replacement initialization long enough to inspect the stale preview.
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/replicad_single.wasm', async (route) => {
    await held
    await route.continue()
  })
  try {
    await width.fill('24')
    await width.fill('25')
    await width.fill('26')
    await expect
      .poll(
        async () =>
          (await records(page)).filter((r) => r.kind === 'created').length,
      )
      .toBe(2)
    await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
    await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
  } finally {
    release()
  }
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 26 mm')).toBeVisible()
  await page.unroute('**/replicad_single.wasm')
  await width.fill('27')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 27 mm')).toBeVisible()
  const history = await records(page)
  const created = history.filter((r) => r.kind === 'created')
  expect(created).toHaveLength(3)
  for (let i = 1; i < created.length; i++) {
    const terminatedIndex = history.findIndex(
      (r) => r.id === created[i - 1].id && r.kind === 'terminated',
    )
    expect(terminatedIndex).toBeGreaterThan(-1)
    expect(terminatedIndex).toBeLessThan(history.indexOf(created[i]))
  }
  for (const worker of created) {
    expect(
      history.filter(
        (r) => r.id === worker.id && r.kind === 'send:model.generate',
      ),
    ).toHaveLength(1)
  }
  expect(
    new Set(
      history.filter((r) => r.kind === 'engine.ready').map((r) => r.epoch),
    ).size,
  ).toBe(3)
  await width.fill('')
  await expect(width).toHaveAttribute('aria-invalid', 'true')
  await page.waitForTimeout(PROTOTYPE_CONFIGURATION.inputDebounceMs + 100)
  const invalidHistory = await records(page)
  expect(invalidHistory.filter((r) => r.kind === 'created')).toHaveLength(3)
  expect(
    invalidHistory.filter((r) => r.kind === 'send:model.invalidate'),
  ).toHaveLength(1)
  await expect(page.getByLabel('寬度 X 27 mm')).toBeVisible()
  await width.fill('28')
  await waitForCadReady(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('box-28x30x40.step')
  await testInfo.attach('worker-lifecycle.json', {
    body: JSON.stringify(await records(page), null, 2),
    contentType: 'application/json',
  })
})

test('consecutive 7x7 h100 honeycomb generations use fresh Workers', async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.skip(
    process.env.CAD_MEMORY_SMOKE !== '1',
    'Opt-in high-memory browser smoke test',
  )
  skipHeadlessFirefoxWithoutWebGL(browserName)
  test.setTimeout(
    PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs * 2 + 120_000,
  )
  await observeWorkers(page)
  await page.goto('/zh-Hant/cad/opengrid-stackable-box')
  await waitForCadReady(page)
  const memory: unknown[] = []
  const browserSession =
    browserName === 'chromium' ? await browser.newBrowserCDPSession() : null
  const pageSession =
    browserName === 'chromium' ? await page.context().newCDPSession(page) : null
  await pageSession?.send('Performance.enable')
  const sample = async () => {
    if (!browserSession || !pageSession) return
    try {
      const { processInfo } = await browserSession.send(
        'SystemInfo.getProcessInfo',
      )
      const rss = execFileSync(
        'ps',
        ['-o', 'pid=,rss=', '-p', processInfo.map((p) => p.id).join(',')],
        { encoding: 'utf8' },
      )
      const { metrics } = await pageSession.send('Performance.getMetrics')
      memory.push({
        at: Date.now(),
        rssKiB: rss,
        pageHeap: metrics.filter((m) => m.name.startsWith('JSHeap')),
      })
    } catch (error) {
      memory.push({ at: Date.now(), error: String(error) })
    }
  }
  await sample()
  const sampling = setInterval(() => {
    void sample()
  }, 5000)
  try {
    for (const axis of ['X', 'Y']) {
      await page.getByRole('slider', { name: axis, exact: true }).fill('7')
    }
    await page.getByRole('textbox', { name: '盒內淨高（Z）' }).fill('100')
    await page
      .getByRole('checkbox', { name: '省料模式（六角鏤空）', exact: true })
      .check()
    await waitForCadReady(
      page,
      PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs + 30_000,
    )
    const first = (await records(page))
      .filter((r) => r.kind === 'model.ready')
      .at(-1)
    await page.getByRole('textbox', { name: '盒內淨高（Z）' }).fill('101')
    await page.getByRole('textbox', { name: '盒內淨高（Z）' }).fill('100')
    await waitForCadReady(
      page,
      PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs + 30_000,
    )
    const second = (await records(page))
      .filter((r) => r.kind === 'model.ready')
      .at(-1)
    expect(second?.id).not.toBe(first?.id)
    expect(second?.epoch).not.toBe(first?.epoch)
    await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()
  } finally {
    clearInterval(sampling)
    await sample()
    await testInfo.attach('memory-samples.json', {
      body: JSON.stringify(memory, null, 2),
      contentType: 'application/json',
    })
    await testInfo.attach('memory-smoke-lifecycle.json', {
      body: JSON.stringify(await records(page), null, 2),
      contentType: 'application/json',
    })
  }
})
