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
  },
] as const

for (const locale of locales) {
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

    const steps = page
      .getByTestId('desk-quick-start')
      .locator('ol > li[data-step]')
    await expect(steps).toHaveCount(4)
    await expect(steps.nth(0)).toHaveAttribute('data-step', 'board')
    await expect(steps.nth(1)).toHaveAttribute('data-step', 'snap')
    await expect(steps.nth(2)).toHaveAttribute('data-step', 'locating')
    await expect(steps.nth(3)).toHaveAttribute('data-step', 'container')

    await expect(
      page.locator(`a[href="/${locale.code}/cad/opengrid?system=desk"]`),
    ).toHaveCount(3)
    await expect(
      page.locator(`a[href="/${locale.code}/cad/opengrid-snap?system=desk"]`),
    ).toHaveCount(3)
    await expect(
      page.locator(`a[href="/${locale.code}/cad/opengrid-pillar?system=desk"]`),
    ).toHaveCount(3)
    await expect(
      page.locator(
        `a[href="/${locale.code}/cad/opengrid-stackable-box?system=desk"]`,
      ),
    ).toHaveCount(3)
    await expect(
      page.locator(
        `a[href="/${locale.code}/cad/opengrid-stackable-cylinder?system=desk"]`,
      ),
    ).toHaveCount(3)

    await expect(
      page.getByRole('link', { name: locale.board }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: locale.snap }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: locale.gridBox }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: locale.roundBox }).first(),
    ).toBeVisible()

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
    'Placement is enough; screws are optional.',
  )
  await expect(page.getByTestId('desk-quick-start')).toContainText(
    'you print nothing extra',
  )
  await expect(page.getByTestId('desk-quick-start')).toContainText(
    'Start with a Grid Box',
  )
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})
