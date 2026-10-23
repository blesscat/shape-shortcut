import { test, expect } from '@playwright/test'
import { modelDefinitions } from '../../src/features/cad/model-catalog'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  COMPONENT_PARAMETER_STORAGE_VERSION,
} from '../../src/features/cad/parameters/store'

// No held requests: an opt-in observation of the normal generation path.
test('records current catalog preview and exact completion latency', async ({
  browser,
}, testInfo) => {
  test.skip(
    process.env.CATALOG_PREVIEW_BENCHMARK !== '1',
    'Opt-in timing observation',
  )
  test.setTimeout(600_000)
  const measurements = []
  for (const modelId of [
    'hsw-cell',
    'opengrid-open-shelf',
    'opengrid-openconnect-tissue-box',
    'opengrid-stackable-box',
  ]) {
    const definition = modelDefinitions.find((d) => d.id === modelId)!
    let parameters = definition.defaultParameters
    if (modelId === 'opengrid-stackable-box')
      parameters = { ...parameters, honeycombMode: true }
    for (let sample = 0; sample < 3; sample++) {
      const page = await browser.newPage()
      try {
        await page.addInitScript(
          ({ modelId, parameters, key, version }) => {
            localStorage.setItem(
              key,
              JSON.stringify({
                version,
                values: { legacy: { [modelId]: parameters } },
              }),
            )
            const timing: Record<string, number> = {}
            Object.assign(window, { catalogPreviewTiming: timing })
            window.addEventListener('cad:viewport-timing', () => {
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  timing.firstGeometry ??= performance.now()
                }),
              )
            })
            const NativeWorker = window.Worker
            window.Worker = class extends NativeWorker {
              constructor(url: string | URL, options?: WorkerOptions) {
                super(url, options)
                timing.workerCreated = performance.now()
                this.addEventListener('message', ({ data }) => {
                  if (data.kind === 'model.ready')
                    timing.ready = performance.now()
                })
                const send = this.postMessage.bind(this)
                this.postMessage = (
                  data,
                  options: Transferable[] | StructuredSerializeOptions = [],
                ) => {
                  if (data.kind === 'model.generate') {
                    timing.generate = performance.now()
                    timing.requests = (timing.requests ?? 0) + 1
                  }
                  if (Array.isArray(options)) send(data, options)
                  else send(data, options)
                }
              }
            }
          },
          {
            modelId,
            parameters,
            key: COMPONENT_PARAMETER_STORAGE_KEY,
            version: COMPONENT_PARAMETER_STORAGE_VERSION,
          },
        )
        await page.goto(`/zh-Hant/cad/${modelId}`)
        await expect(page.getByTestId('cad-viewport')).toHaveAttribute(
          'data-preview-kind',
          'committed',
          { timeout: 180_000 },
        )
        const timing = await page.evaluate(
          () =>
            (
              window as unknown as {
                catalogPreviewTiming: Record<string, number>
              }
            ).catalogPreviewTiming,
        )
        expect(timing.requests).toBe(1)
        expect(timing.firstGeometry).toBeLessThan(timing.ready)
        measurements.push({
          modelId,
          parameters,
          sample,
          ...timing,
          firstGeometryFromWorkerMs:
            timing.firstGeometry - timing.workerCreated,
          fullReadyFromWorkerMs: timing.ready - timing.workerCreated,
        })
      } finally {
        await page.close()
      }
    }
  }
  await testInfo.attach('catalog-preview-timing.json', {
    body: JSON.stringify({ browser: browser.version(), measurements }, null, 2),
    contentType: 'application/json',
  })
})
