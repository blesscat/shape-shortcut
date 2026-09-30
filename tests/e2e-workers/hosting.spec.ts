import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { expect, test } from '@playwright/test'

const productionEnv = parseEnv(readFileSync('.env.production', 'utf8'))
const configuredSiteURL =
  process.env.PUBLIC_SITE_URL || productionEnv.PUBLIC_SITE_URL
if (!configuredSiteURL)
  throw new Error('PUBLIC_SITE_URL is required for hosting tests')
const siteOrigin = new URL(configuredSiteURL).origin

const legacyRoutes = [
  ['/', '/zh-Hant/'],
  ['/models', '/zh-Hant/models'],
  ['/models/', '/zh-Hant/models'],
  ['/docs', '/zh-Hant/docs'],
  ['/docs/', '/zh-Hant/docs'],
  ['/about', '/zh-Hant/about/'],
  ['/about/', '/zh-Hant/about/'],
  ['/cad', '/zh-Hant/cad'],
  ['/cad/', '/zh-Hant/cad'],
  ['/cad/opengrid', '/zh-Hant/cad/opengrid'],
]

for (const [source, destination] of legacyRoutes) {
  test(`legacy ${source} uses an HTTP 308 redirect and keeps query parameters`, async ({
    request,
    baseURL,
  }) => {
    const query = '?system=desk&label=a%20b'
    const response = await request.get(source + query, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    const location = new URL(response.headers().location, baseURL)
    expect(location.origin).toBe(new URL(baseURL!).origin)
    expect(location.pathname).toBe(destination)
    expect(location.search).toBe(query)
  })
}

for (const locale of ['zh-Hant', 'en']) {
  test(`${locale} serves static metadata and directory routes`, async ({
    request,
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    for (const path of ['/', '/models/', '/docs/', '/about/', '/cad/box/']) {
      const response = await request.get(`/${locale}${path}`)
      expect(response.status()).toBe(200)
      expect(new URL(response.url()).pathname).toBe(`/${locale}${path}`)
      await page.setContent(await response.text())
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      const canonical = page.locator('link[rel="canonical"]')
      const canonicalURL = new URL((await canonical.getAttribute('href'))!)
      expect(canonicalURL.origin).toBe(siteOrigin)
      expect(canonicalURL.pathname.replace(/\/$/, '')).toBe(
        `/${locale}${path}`.replace(/\/$/, ''),
      )
      for (const alternateLocale of ['zh-Hant', 'en']) {
        const alternate = page.locator(
          `link[rel="alternate"][hreflang="${alternateLocale}"]`,
        )
        const alternateURL = new URL((await alternate.getAttribute('href'))!)
        expect(alternateURL.origin).toBe(siteOrigin)
        expect(alternateURL.pathname.replace(/\/$/, '')).toBe(
          `/${alternateLocale}${path}`.replace(/\/$/, ''),
        )
      }
    }
    await context.close()
    const normalized = await request.get(`/${locale}/models?system=desk`)
    expect(normalized.status()).toBe(200)
    expect(new URL(normalized.url()).pathname).toBe(`/${locale}/models/`)
    expect(new URL(normalized.url()).searchParams.get('system')).toBe('desk')
  })
}

test('sitemap contains both locales under the production origin', async ({
  request,
  page,
}) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const locations = await page.evaluate(
    (xml) => {
      const document = new DOMParser().parseFromString(xml, 'text/xml')
      return [...document.querySelectorAll('loc')].map(
        (element) => element.textContent!,
      )
    },
    await response.text(),
  )
  const urls = locations.map((location) => new URL(location))
  expect(urls.length).toBeGreaterThan(0)
  for (const url of urls) {
    expect(url.origin).toBe(siteOrigin)
    expect(url.pathname).toMatch(/^\/(zh-Hant|en)\//)
  }
  const paths = urls.map((url) => url.pathname)
  expect(paths).toEqual(
    expect.arrayContaining([
      '/zh-Hant/',
      '/en/',
      '/zh-Hant/about/',
      '/en/about/',
    ]),
  )
})

test('unknown pages and assets return 404, including browser navigation', async ({
  request,
  page,
}) => {
  for (const path of [
    '/en/missing-page',
    '/zh-Hant/missing-page',
    '/_astro/missing-script.js',
    '/missing-kernel.wasm',
  ]) {
    expect((await request.get(path)).status()).toBe(404)
  }
  const navigation = await page.goto('/en/missing-page')
  expect(navigation?.status()).toBe(404)
})

test('kernel asset is delivered as WebAssembly', async ({ request }) => {
  const response = await request.get('/replicad_single.wasm')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toMatch(/^application\/wasm\b/)
  const bytes = await response.body()
  expect([...bytes.subarray(0, 8)]).toEqual([0, 97, 115, 109, 1, 0, 0, 0])
  expect(bytes.length).toBeGreaterThan(8)
})

test('browser CAD worker generates a valid STL from hosted assets', async ({
  page,
}) => {
  const workerStarted = page.waitForEvent('worker')
  await page.goto('/zh-Hant/cad/box/')
  await workerStarted
  const exportButton = page.getByRole('button', {
    name: '下載 STL',
    exact: true,
  })
  await expect(exportButton).toBeEnabled({ timeout: 90_000 })
  await expect(page.getByRole('button', { name: '下載 STEP' })).toHaveCount(0)
  const downloading = page.waitForEvent('download')
  await exportButton.click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/^box-.*\.stl$/)
  expect(await download.failure()).toBeNull()
  const path = await download.path()
  expect(path).not.toBeNull()
  const bytes = await readFile(path!)
  expect(bytes.length).toBeGreaterThan(84)
  const triangles = bytes.readUInt32LE(80)
  expect(triangles).toBeGreaterThan(0)
  expect(bytes.length).toBe(84 + triangles * 50)
})
