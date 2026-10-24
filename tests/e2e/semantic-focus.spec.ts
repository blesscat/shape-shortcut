import { expect, test, type Locator, type Page } from '@playwright/test'

async function expectSemanticKeyboardFocus(page: Page, control: Locator) {
  await expect(control).toBeVisible()
  await control.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(control).toBeFocused()
  const focus = await control.evaluate((element) => {
    const marker = document.createElement('span')
    marker.style.color = 'var(--color-focus)'
    document.body.append(marker)
    const expectedColor = getComputedStyle(marker).color
    marker.remove()
    const style = getComputedStyle(element)
    return {
      visible: element.matches(':focus-visible'),
      width: Number.parseFloat(style.outlineWidth),
      style: style.outlineStyle,
      color: style.outlineColor,
      expectedColor,
    }
  })
  expect(focus.visible).toBe(true)
  expect(focus.width).toBeGreaterThanOrEqual(3)
  expect(focus.style).toBe('solid')
  expect(focus.color).toBe(focus.expectedColor)
}

for (const appearance of ['light', 'dark'] as const) {
  test(`${appearance} native disclosures and assembly controls use semantic keyboard focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: appearance })
    await page.goto('/en/docs/')
    await expectSemanticKeyboardFocus(
      page,
      page.locator('[data-testid="docs-section-nav"] summary'),
    )
    await expectSemanticKeyboardFocus(
      page,
      page.locator('[data-testid="docs-fixing-integrated"] summary'),
    )
    const guide = page.locator('[data-assembly-guide]').first()
    await guide.scrollIntoViewIfNeeded()
    await expect(guide).toHaveAttribute('data-assembly-state', 'ready', {
      timeout: 30_000,
    })
    await expectSemanticKeyboardFocus(
      page,
      guide.locator('.assembly-navigation a').first(),
    )
    await expectSemanticKeyboardFocus(
      page,
      guide.locator('.assembly-tools button').first(),
    )
    await page.goto('/en/models/')
    const tools = page.locator(
      '[data-testid="model-zone-tools-desk"] > summary',
    )
    await expectSemanticKeyboardFocus(page, tools)
    expect((await tools.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })

  test(`${appearance} CAD exports use semantic keyboard focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: appearance })
    await page.goto('/en/cad/box/')
    const exportButton = page
      .getByTestId('cad-panel-actions')
      .getByRole('button', { name: /STL/ })
    await expect(exportButton).toBeEnabled({ timeout: 30_000 })
    await expectSemanticKeyboardFocus(page, exportButton)
  })
}
