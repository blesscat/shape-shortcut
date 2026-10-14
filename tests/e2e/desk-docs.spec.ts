import { expect, test } from '@playwright/test'

const locales = [
  {
    code: 'zh-Hant',
    quickStart: 'Desk System 怎麼玩',
    board: 'Board (底版)',
    snap: 'Snap (咔咔)',
    gridBox: 'Grid Box (方盒)',
    roundBox: 'Round Box (圓盒)',
    reference: '名詞與規格小抄',
    wall: 'Wall System 快速看',
    modelReference: '目前模型與系統',
    otherCard: '其他元件',
    honeycomb: '六角蜂巢',
  },
  {
    code: 'en',
    quickStart: 'How Desk System works',
    board: 'Board',
    snap: 'Snap',
    gridBox: 'Grid Box',
    roundBox: 'Round Box',
    reference: 'Terms & specs',
    wall: 'Wall System, quickly',
    modelReference: 'Current models and systems',
    otherCard: 'Other components',
    honeycomb: 'hexagonal honeycomb',
  },
] as const

for (const locale of locales) {
  test(`${locale.code} two-piece trial explains placement and Snap fixing`, async ({
    page,
  }) => {
    await page.goto(`/${locale.code}/docs/`)
    const trial = page.getByTestId('docs-first-print')
    await expect(trial).toBeVisible()
    await expect(trial).toContainText('2×2')
    const rows = page.getByTestId('docs-starter-checklist').locator('tbody tr')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0)).toContainText(locale.board)
    await expect(rows.nth(1)).toContainText(locale.gridBox)
    await expect(rows.nth(1)).toContainText(
      locale.code === 'en' ? 'No seats' : '無角座',
    )
    const fixing = page.getByTestId('docs-snap-fixing')
    await expect(fixing).toContainText(
      locale.code === 'en' ? 'fix the box’s position' : '固定盒子的位置',
    )
    await expect(page.getByTestId('docs-fixing-integrated')).toContainText('4')
    await expect(page.getByTestId('docs-fixing-separate')).toContainText('4')
    const faq = page.getByTestId('docs-desk-faq')
    await expect(faq.locator('details')).toHaveCount(4)
    await faq.locator('summary').nth(2).click()
    await expect(faq).toContainText(
      locale.code === 'en' ? 'removes the floor' : '移除盒底',
    )
    await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
  })

  test(`${locale.code} Desk quick start exposes the static workflow`, async ({
    page,
  }) => {
    await page.goto(`/${locale.code}/docs/`)

    await expect(
      page.getByRole('heading', { name: locale.quickStart, exact: true }),
    ).toBeVisible()
    await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
    await expect(page.getByTestId('docs-advanced-reference')).toContainText(
      locale.reference,
    )
    await expect(page.getByTestId('docs-wall-system')).toContainText(
      locale.wall,
    )
    await expect(page.getByTestId('docs-model-reference')).toContainText(
      locale.modelReference,
    )

    // Model reference presents Desk/Wall system cards plus one standalone
    // models card; standalone models are individual entries, not a system.
    const modelReference = page.getByTestId('docs-model-reference')
    await expect(modelReference.locator('article')).toHaveCount(3)
    await expect(
      modelReference.getByRole('heading', {
        name: locale.otherCard,
        exact: true,
      }),
    ).toBeVisible()
    await expect(modelReference).toContainText(locale.honeycomb)
    await expect(
      modelReference.getByRole('heading', { name: 'HSW', exact: true }),
    ).toHaveCount(0)

    const steps = page
      .getByTestId('desk-quick-start')
      .locator('ol > li[data-step]')
    await expect(steps).toHaveCount(4)
    await expect(steps.nth(0)).toHaveAttribute('data-step', 'board')
    await expect(steps.nth(1)).toHaveAttribute('data-step', 'snap')
    await expect(steps.nth(2)).toHaveAttribute('data-step', 'locating')
    await expect(steps.nth(3)).toHaveAttribute('data-step', 'container')

    for (const model of [
      'opengrid',
      'opengrid-snap',
      'opengrid-pillar',
      'opengrid-stackable-box',
      'opengrid-organizer-box',
      'opengrid-stackable-cylinder',
    ]) {
      const links = page.locator(
        `a[href="/${locale.code}/cad/${model}?system=desk"]`,
      )
      expect(await links.count()).toBeGreaterThan(0)
    }

    const quickStartDiagrams = page.locator(
      '[data-testid="desk-quick-start"] img[src^="/docs/desk-system/"]',
    )
    await expect(quickStartDiagrams).toHaveCount(6)
    await expect(
      page.locator(
        '[data-testid="desk-quick-start"] img[src^="/docs/desk-system/"]:not([src$="-dark.svg"])',
      ),
    ).toHaveCount(3)
    const darkDiagrams = page.locator(
      '[data-testid="desk-quick-start"] img[src^="/docs/desk-system/"][src$="-dark.svg"]',
    )
    await expect(darkDiagrams).toHaveCount(3)
    for (const diagram of await darkDiagrams.all()) {
      await expect(diagram).toHaveAttribute('alt', '')
      await expect(diagram).toHaveAttribute('aria-hidden', 'true')
    }
    await expect(
      page.locator(
        '[data-testid="docs-wall-system"] img[src$=".webp"]:not([src$="-dark.webp"])',
      ),
    ).toHaveCount(6)
    await expect(
      page.locator('[data-testid="docs-wall-system"] img[src$="-dark.webp"]'),
    ).toHaveCount(6)
    const diagramAltPatterns = [
      ['desk-system-flow', /Board|流程圖/],
      ['desk-system-board-snap', /Board|俯視/],
      ['desk-system-locating-options', /locking corner seat|鎖定角座|比較圖/],
    ] as const
    for (const [asset, altPattern] of diagramAltPatterns) {
      await expect(
        page.locator(`img[src$="${asset}.${locale.code}.svg"]`),
      ).toHaveAttribute('alt', altPattern)
    }
  })
}

test('Desk quick start remains understandable when SVG assets are unavailable', async ({
  page,
}) => {
  await page.route('**/docs/desk-system/*.svg', (route) => route.abort())
  await page.goto('/en/docs/')

  await expect(
    page.getByRole('heading', { name: 'How Desk System works', exact: true }),
  ).toBeVisible()
  await expect(page.getByTestId('desk-quick-start')).toContainText(
    'Screw fastening is optional.',
  )
  await expect(page.getByTestId('desk-quick-start')).toContainText(
    'No Snap or separately printed seats are needed.',
  )
  await expect(page.getByTestId('desk-quick-start')).toContainText(
    'First print: a 2×2 Board and Grid Box',
  )
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

test('Desk illustrations respect manual theme changes over system preference', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/en/docs/')
  const lightDiagrams = page.locator(
    '[data-testid="desk-quick-start"] img[src^="/docs/desk-system/"]:not([src$="-dark.svg"]):visible',
  )
  const darkDiagrams = page.locator(
    '[data-testid="desk-quick-start"] img[src^="/docs/desk-system/"][src$="-dark.svg"]:visible',
  )
  await expect(darkDiagrams).toHaveCount(3)
  await expect(lightDiagrams).toHaveCount(0)
  await page.locator('[data-theme-toggle]').click()
  await expect(lightDiagrams).toHaveCount(3)
  await expect(darkDiagrams).toHaveCount(0)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.locator('[data-theme-toggle]').click()
  await expect(darkDiagrams).toHaveCount(3)
  await expect(lightDiagrams).toHaveCount(0)
  await page.reload()
  await expect(darkDiagrams).toHaveCount(3)
})

for (const { code, colorScheme } of [
  { code: 'zh-Hant', colorScheme: 'light' },
  { code: 'zh-Hant', colorScheme: 'dark' },
  { code: 'en', colorScheme: 'light' },
  { code: 'en', colorScheme: 'dark' },
] as const) {
  test(`${code} ${colorScheme} mobile trial and native questions work without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme,
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    try {
      await page.goto(`/${code}/docs/`)
      const trial = page.getByTestId('docs-first-print')
      await expect(trial).toBeVisible()
      await expect(
        page.getByTestId('docs-starter-checklist').locator('tbody tr'),
      ).toHaveCount(2)
      const titleY = await page
        .locator('#docs-first-print-title')
        .evaluate((title) => title.getBoundingClientRect().top)
      expect(titleY).toBeGreaterThanOrEqual(0)
      expect(titleY).toBeLessThan(844)
      const diagrams = page.locator(
        '[data-testid="desk-quick-start"] img[src^="/docs/desk-system/"]:visible',
      )
      await expect(diagrams).toHaveCount(3)
      for (const diagram of await diagrams.all()) {
        const source = await diagram.getAttribute('src')
        expect(source?.endsWith('-dark.svg')).toBe(colorScheme === 'dark')
      }
      const questions = page.getByTestId('docs-desk-faq')
      await questions.locator('summary').nth(0).click()
      await expect(questions.locator('details').nth(0)).toHaveAttribute(
        'open',
        '',
      )
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    } finally {
      await context.close()
    }
  })
}
