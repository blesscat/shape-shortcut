import { test, expect } from '@playwright/test'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  COMPONENT_PARAMETER_STORAGE_VERSION,
} from '../../src/features/cad/parameters/store'

// Opt-in comparison against an independently served baseline checkout. No
// product feature flag or alternate CAD path is needed for this measurement.
test('records early geometry and full-ready latency against a baseline', async ({
  browser,
}, testInfo) => {
  test.skip(
    process.env.CAD_PREVIEW_BENCHMARK !== '1',
    'Opt-in timing comparison',
  )
  test.setTimeout(600_000)
  const fixtures = [
    {
      modelId: 'opengrid-stackable-box',
      parameters: {
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        honeycombMode: true,
      },
    },
    {
      modelId: 'opengrid-stackable-cylinder',
      parameters: OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    },
    {
      modelId: 'opengrid-organizer-box',
      parameters: OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    },
  ]
  const measurements = []
  for (const fixture of fixtures) {
    for (let sample = 0; sample < 3; sample++) {
      for (const [mode, url] of [
        ['baseline', process.env.CAD_PREVIEW_BASELINE_URL!],
        ['simplified', testInfo.project.use.baseURL!],
      ]) {
        const page = await browser.newPage()
        try {
          await page.addInitScript(
            ({ fixture, key, version }) => {
              localStorage.setItem(
                key,
                JSON.stringify({
                  version,
                  values: { legacy: { [fixture.modelId]: fixture.parameters } },
                }),
              )
              const timing: Record<string, number> = {}
              Object.assign(window, { previewTiming: timing })
              window.addEventListener('cad:viewport-timing', () => {
                if (timing.firstGeometry !== undefined) return
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
                    if (data.kind === 'engine.ready')
                      timing.engineReady = performance.now()
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
              fixture,
              key: COMPONENT_PARAMETER_STORAGE_KEY,
              version: COMPONENT_PARAMETER_STORAGE_VERSION,
            },
          )
          await page.goto(`${url}/zh-Hant/cad/${fixture.modelId}`)
          await expect(
            page.getByRole('button', { name: '下載 STL', exact: true }),
          ).toBeEnabled({ timeout: 180_000 })
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (
                    window as unknown as {
                      previewTiming: Record<string, number>
                    }
                  ).previewTiming.firstGeometry,
              ),
            )
            .toBeGreaterThan(0)
          const timing = await page.evaluate(
            () =>
              (window as unknown as { previewTiming: Record<string, number> })
                .previewTiming,
          )
          expect(timing.requests).toBe(1)
          measurements.push({
            fixture: fixture.modelId,
            parameters: fixture.parameters,
            mode,
            sample,
            ...timing,
            firstGeometryFromWorkerMs:
              timing.firstGeometry - timing.workerCreated,
            fullReadyFromWorkerMs: timing.ready - timing.workerCreated,
            generationMs: timing.ready - timing.generate,
          })
          console.log(JSON.stringify(measurements.at(-1)))
        } finally {
          await page.close()
        }
      }
    }
  }
  await testInfo.attach('preview-timing-comparison.json', {
    body: JSON.stringify({ browser: browser.version(), measurements }, null, 2),
    contentType: 'application/json',
  })
})
