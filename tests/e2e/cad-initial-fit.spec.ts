import { expect, test } from '@playwright/test'
import { waitForCadReady } from './helpers'

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 761, height: 720 },
  { width: 390, height: 844 },
]) {
  for (const model of [
    'box',
    'hsw-cell',
    'opengrid',
    'opengrid-openconnect-shelf',
  ]) {
    test(`initial ${model} fits the visible canvas at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await page.goto(`/zh-Hant/cad/${model}`)
      await waitForCadReady(page)
      const png = await page
        .getByTestId('cad-viewport')
        .locator('canvas')
        .screenshot()
      const pixels = await page.evaluate(async (encoded) => {
        const bitmap = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${encoded}`)).blob(),
        )
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext('2d')!
        context.drawImage(bitmap, 0, 0)
        const data = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data
        let modelPixels = 0
        let clippedPixels = 0
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            // Controls and orientation gizmo are UI, not model geometry.
            if (y < 100 && (x < 180 || x > canvas.width - 100)) continue
            const i = (y * canvas.width + x) * 4
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
            if (r > 40 && b > r * 1.3 && g > r * 1.1 && b > g * 1.1) {
              modelPixels++
              if (
                x < 4 ||
                y < 4 ||
                x >= canvas.width - 4 ||
                y >= canvas.height - 4
              )
                clippedPixels++
            }
          }
        }
        return { modelPixels, clippedPixels }
      }, png.toString('base64'))
      expect(pixels.modelPixels).toBeGreaterThan(1000)
      expect(pixels.clippedPixels).toBeLessThan(20)
    })
  }
}
