import { expect, test } from '@playwright/test'

const aboutCases = [
  {
    path: '/zh-Hant/about/',
    heading: '獨立開發者，也是 3D 列印愛好者。',
    role: '獨立開發者、3D 列印愛好者',
    portraitAlt: 'Blesscat 的插畫肖像',
    story: '為什麼做這個',
    feature: 'MakerWorld Customizer',
    email: 'blesscat@gmail.com',
  },
  {
    path: '/en/about/',
    heading: 'Indie developer, and a 3D-printing enthusiast.',
    role: 'Independent developer, 3D-printing enthusiast',
    portraitAlt: 'Illustrated portrait of Blesscat',
    story: 'Why I built this',
    feature: 'MakerWorld Customizer',
    email: 'blesscat@gmail.com',
  },
] as const

for (const aboutCase of aboutCases) {
  test(`${aboutCase.path} exposes the maker profile without CAD runtime`, async ({
    page,
  }) => {
    await page.goto(aboutCase.path)

    await expect(page.getByTestId('about-page')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: aboutCase.heading, exact: true }),
    ).toBeVisible()
    await expect(page.getByText(aboutCase.role, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: aboutCase.story }),
    ).toBeVisible()
    await expect(page.getByTestId('about-story')).toContainText(
      aboutCase.feature,
    )
    await expect(page.getByAltText(aboutCase.portraitAlt)).toBeVisible()
    await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: aboutCase.email }),
    ).toHaveAttribute('href', 'mailto:blesscat@gmail.com')
  })
}
