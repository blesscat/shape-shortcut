import { expect, test } from '@playwright/test'

for (const locale of ['zh-Hant', 'en']) {
  test(`${locale} assembly clips wait for play and support pause and replay`, async ({
    page,
  }) => {
    const movieRequests: string[] = []
    const runtimeRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (/\/docs\/desk-assembly\/.*\.(mp4|webm)/.test(url))
        movieRequests.push(url)
      if (/\.wasm|cad\.worker|three\.module/.test(url))
        runtimeRequests.push(url)
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/${locale}/docs/`)
    const videos = page.locator('[data-assembly-video] video:visible')
    await expect(videos).toHaveCount(3)
    const video = videos.first()
    await expect(video).toHaveAttribute('preload', 'none')
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).toHaveAttribute('aria-label', /Board/)
    expect(
      await video.evaluate((element: HTMLVideoElement) => ({
        paused: element.paused,
        time: element.currentTime,
        autoplay: element.autoplay,
        loop: element.loop,
      })),
    ).toEqual({ paused: true, time: 0, autoplay: false, loop: false })
    expect(movieRequests).toEqual([])
    expect(runtimeRequests).toEqual([])
    await video.scrollIntoViewIfNeeded()
    // Activate the native media API without inspecting browser-private controls.
    await video.evaluate((element: HTMLVideoElement) => element.play())
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeGreaterThan(0.2)
    await video.evaluate((element: HTMLVideoElement) => element.pause())
    const stopped = await video.evaluate(
      (element: HTMLVideoElement) => element.currentTime,
    )
    await page.waitForTimeout(150)
    expect(
      await video.evaluate((element: HTMLVideoElement) => element.currentTime),
    ).toBe(stopped)
    await video.evaluate((element: HTMLVideoElement) => {
      element.currentTime = element.duration - 0.1
      return element.play()
    })
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.ended))
      .toBe(true)
    await video.evaluate((element: HTMLVideoElement) => {
      element.currentTime = 0
      return element.play()
    })
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeGreaterThan(0.1)
    expect(runtimeRequests).toEqual([])
  })
}

test('switching theme pauses the hidden movie and exposes matching media', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/en/docs/')
  const light = page.locator(
    '[data-assembly-video="direct-placement"] video[data-appearance="light"]',
  )
  const dark = page.locator(
    '[data-assembly-video="direct-placement"] video[data-appearance="dark"]',
  )
  await light.evaluate((element: HTMLVideoElement) => element.play())
  await page.locator('[data-theme-toggle]').click()
  await expect(dark).toBeVisible()
  await expect(light).toBeHidden()
  await expect
    .poll(() => light.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true)
  await expect(dark).toHaveAttribute('poster', /dark\.webp$/)
  await expect(
    page.locator('[data-assembly-video="direct-placement"] a:visible'),
  ).toHaveAttribute('href', /dark\.webp$/)
})

test('failed movie delivery leaves a static frame and assembly instructions', async ({
  page,
}) => {
  const failedMovies: string[] = []
  page.on('requestfailed', (request) => {
    if (/\/docs\/desk-assembly\/.*\.(mp4|webm)/.test(request.url())) {
      failedMovies.push(request.url())
    }
  })
  await page.route('**/docs/desk-assembly/*.mp4', (route) => route.abort())
  await page.route('**/docs/desk-assembly/*.webm', (route) => route.abort())
  await page.goto('/zh-Hant/docs/')
  const video = page.locator(
    '[data-assembly-video="direct-placement"] video:visible',
  )
  await video.evaluate((element: HTMLVideoElement) => {
    // Engines differ in when a failed <source> settles play(). The written
    // fallback must remain usable even while native loading is pending.
    void element.play().catch(() => {})
  })
  await expect.poll(() => failedMovies.length).toBeGreaterThan(0)
  const still = page.locator(
    '[data-assembly-video="direct-placement"] a:visible',
  )
  await expect(still).toHaveText('查看靜態組裝圖')
  const response = await page.request.get((await still.getAttribute('href'))!)
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('image/webp')
  await expect(page.getByTestId('docs-first-print')).toContainText('無角座')
  await expect(page.getByTestId('docs-snap-fixing')).toContainText(
    '固定盒子的位置',
  )
})
