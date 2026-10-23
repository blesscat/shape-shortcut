// Test-only layout experiment. Nothing in this file is imported by the site.
// Run: CAD_REVIEW_URL=http://127.0.0.1:3468 node scripts/design-review/mobile-panel-comparison.mjs
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const origin = process.env.CAD_REVIEW_URL ?? 'http://127.0.0.1:3468'
const output =
  process.env.CAD_REVIEW_OUTPUT ?? '/tmp/shape-shortcut-mobile-review'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
const sizes = [
  [360, 640],
  [390, 844],
  [844, 390],
  [760, 720],
  [761, 720],
]
const models = [
  'opengrid-stackable-box',
  'opengrid-openconnect-shelf',
  'playground',
]

for (const locale of ['zh-Hant', 'en']) {
  for (const appearance of ['light', 'dark']) {
    for (const model of models) {
      const context = await browser.newContext({
        colorScheme: appearance,
        viewport: { width: 390, height: 844 },
      })
      const page = await context.newPage()
      try {
        await page.goto(`${origin}/${locale}/cad/${model}/`)
        const isScene = model === 'playground'
        const viewportId = isScene ? 'playground-viewport' : 'cad-viewport'
        const pillId = isScene ? 'playground-sidebar-pill' : 'cad-params-pill'
        const drawerId = isScene
          ? 'playground-sidebar-drawer'
          : 'cad-params-drawer'
        await page.getByTestId(viewportId).waitFor({ timeout: 60000 })
        if (isScene) {
          await page.getByTestId(pillId).click()
          await page
            .getByTestId('playground-add-model')
            .selectOption('opengrid-stackable-box')
          await page.getByTestId('playground-add').click()
          await page.getByTestId('playground-add').click()
          await page.getByTestId(pillId).click()
        }
        for (const [width, height] of sizes) {
          await page.setViewportSize({ width, height })
          const record = {
            locale,
            appearance,
            model,
            width,
            height,
            realDevice: false,
          }
          if (width > 760) {
            record.mode = 'desktop-boundary'
            record.drawerCount = await page.getByTestId(drawerId).count()
            results.push(record)
            continue
          }
          await page.getByTestId(pillId).click()
          const readMetrics = () =>
            page.evaluate(
              ({ viewportId, drawerId }) => {
                const viewport = document.querySelector(
                  `[data-testid="${viewportId}"]`,
                )
                const drawer = document.querySelector(
                  `[data-testid="${drawerId}"]`,
                )
                const v = viewport.getBoundingClientRect()
                const d = drawer.getBoundingClientRect()
                return {
                  viewport: v.toJSON(),
                  drawer: d.toJSON(),
                  unobscuredHeight: Math.max(
                    0,
                    Math.min(v.bottom, d.top, innerHeight) - Math.max(v.top, 0),
                  ),
                  revision: viewport.getAttribute('data-model-revision'),
                  preview: viewport.getAttribute('data-preview-kind'),
                  overflow: document.documentElement.scrollWidth > innerWidth,
                }
              },
              { viewportId, drawerId },
            )
          record.legacy = await readMetrics()
          if (width === 390)
            await page.screenshot({
              path: `${output}/${locale}-${appearance}-${model}-legacy.png`,
            })
          // A CSS/DOM candidate on the real rendered scene; not a production path.
          await page.evaluate(
            ({ viewportId, drawerId }) => {
              const viewport = document.querySelector(
                `[data-testid="${viewportId}"]`,
              )
              const drawer = document.querySelector(
                `[data-testid="${drawerId}"]`,
              )
              const previous = {
                viewport: viewport.getAttribute('style'),
                drawer: drawer.getAttribute('style'),
              }
              const resize = (percent) => {
                const panelHeight = Math.round((innerHeight * percent) / 100)
                const previewHeight = Math.max(
                  80,
                  innerHeight - panelHeight - 64,
                )
                drawer.style.cssText = `position:fixed;bottom:0;height:${panelHeight}px;background:var(--color-panel);z-index:35;`
                viewport.style.cssText = `position:fixed;top:56px;left:8px;width:calc(100vw - 16px);height:${previewHeight}px;z-index:34;`
              }
              const label = document.createElement('label')
              label.textContent = 'Prototype panel height '
              const range = document.createElement('input')
              range.type = 'range'
              range.min = '30'
              range.max = '65'
              range.value = '45'
              range.setAttribute('aria-label', 'Prototype panel height')
              range.dataset.prototypeResize = ''
              range.addEventListener('input', () => resize(Number(range.value)))
              label.append(range)
              drawer.prepend(label)
              resize(45)
              window.removePanelPrototype = () => {
                label.remove()
                for (const [element, style] of [
                  [viewport, previous.viewport],
                  [drawer, previous.drawer],
                ]) {
                  if (style === null) element.removeAttribute('style')
                  else element.setAttribute('style', style)
                }
              }
            },
            { viewportId, drawerId },
          )
          record.candidate = await readMetrics()
          const divider = page.getByRole('slider', {
            name: 'Prototype panel height',
          })
          await divider.focus()
          await divider.press('ArrowRight')
          record.keyboardResize = await divider.inputValue()
          record.afterResize = await readMetrics()
          if (width === 390)
            await page.screenshot({
              path: `${output}/${locale}-${appearance}-${model}-candidate.png`,
            })
          await page.evaluate(() => window.removePanelPrototype())
          await page.getByTestId(pillId).click()
          record.cameraVerified = false
          record.softwareKeyboardVerified = false
          results.push(record)
        }
      } catch (error) {
        results.push({
          locale,
          appearance,
          model,
          error: String(error),
          realDevice: false,
        })
      }
      await context.close()
      await writeFile(
        `${output}/comparison.json`,
        JSON.stringify(results, null, 2),
      )
    }
  }
}
await browser.close()
console.log(
  JSON.stringify({
    cases: results.length,
    errors: results.filter((r) => r.error).length,
    output,
    decision: 'legacy-overlay',
    reason:
      'Real-device keyboard/touch/orientation and camera stability are not proven by this layout prototype.',
  }),
)
