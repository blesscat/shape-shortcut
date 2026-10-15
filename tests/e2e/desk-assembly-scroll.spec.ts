import { expect, test, type Locator, type Page } from '@playwright/test'

async function openGuide(page: Page, locale = 'en') {
  await page.goto(`/${locale}/docs/`)
  const guide = page.locator('[data-assembly-guide="snap-fixing"]')
  await guide.scrollIntoViewIfNeeded()
  await expect(guide).toHaveAttribute('data-assembly-state', 'ready')
  return guide
}

async function jump(guide: Locator, index: number) {
  await guide.locator(`[data-assembly-step="${index}"]`).click()
  await expectSelectedStep(guide, index)
}

async function expectSelectedStep(guide: Locator, index: number) {
  await expect
    .poll(() =>
      guide
        .locator('progress')
        .evaluate((element: HTMLProgressElement) => element.value),
    )
    .toBeCloseTo(index / 3, 2)
  await expect(
    guide.locator(`[data-assembly-step="${index}"]`),
  ).toHaveAttribute('aria-current', 'step')
}

for (const locale of ['en', 'zh-Hant']) {
  test(`${locale} the first native scroll after enhancement is preserved`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const guide = document.querySelector(
          '[data-assembly-guide="direct-placement"]',
        )
        if (guide?.getAttribute('data-assembly-state') !== 'ready') return
        observer.disconnect()
        window.scrollBy({ top: 240, behavior: 'instant' })
      })
      observer.observe(document, {
        subtree: true,
        attributes: true,
        attributeFilter: ['data-assembly-state'],
      })
    })
    await page.goto(`/${locale}/docs/#assembly-direct-placement-align`)
    const guide = page.locator('[data-assembly-guide="direct-placement"]')
    await expect(guide).toHaveAttribute('data-assembly-state', 'ready')
    await expect
      .poll(() =>
        guide
          .locator('progress')
          .evaluate((el: HTMLProgressElement) => el.value),
      )
      .toBeGreaterThan(0.1)
  })

  for (const scene of ['direct-placement', 'locating-seats']) {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      test(`${locale} ${scene} at ${viewport.width}px follows native scrolling without step clicks`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport)
        await page.goto(`/${locale}/docs/#assembly-${scene}-align`)
        const guide = page.locator(`[data-assembly-guide="${scene}"]`)
        await expect(guide).toHaveAttribute('data-assembly-state', 'ready')
        await page.evaluate(() => document.fonts.ready)
        const progress = guide.locator('progress')
        await expect
          .poll(() => progress.evaluate((el: HTMLProgressElement) => el.value))
          .toBeCloseTo(0, 2)
        const canvas = guide.locator('canvas')
        const original = await canvas.screenshot()
        const distance = Math.round(viewport.height * 0.55)
        await canvas.hover()
        await page.mouse.wheel(0, distance)
        await expect
          .poll(() => progress.evaluate((el: HTMLProgressElement) => el.value))
          .toBeGreaterThan(0.2)
        await expect
          .poll(async () => (await canvas.screenshot()).equals(original))
          .toBe(false)
        const advanced = await canvas.screenshot()
        const paused = await progress.evaluate(
          (el: HTMLProgressElement) => el.value,
        )
        await page.waitForTimeout(150)
        expect(
          await progress.evaluate((el: HTMLProgressElement) => el.value),
        ).toBe(paused)
        const stage = (await guide.locator('.assembly-stage').boundingBox())!
        expect(stage.y).toBeGreaterThan(0)
        expect(stage.y + stage.height).toBeLessThan(viewport.height)
        await page.mouse.wheel(0, -distance)
        await expect
          .poll(() => progress.evaluate((el: HTMLProgressElement) => el.value))
          .toBeCloseTo(0, 2)
        await expect
          .poll(async () => (await canvas.screenshot()).equals(advanced))
          .toBe(false)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
      })
    }
  }

  test(`${locale} a step selected before geometry loads remains selected after enhancement`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    let finishLoading!: () => void
    const pendingGeometry = new Promise<void>((resolve) => {
      finishLoading = resolve
    })
    await page.route(
      '**/docs/desk-scroll-assembly/meshes.bin',
      async (route) => {
        await pendingGeometry
        await route.continue()
      },
    )
    await page.goto(`/${locale}/docs/`)
    const guide = page.locator('[data-assembly-guide="snap-fixing"]')
    await guide.scrollIntoViewIfNeeded()
    await expect(guide).toHaveAttribute('data-assembly-state', 'poster')
    await guide.locator('[data-assembly-step="0"]').click()
    await expect(page).toHaveURL(/#assembly-snap-fixing-board$/)
    finishLoading()
    await expect(guide).toHaveAttribute('data-assembly-state', 'ready')
    await expectSelectedStep(guide, 0)
    const stage = (await guide.locator('.assembly-stage').boundingBox())!
    const heading = (await guide
      .locator('[data-assembly-instruction="0"] h5')
      .boundingBox())!
    expect(heading.y).toBeGreaterThanOrEqual(stage.y + stage.height)
    await expect(
      guide.locator('[data-assembly-instruction="0"] h5'),
    ).toBeInViewport()
  })

  test(`${locale} copied step URLs and reloading preserve the matching assembly`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/docs/#assembly-snap-fixing-container`)
    const guide = page.locator('[data-assembly-guide="snap-fixing"]')
    await expect(guide).toHaveAttribute('data-assembly-state', 'ready')
    await expectSelectedStep(guide, 3)
    await expect(
      guide.locator('[data-assembly-instruction="3"] h5'),
    ).toBeInViewport()
    await jump(guide, 1)
    await page.reload()
    await expect(guide).toHaveAttribute('data-assembly-state', 'ready')
    await expectSelectedStep(guide, 1)
    await expect(
      guide.locator('[data-assembly-instruction="1"] h5'),
    ).toBeInViewport()
    await page.evaluate(() => {
      location.hash = '#assembly-snap-fixing-locating'
    })
    await expectSelectedStep(guide, 2)
    await expect(
      guide.locator('[data-assembly-instruction="2"] h5'),
    ).toBeInViewport()
  })

  test(`${locale} reading progress moves real geometry, holds and reverses`, async ({
    page,
  }) => {
    const forbiddenRequests: string[] = []
    page.on('request', (request) => {
      if (/\.wasm|cad\.worker|\.(?:mp4|webm)(?:\?|$)/.test(request.url()))
        forbiddenRequests.push(request.url())
    })
    const guide = await openGuide(page, locale)
    await jump(guide, 0)
    const canvas = guide.locator('canvas')
    const start = await canvas.screenshot()
    await jump(guide, 1)
    await expect
      .poll(async () => (await canvas.screenshot()).equals(start))
      .toBe(false)
    const stopped = await guide
      .locator('progress')
      .evaluate((element: HTMLProgressElement) => element.value)
    await page.waitForTimeout(180)
    expect(
      await guide
        .locator('progress')
        .evaluate((element: HTMLProgressElement) => element.value),
    ).toBe(stopped)
    await jump(guide, 3)
    await guide.locator('[data-assembly-step="1"]').focus()
    await page.keyboard.press('Enter')
    await expect
      .poll(() =>
        guide
          .locator('progress')
          .evaluate((element: HTMLProgressElement) => element.value),
      )
      .toBeCloseTo(1 / 3, 2)
    const beforeWheel = await page.evaluate(() => scrollY)
    await canvas.hover()
    await page.mouse.wheel(0, 180)
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(beforeWheel + 50)
    await expect
      .poll(() =>
        guide
          .locator('progress')
          .evaluate((element: HTMLProgressElement) => element.value),
      )
      .toBeGreaterThan(1 / 3)
    await jump(guide, 2)
    await expect(
      guide.locator('[data-assembly-instruction="2"]'),
    ).toBeInViewport()
    await page.getByTestId('docs-desk-faq').scrollIntoViewIfNeeded()
    expect(
      (await guide.locator('.assembly-stage').boundingBox())!.y,
    ).toBeLessThan(0)
    expect(forbiddenRequests).toEqual([])
  })

  test(`${locale} phone steps keep the explanation below the sticky model`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const guide = await openGuide(page, locale)
    await jump(guide, 2)
    const stage = (await guide.locator('.assembly-stage').boundingBox())!
    const explanation = (await guide
      .locator('[data-assembly-instruction="2"]')
      .boundingBox())!
    expect(stage.y).toBeGreaterThan(60)
    expect(stage.height).toBeLessThan(844 / 2)
    expect(explanation.y).toBeGreaterThanOrEqual(stage.y + stage.height)
    expect(explanation.y).toBeLessThan(844 - 100)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })

  test(`${locale} landscape phone keeps the model beside the selected explanation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 667, height: 375 })
    const guide = await openGuide(page, locale)
    await jump(guide, 2)
    const stage = (await guide.locator('.assembly-stage').boundingBox())!
    const explanation = (await guide
      .locator('[data-assembly-instruction="2"]')
      .boundingBox())!
    expect(stage.y).toBeGreaterThanOrEqual(60)
    expect(stage.y + stage.height).toBeLessThanOrEqual(375)
    expect(explanation.x).toBeGreaterThanOrEqual(stage.x + stage.width)
    await expect(
      guide.locator('[data-assembly-instruction="2"] h5'),
    ).toBeInViewport()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}

test('view controls and manual appearance changes preserve assembly progress', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  const guide = await openGuide(page)
  await jump(guide, 1)
  const canvas = guide.locator('canvas')
  const original = await canvas.screenshot()
  await guide.getByRole('button', { name: 'Rotate model left' }).click()
  await expect
    .poll(async () => (await canvas.screenshot()).equals(original))
    .toBe(false)
  await guide.getByRole('button', { name: 'Reset view' }).click()
  await expect
    .poll(async () => (await canvas.screenshot()).equals(original))
    .toBe(true)
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2 + 20,
    { steps: 5 },
  )
  await page.mouse.up()
  await expect
    .poll(async () => (await canvas.screenshot()).equals(original))
    .toBe(false)
  await guide.getByRole('button', { name: 'Reset view' }).click()
  await expect
    .poll(async () => (await canvas.screenshot()).equals(original))
    .toBe(true)
  await page.locator('[data-theme-toggle]').click()
  await expect(guide).toHaveAttribute('data-appearance', 'dark')
  await expect
    .poll(async () => (await canvas.screenshot()).equals(original))
    .toBe(false)
  await expect
    .poll(() =>
      guide
        .locator('progress')
        .evaluate((element: HTMLProgressElement) => element.value),
    )
    .toBeCloseTo(1 / 3, 2)
})

test('reduced motion keeps every scroll guide readable with stable step poses', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const guide = await openGuide(page)
  await jump(guide, 2)
  const direct = page.locator('[data-assembly-guide="direct-placement"]')
  await direct.scrollIntoViewIfNeeded()
  await expect(direct).toHaveAttribute('data-assembly-state', 'ready')
  await direct.locator('[data-assembly-step="1"]').click()
  await expect(direct).toContainText('Place the box directly on the Board.')
  await expect(direct.locator('[data-assembly-instruction="0"]')).toBeVisible()
  await expect
    .poll(() =>
      direct
        .locator('progress')
        .evaluate((el: HTMLProgressElement) => el.value),
    )
    .toBeCloseTo(0.5, 2)
  await direct.locator('[data-assembly-step="2"]').click()
  await expect(direct.locator('[data-assembly-instruction="2"]')).toBeVisible()
  const locating = page.locator('[data-assembly-guide="locating-seats"]')
  await locating.scrollIntoViewIfNeeded()
  await expect(locating).toHaveAttribute('data-assembly-state', 'ready')
  await locating.locator('[data-assembly-step="2"]').click()
  await expect(
    locating.locator('[data-assembly-instruction="2"]'),
  ).toContainText('clockwise by 90°')
})

test('failed geometry restores actual-model posters and complete written instructions', async ({
  page,
}) => {
  await page.route('**/docs/desk-scroll-assembly/meshes.bin', (route) =>
    route.abort(),
  )
  await page.goto('/en/docs/')
  const guide = page.locator('[data-assembly-guide="snap-fixing"]')
  await guide.scrollIntoViewIfNeeded()
  await expect(guide).toHaveAttribute('data-assembly-state', 'error')
  await expect(guide.locator('[data-assembly-poster]')).toBeVisible()
  await expect(guide.locator('[data-assembly-failure]')).toBeVisible()
  await expect(guide.locator('[data-assembly-instruction]')).toHaveCount(4)
  await guide.locator('[data-assembly-step="3"]').click()
  await expect(
    guide.locator('[data-assembly-instruction="3"]'),
  ).toBeInViewport()
  await expect(guide.locator('canvas')).toHaveCount(0)
})

test('lost WebGL context restores the guide fallback', async ({ page }) => {
  const guide = await openGuide(page)
  await guide.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    canvas
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext()
  })
  await expect(guide).toHaveAttribute('data-assembly-state', 'error')
  await expect(guide.locator('[data-assembly-poster]')).toBeVisible()
  await expect(guide.locator('[data-assembly-instruction="3"]')).toBeVisible()
})

test('unavailable WebGL keeps static instructions and step links usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...options: unknown[]
    ) {
      if (
        type === 'webgl' ||
        type === 'webgl2' ||
        type === 'experimental-webgl'
      )
        return null
      return Reflect.apply(getContext, this, [type, ...options])
    } as typeof getContext
  })
  await page.goto('/en/docs/')
  const guide = page.locator('[data-assembly-guide="snap-fixing"]')
  await guide.scrollIntoViewIfNeeded()
  await expect(guide).toHaveAttribute('data-assembly-state', 'error')
  await expect(guide.locator('[data-assembly-poster]')).toBeVisible()
  await guide.locator('[data-assembly-step="3"]').click()
  await expect(
    guide.locator('[data-assembly-instruction="3"]'),
  ).toBeInViewport()
})

test('a vertical phone swipe preserves page scrolling and the guided underside view', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Native touch injection uses the Chromium protocol',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  const guide = await openGuide(page)
  await page.evaluate(() => document.fonts.ready)
  await jump(guide, 2)
  const baseline = await guide.locator('canvas').screenshot()
  await jump(guide, 1)
  const rect = (await guide.locator('canvas').boundingBox())!
  const before = await page.evaluate(() => scrollY)
  const session = await page.context().newCDPSession(page)
  const x = rect.x + rect.width / 2
  const y = rect.y + rect.height - 12
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  })
  for (let step = 1; step <= 6; step += 1) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - step * 22 }],
    })
    await page.waitForTimeout(20)
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(before + 50)
  let previous = -1
  await expect
    .poll(
      async () => {
        const position = await page.evaluate(() => scrollY)
        const settled = position === previous
        previous = position
        return settled
      },
      { intervals: [100] },
    )
    .toBe(true)
  await jump(guide, 2)
  await expect
    .poll(async () =>
      (await guide.locator('canvas').screenshot()).equals(baseline),
    )
    .toBe(true)
  await jump(guide, 1)
  const tap = (await guide.locator('canvas').boundingBox())!
  const touchPoints = [{ x: tap.x + tap.width / 2, y: tap.y + tap.height / 2 }]
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints,
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await jump(guide, 2)
  await expect
    .poll(async () =>
      (await guide.locator('canvas').screenshot()).equals(baseline),
    )
    .toBe(true)
})

test('an intentional horizontal phone drag keeps its view until reset', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Native touch injection uses the Chromium protocol',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  const guide = await openGuide(page)
  await page.evaluate(() => document.fonts.ready)
  await jump(guide, 2)
  const baseline = await guide.locator('canvas').screenshot()
  const bounds = (await guide.locator('canvas').boundingBox())!
  const session = await page.context().newCDPSession(page)
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  })
  for (let step = 1; step <= 6; step += 1) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + step * 16, y }],
    })
    await page.waitForTimeout(20)
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect
    .poll(async () =>
      (await guide.locator('canvas').screenshot()).equals(baseline),
    )
    .toBe(false)
  await jump(guide, 1)
  await jump(guide, 2)
  await expect
    .poll(async () =>
      (await guide.locator('canvas').screenshot()).equals(baseline),
    )
    .toBe(false)
  await guide.getByRole('button', { name: 'Reset view' }).click()
  await expect
    .poll(async () =>
      (await guide.locator('canvas').screenshot()).equals(baseline),
    )
    .toBe(true)
})
