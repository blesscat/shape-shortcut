import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  cadPathForModel,
  groupModelDefinitions,
  modelSelectionLabelFor,
} from '../../src/features/cad/model-catalog'
import { CAD_VIEWPORT_THEME_FALLBACK } from '../../src/features/cad/viewport/theme'
import { translate } from '../../src/i18n'
import { localizedCadPathFor } from '../../src/i18n/routes'
import { waitForCadReady } from './helpers'

const PREVIEW_WIDTH = 640
const PREVIEW_HEIGHT = 400
const WEBP_QUALITY = 0.9
/**
 * Mirrors the dark `--color-viewport` token in global.css. The capture
 * workflow reads the live theme from the page, so this assertion fails
 * loudly if the CSS token drifts from the value the previews were built on.
 */
/* Must match the dark --color-viewport token in src/styles/global.css. */
const DARK_PREVIEW_BACKGROUND = '#060e20'
const CAPTURE_MODEL_PREVIEWS = process.env.CAPTURE_MODEL_PREVIEWS === '1'
const MODEL_PREVIEW_ID = process.env.MODEL_PREVIEW_ID
const PREVIEW_DIRECTORY = path.resolve(process.cwd(), 'public/model-previews')
const VISIBLE_MODEL_DEFINITIONS = groupModelDefinitions()
  .flatMap((group) => group.definitions)
  .filter(
    (definition) => !MODEL_PREVIEW_ID || definition.id === MODEL_PREVIEW_ID,
  )

const APPEARANCES = [
  { key: 'light', backgroundColor: CAD_VIEWPORT_THEME_FALLBACK.background },
  { key: 'dark', backgroundColor: DARK_PREVIEW_BACKGROUND },
] as const

type AppearanceKey = (typeof APPEARANCES)[number]['key']

function entryKey(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
): string {
  return `${definition.id}-${definition.systemContext ?? 'legacy'}`
}

function previewRoute(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
  appearance: AppearanceKey,
): string {
  const route = cadPathForModel(definition.id, definition.systemContext)
  const appearanceQuery = appearance === 'dark' ? '&appearance=dark' : ''
  return `${route}${route.includes('?') ? '&' : '?'}preview=thumbnail${appearanceQuery}`
}

function previewSrcFor(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
  appearance: AppearanceKey,
): string {
  const preview = definition.previewImage
  if (!preview)
    throw new Error(`PREVIEW_METADATA_MISSING:${entryKey(definition)}`)
  return appearance === 'dark' ? preview.darkSrc : preview.src
}

function previewAssetPath(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
  appearance: AppearanceKey,
) {
  return path.resolve(
    process.cwd(),
    'public',
    previewSrcFor(definition, appearance).slice(1),
  )
}

function readWebpDimensions(filePath: string): {
  width: number
  height: number
} {
  const payload = readFileSync(filePath)
  const riffSignature = Buffer.from('RIFF')
  const webpSignature = Buffer.from('WEBP')
  if (
    !payload.subarray(0, 4).equals(riffSignature) ||
    !payload.subarray(8, 12).equals(webpSignature)
  ) {
    throw new Error(`PREVIEW_NOT_WEBP:${filePath}`)
  }
  const chunkFourcc = payload.subarray(12, 16).toString('ascii')
  if (chunkFourcc === 'VP8X') {
    return {
      width: payload.readUIntLE(24, 3) + 1,
      height: payload.readUIntLE(27, 3) + 1,
    }
  }
  if (chunkFourcc === 'VP8 ') {
    const frameTag = payload.subarray(20, 23)
    const syncBytes = payload.subarray(23, 26)
    if (
      (frameTag[2]! & 0x01) !== 0 ||
      !syncBytes.equals(Buffer.from([0x9d, 0x01, 0x2a]))
    ) {
      throw new Error(`PREVIEW_MALFORMED_WEBP:${filePath}`)
    }
    return {
      width: payload.readUInt16LE(26) & 0x3fff,
      height: payload.readUInt16LE(28) & 0x3fff,
    }
  }
  if (chunkFourcc === 'VP8L') {
    if (payload[20] !== 0x2f) {
      throw new Error(`PREVIEW_MALFORMED_WEBP:${filePath}`)
    }
    const bits = payload.readUInt32LE(21)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }
  throw new Error(`PREVIEW_UNSUPPORTED_WEBP:${filePath}:${chunkFourcc}`)
}

function rgbaForHexColor(color: string): [number, number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (!match) throw new Error(`PREVIEW_COLOR_NOT_HEX:${color}`)
  return [
    Number.parseInt(match[1]!, 16),
    Number.parseInt(match[2]!, 16),
    Number.parseInt(match[3]!, 16),
    255,
  ]
}

async function sampleCanvasBackground(
  page: Page,
  canvas: Locator,
): Promise<number[]> {
  const screenshot = await canvas.screenshot()
  const encoded = screenshot.toString('base64')
  return page.evaluate(async (encodedScreenshot) => {
    const response = await fetch(`data:image/png;base64,${encodedScreenshot}`)
    const bitmap = await createImageBitmap(await response.blob())
    const output = document.createElement('canvas')
    output.width = bitmap.width
    output.height = bitmap.height
    const context = output.getContext('2d')
    if (!context) throw new Error('PREVIEW_CANVAS_CONTEXT_UNAVAILABLE')

    context.drawImage(bitmap, 0, 0)
    const sampleX = Math.floor(bitmap.width * 0.1)
    const sampleY = Math.floor(bitmap.height * 0.1)
    const color = Array.from(context.getImageData(sampleX, sampleY, 1, 1).data)
    bitmap.close()
    return color
  }, encoded)
}

async function resizeScreenshot(
  page: Page,
  screenshot: Buffer,
  backgroundColor: string,
): Promise<Buffer> {
  const encoded = screenshot.toString('base64')
  const resized = await page.evaluate(
    async ({ encodedScreenshot, width, height, backgroundColor, quality }) => {
      const response = await fetch(`data:image/png;base64,${encodedScreenshot}`)
      const bitmap = await createImageBitmap(await response.blob())
      const output = document.createElement('canvas')
      output.width = width
      output.height = height
      const context = output.getContext('2d')
      if (!context) throw new Error('PREVIEW_CANVAS_CONTEXT_UNAVAILABLE')

      context.fillStyle = backgroundColor
      context.fillRect(0, 0, width, height)
      const scale = Math.min(width / bitmap.width, height / bitmap.height)
      const drawWidth = bitmap.width * scale
      const drawHeight = bitmap.height * scale
      context.drawImage(
        bitmap,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      )
      bitmap.close()
      return output
        .toDataURL('image/webp', quality)
        .slice('data:image/webp;base64,'.length)
    },
    {
      encodedScreenshot: encoded,
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      backgroundColor,
      quality: WEBP_QUALITY,
    },
  )
  return Buffer.from(resized, 'base64')
}

async function capturePreview(
  page: Page,
  canvas: Locator,
  filePath: string,
  backgroundColor: string,
): Promise<void> {
  mkdirSync(PREVIEW_DIRECTORY, { recursive: true })
  const screenshot = await canvas.screenshot()
  writeFileSync(
    filePath,
    await resizeScreenshot(page, screenshot, backgroundColor),
  )
}

function assertPreviewAsset(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
  appearance: AppearanceKey,
) {
  const preview = definition.previewImage
  if (!preview)
    throw new Error(`PREVIEW_METADATA_MISSING:${entryKey(definition)}`)
  const filePath = previewAssetPath(definition, appearance)
  expect(
    existsSync(filePath),
    `Missing ${appearance} preview for ${entryKey(definition)}`,
  ).toBe(true)
  expect(readWebpDimensions(filePath)).toEqual({
    width: preview.width,
    height: preview.height,
  })
  expect({ width: preview.width, height: preview.height }).toEqual({
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
  })
}

test.describe.configure({ mode: 'serial' })

test('visible model previews are captured from ready generators', async ({
  page,
}) => {
  test.setTimeout(480_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  for (const definition of VISIBLE_MODEL_DEFINITIONS) {
    for (const appearance of APPEARANCES) {
      await page.emulateMedia({
        colorScheme: appearance.key === 'dark' ? 'dark' : 'light',
      })
      await page.goto('/models')
      await page.evaluate(() => localStorage.clear())
      await page.goto(previewRoute(definition, appearance.key))

      await expect(page.getByTestId('cad-viewport')).toHaveAttribute(
        'data-presentation',
        'thumbnail',
      )
      await waitForCadReady(page)
      await page.waitForTimeout(300)
      const canvas = page.getByTestId('cad-viewport').locator('canvas')
      await expect(canvas).toBeVisible()
      await expect(sampleCanvasBackground(page, canvas)).resolves.toEqual(
        rgbaForHexColor(appearance.backgroundColor),
      )

      const filePath = previewAssetPath(definition, appearance.key)
      if (CAPTURE_MODEL_PREVIEWS) {
        await capturePreview(page, canvas, filePath, appearance.backgroundColor)
      }
      assertPreviewAsset(definition, appearance.key)
    }
  }
})

test('model cards expose static previews and preserve selection on image failure', async ({
  page,
}) => {
  await page.route('**/model-previews/opengrid-desk.webp', (route) =>
    route.abort(),
  )
  await page.goto('/models')
  const locale = 'zh-Hant' as const

  for (const definition of VISIBLE_MODEL_DEFINITIONS) {
    const preview = definition.previewImage
    if (!preview)
      throw new Error(`PREVIEW_METADATA_MISSING:${entryKey(definition)}`)

    const card = page.locator(`[data-entry-key="${entryKey(definition)}"]`)
    const lightImage = card.locator('img').first()
    const darkImage = card.locator('img').nth(1)
    await expect(lightImage).toHaveAttribute('src', preview.src)
    await expect(darkImage).toHaveAttribute('src', preview.darkSrc)
    await expect(lightImage).toHaveAttribute(
      'alt',
      translate(locale, preview.alt),
    )
    await expect(darkImage).toHaveAttribute('alt', '')
    await expect(
      card.getByRole('link', {
        name: `編輯 ${translate(locale, modelSelectionLabelFor(definition))}`,
      }),
    ).toHaveAttribute(
      'href',
      localizedCadPathFor(locale, definition.id, definition.systemContext),
    )
  }

  const failedPreviewCard = page.locator('[data-entry-key="opengrid-desk"]')
  await expect(
    failedPreviewCard.getByTestId('model-preview-fallback'),
  ).toBeVisible()
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})
