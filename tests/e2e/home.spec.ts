import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  configuredSupportProviders,
  supportDialog,
  supportTrigger,
} from './helpers'

async function dismissCadErrorToast(page: Page) {
  const toast = page.getByTestId('cad-error-toast')
  if ((await toast.count()) === 0) return

  await toast.getByRole('button').click()
  await expect(toast).toHaveCount(0)
}

type HomepageRuntimeObservation = {
  workerUrls: string[]
  wasmRequests: string[]
}

function observeHomepageRuntime(page: Page): HomepageRuntimeObservation {
  const observation: HomepageRuntimeObservation = {
    workerUrls: [],
    wasmRequests: [],
  }

  page.on('worker', (worker) => {
    observation.workerUrls.push(worker.url())
  })
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname.endsWith('.wasm')) observation.wasmRequests.push(pathname)
  })

  return observation
}

function parseColor(value: string): [number, number, number] {
  const rgbComponents = value.match(/rgba?\(([^)]+)\)/)?.[1]
  if (rgbComponents) {
    const components = rgbComponents.split(',').map(Number)
    if (components.length < 3) throw new Error(`Unsupported color: ${value}`)
    return [components[0] ?? 0, components[1] ?? 0, components[2] ?? 0]
  }

  const oklchMatch = value.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+|none)/,
  )
  if (!oklchMatch) throw new Error(`Unsupported color: ${value}`)

  const lightness = Number(oklchMatch[1])
  const chroma = Number(oklchMatch[2])
  const hue = oklchMatch[3] === 'none' ? 0 : Number(oklchMatch[3])
  const hueRadians = (hue * Math.PI) / 180
  const labA = chroma * Math.cos(hueRadians)
  const labB = chroma * Math.sin(hueRadians)

  const lightnessPrime = lightness + 0.3963377774 * labA + 0.2158037573 * labB
  const greenPrime = lightness - 0.1055613458 * labA - 0.0638541728 * labB
  const bluePrime = lightness - 0.0894841775 * labA - 1.291485548 * labB
  const lightnessCube = lightnessPrime ** 3
  const greenCube = greenPrime ** 3
  const blueCube = bluePrime ** 3

  const linearRed =
    4.0767416621 * lightnessCube -
    3.3077115913 * greenCube +
    0.2309699292 * blueCube
  const linearGreen =
    -1.2684380046 * lightnessCube +
    2.6097574011 * greenCube -
    0.3413193965 * blueCube
  const linearBlue =
    -0.0041960863 * lightnessCube -
    0.7034186147 * greenCube +
    1.707614701 * blueCube

  function srgbChannel(linearChannel: number): number {
    const normalized =
      linearChannel <= 0.0031308
        ? 12.92 * linearChannel
        : 1.055 * linearChannel ** (1 / 2.4) - 0.055
    return Math.max(0, Math.min(255, normalized * 255))
  }

  return [
    srgbChannel(linearRed),
    srgbChannel(linearGreen),
    srgbChannel(linearBlue),
  ]
}

function relativeLuminance(value: string): number {
  const channels = parseColor(value).map((channel) => channel / 255)
  const linearChannels = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return (
    0.2126 * (linearChannels[0] ?? 0) +
    0.7152 * (linearChannels[1] ?? 0) +
    0.0722 * (linearChannels[2] ?? 0)
  )
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

async function readCtaColors(locator: Locator): Promise<{
  color: string
  backgroundColor: string
}> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
    }
  })
}

async function readHomepageSecondaryTextColors(page: Page): Promise<{
  color: string
  backgroundColor: string
}> {
  const description = page.getByTestId('home-hero').locator('p').first()
  await expect(description).toBeVisible()

  return description.evaluate((element) => {
    const textStyle = getComputedStyle(element)
    const pageStyle = getComputedStyle(document.body)
    return {
      color: textStyle.color,
      backgroundColor: pageStyle.backgroundColor,
    }
  })
}

async function expectStaticHomepage(
  page: Page,
  observation: HomepageRuntimeObservation,
): Promise<void> {
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(observation.workerUrls).toEqual([])
  expect(observation.wasmRequests).toEqual([])

  // Hidden appearance variants are decorative (aria-hidden, empty alt) by
  // design — only the visible variants carry alternative text.
  const imageAlts = await page
    .locator('main img:not([aria-hidden="true"])')
    .evaluateAll((images) =>
      images.map((image) => image.getAttribute('alt')?.trim() ?? ''),
    )
  expect(imageAlts.length).toBeGreaterThan(0)
  expect(imageAlts.every((alt) => alt.length > 0)).toBe(true)
}

type ExploreCardLayout = {
  width: number
  isStacked: boolean
  isSplit: boolean
}

async function expectHomepageExploreCards(page: Page): Promise<void> {
  const explore = page.getByTestId('home-explore')
  const cards = explore.locator('article')

  await expect(cards).toHaveCount(2)
  await expect(
    cards.nth(0).getByRole('heading', { name: 'OpenGrid Desk', exact: true }),
  ).toBeVisible()
  await expect(
    cards.nth(1).getByRole('heading', { name: 'OpenGrid Wall', exact: true }),
  ).toBeVisible()
  await expect(cards.nth(0).getByRole('link')).toHaveAttribute(
    'href',
    /\/cad\/opengrid\?system=desk$/,
  )
  await expect(cards.nth(1).getByRole('link')).toHaveAttribute(
    'href',
    /\/cad\/opengrid\?system=wall$/,
  )
  await expect(explore.getByRole('heading', { name: /^HSW/ })).toHaveCount(0)
  await expect(explore.locator('img[src*="hsw-cell"]')).toHaveCount(0)
  await expect(explore.locator('a[href*="/cad/hsw-cell"]')).toHaveCount(0)
}

async function readExploreCardLayouts(
  page: Page,
): Promise<ExploreCardLayout[]> {
  return page
    .getByTestId('home-explore')
    .locator('article')
    .evaluateAll((cards) =>
      cards.map((card) => {
        const image = card.querySelector('img')
        const content = card.children.item(1)
        if (!image || !(content instanceof HTMLElement)) {
          throw new Error('EXPLORE_CARD_STRUCTURE_MISMATCH')
        }

        const cardRect = card.getBoundingClientRect()
        const imageRect = image.getBoundingClientRect()
        const contentRect = content.getBoundingClientRect()
        return {
          width: cardRect.width,
          isStacked: imageRect.bottom <= contentRect.top + 1,
          isSplit: imageRect.right <= contentRect.left + 1,
        }
      }),
    )
}

test('home, model selection, and docs are static Astro pages', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/zh-Hant\/$/)
  await expect(
    page.getByRole('heading', {
      name: /把 3D 列印收納模型\s*集中在同一個地方/,
    }),
  ).toBeVisible()
  await expect(page.getByTestId('home-hero')).toBeVisible()
  await expect(page.getByTestId('home-capabilities')).toBeVisible()
  await expect(page.getByTestId('home-desk-system')).toBeVisible()
  await expect(page.getByTestId('home-explore')).toBeVisible()
  await expectHomepageExploreCards(page)
  await expect(page.getByTestId('home-maker')).toBeVisible()
  await expect(page.getByTestId('home-maker')).toContainText(
    'MakerWorld Customizer',
  )
  await expect(page.getByText('即時 3D 預覽', { exact: true })).toBeVisible()
  await expect(page.getByText('STL 與 3MF 匯出', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Shape Shortcut' }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page
      .getByRole('navigation', { name: '主要導覽' })
      .getByRole('link', { name: '選擇模型', exact: true }),
  ).not.toHaveAttribute('aria-current', 'page')
  const primaryCta = page.getByRole('link', { name: '開始客製化' })
  await expect(primaryCta).toHaveAttribute('href', '/zh-Hant/models')
  const deskCta = page.getByRole('link', { name: '從 Desk System 開始' })
  await expect(deskCta).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid?system=desk',
  )
  await expect(page.getByRole('link', { name: '閱讀文件 →' })).toHaveAttribute(
    'href',
    '/zh-Hant/docs/',
  )
  const ctaBackground = await primaryCta.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  const navigationBackground = await page
    .getByRole('navigation', { name: '主要導覽' })
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(ctaBackground).not.toBe(navigationBackground)
  await expect(
    page.getByRole('link', { name: '編輯 →', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('[data-model-id]')).toHaveCount(0)
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByTestId('home-hero')).toBeVisible()
  const heroButtons = page.getByTestId('home-hero').getByRole('link')
  const heroButtonPositions = await heroButtons.evaluateAll((links) =>
    links.slice(0, 2).map((link) => {
      const bounds = link.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y }
    }),
  )
  expect(heroButtonPositions[0]?.x).toBe(heroButtonPositions[1]?.x)

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/models')
  await expect(
    page.getByRole('link', { name: 'Shape Shortcut' }),
  ).not.toHaveAttribute('aria-current', 'page')
  await expect(
    page
      .getByRole('navigation', { name: '主要導覽' })
      .getByRole('link', { name: '選擇模型', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('heading', { name: '選擇 CAD 模型' }),
  ).toBeVisible()
  await expect(page.locator('main')).toHaveCSS('max-width', 'none')
  await expect(
    page.getByTestId('model-selection').locator('p').first(),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'OpenGrid 系列' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: '其他模型' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'HSW 系列' })).toHaveCount(0)
  await expect(page.getByText('系統入口', { exact: true })).toHaveCount(0)
  await expect(
    page.getByTestId('model-family-opengrid').getByText('OpenGrid', {
      exact: true,
    }),
  ).toHaveCount(0)
  const familySections = page.locator('[data-testid^="model-family-"]')
  await expect(familySections).toHaveCount(2)
  await expect(familySections.nth(0)).toHaveAttribute(
    'data-testid',
    'model-family-opengrid',
  )
  await expect(familySections.nth(1)).toHaveAttribute(
    'data-testid',
    'model-family-other',
  )
  const openGridFamily = page.getByTestId('model-family-opengrid')
  const openGridSubgroups = page.getByTestId('model-subgroups-opengrid')
  await expect(
    openGridFamily.locator(':scope > [data-testid="model-subgroups-opengrid"]'),
  ).toHaveCount(1)
  await expect(
    openGridSubgroups.locator(':scope > [data-testid^="model-subgroup-"]'),
  ).toHaveCount(2)
  await expect(page.getByTestId('model-selection')).toHaveCSS(
    'border-top-width',
    '0px',
  )

  const editLinkFor = (
    container: ReturnType<typeof page.locator>,
    displayName: string,
  ) =>
    container
      .getByRole('heading', { name: displayName, exact: true })
      .locator('..')
      .getByRole('link', { name: `編輯 ${displayName}`, exact: true })

  const deskSystem = page.getByTestId('model-subgroup-desk')
  const wallRelated = page.getByTestId('model-subgroup-wall')
  const otherModels = page.getByTestId('model-subgroup-other')
  await expect(
    deskSystem.getByRole('heading', { name: 'Desk System' }),
  ).toBeVisible()
  await expect(
    wallRelated.getByRole('heading', { name: 'Wall Related' }),
  ).toBeVisible()
  await expect(editLinkFor(otherModels, '六角蜂巢')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/hsw-cell',
  )
  await expect(
    editLinkFor(deskSystem, 'Locating Post (定位柱)'),
  ).toHaveAttribute('href', '/zh-Hant/cad/opengrid-pillar?system=desk')
  await expect(editLinkFor(deskSystem, 'Board (底版)')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Snap (咔咔)')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-snap?system=desk',
  )
  await expect(editLinkFor(wallRelated, 'Board (底版)')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid?system=wall',
  )
  await expect(editLinkFor(wallRelated, 'Snap (咔咔)')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-snap?system=wall',
  )
  await expect(editLinkFor(deskSystem, 'divider (分隔牆)')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-divider?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Grid Box (方盒)')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-stackable-box?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Round Box (圓盒)')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-stackable-cylinder?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Snap Remover')).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid-snap-remover?system=desk',
  )
  await expect(
    editLinkFor(deskSystem, 'Open Shelf (斜開格櫃)'),
  ).toHaveAttribute('href', '/zh-Hant/cad/opengrid-open-shelf?system=desk')
  const openGridCards = deskSystem.locator('[data-model-id]')
  await expect(openGridCards.nth(0)).toHaveAttribute(
    'data-model-id',
    'opengrid',
  )
  await expect(openGridCards.nth(1)).toHaveAttribute(
    'data-model-id',
    'opengrid-snap',
  )
  const bottomCardBounds = await openGridCards.nth(0).boundingBox()
  const snapCardBounds = await openGridCards.nth(1).boundingBox()
  expect(bottomCardBounds).not.toBeNull()
  expect(snapCardBounds).not.toBeNull()
  if (!bottomCardBounds || !snapCardBounds) {
    throw new Error('OpenGrid bottom and Snap cards must be laid out')
  }
  expect(snapCardBounds.x).toBeGreaterThan(bottomCardBounds.x)
  expect(snapCardBounds.y).toBeCloseTo(bottomCardBounds.y, 0)
  const openGridCardPositions = await openGridCards.evaluateAll((cards) =>
    cards.map((card) => {
      const bounds = card.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y }
    }),
  )
  const firstCardPosition = openGridCardPositions[0]
  if (!firstCardPosition) throw new Error('Expected OpenGrid card positions')
  const firstRowCount = openGridCardPositions.filter(
    (position) => Math.abs(position.y - firstCardPosition.y) < 1,
  ).length
  expect(firstRowCount).toBeGreaterThanOrEqual(3)
  await expect(wallRelated.locator('[data-model-id]')).not.toHaveCount(0)
  for (const displayName of ['方塊', '模組化網格底板', '可調六角柱']) {
    await expect(
      page.getByRole('heading', { name: displayName, exact: true }),
    ).toHaveCount(0)
  }
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  await page.goto('/docs/')
  await expect(
    page.getByRole('heading', { name: 'Shape Shortcut 文件' }),
  ).toBeVisible()
  await expect(page.getByTestId('docs-wall-system')).toContainText(
    'Wall System 快速參考',
  )
  await expect(page.getByTestId('docs-model-reference')).toContainText(
    '目前模型與系統',
  )
  await expect(
    page.getByRole('link', { name: '返回模型選擇' }),
  ).toHaveAttribute('href', '/zh-Hant/models')
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

test('primary navigation stays at the top while scrolling', async ({
  page,
}) => {
  await page.goto('/en/')

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
  })
  await expect(navigation).toHaveCSS('position', 'sticky')

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

  // While scrolled the capsule is compact but still pinned at the edge.
  await expect
    .poll(() =>
      navigation.evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBe(0)
})

test('primary navigation collapses to a compact capsule while scrolled', async ({
  page,
}) => {
  await page.goto('/en/')

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
  })
  const themeToggle = page.locator('[data-theme-toggle]')
  const navLinks = [
    navigation.getByRole('link', { name: 'Docs', exact: true }),
    navigation.getByRole('link', { name: 'Models', exact: true }),
    navigation.getByRole('link', { name: 'About', exact: true }),
  ]

  const navEdge = (edge: 'top' | 'bottom') =>
    navigation.evaluate(
      (element, edge) => Math.round(element.getBoundingClientRect()[edge]),
      edge,
    )
  const navHeight = () =>
    navigation.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    )

  // At the top of the page the capsule rests in flow, 24px below the edge,
  // with every navigation link exposed.
  await expect.poll(() => navEdge('top')).toBe(24)
  const expandedHeight = await navHeight()
  const expandedToggleHeight = await themeToggle.evaluate(
    (element) => element.getBoundingClientRect().height,
  )
  await expect(navigation).not.toHaveAttribute('data-compact', '')
  for (const link of navLinks) await expect(link).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 400))
  await expect(navigation).toHaveAttribute('data-compact', '')
  await expect.poll(() => navEdge('top')).toBe(0)
  // py-4 -> py-1.5 shrinks the capsule by exactly 20px (16 -> 6 per side).
  await expect.poll(navHeight).toBe(expandedHeight - 20)
  // Secondary links fold away; controls keep their expanded sizes.
  for (const link of navLinks) await expect(link).toBeHidden()
  expect(
    await themeToggle.evaluate(
      (element) => element.getBoundingClientRect().height,
    ),
  ).toBe(expandedToggleHeight)

  // On a narrow viewport the folded links unwrap the capsule into a
  // single ~50px row instead of the wrapped two-row layout.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 400))
  await expect(navigation).toHaveAttribute('data-compact', '')
  await expect.poll(navHeight).toBeLessThan(60)

  await page.setViewportSize({ width: 1280, height: 720 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(navigation).not.toHaveAttribute('data-compact', '')
  await expect.poll(() => navEdge('top')).toBe(24)
  for (const link of navLinks) await expect(link).toBeVisible()
})

test('primary navigation starts compact when a page loads mid-scroll', async ({
  page,
}) => {
  await page.goto('/en/')
  await page.evaluate(() => window.scrollTo(0, 400))
  await page.reload()

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
  })
  await expect(navigation).toHaveAttribute('data-compact', '')
})

test('primary navigation collapses identically in dark mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/en/')

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
  })

  const expandedHeight = await navigation.evaluate((element) =>
    Math.round(element.getBoundingClientRect().height),
  )

  await page.evaluate(() => window.scrollTo(0, 400))
  await expect(navigation).toHaveAttribute('data-compact', '')
  // The compact capsule floats 8px (top-2) instead of 24px (top-6) below
  // the top edge in dark mode, keeping its full neon border visible.
  await expect
    .poll(() =>
      navigation.evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBe(8)
  // The capsule shrinks by the same 20px as in light mode.
  await expect
    .poll(() =>
      navigation.evaluate((element) =>
        Math.round(element.getBoundingClientRect().height),
      ),
    )
    .toBe(expandedHeight - 20)
})

test('primary navigation switches states without animation under reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en/')

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
  })

  const transitionProperty = await navigation.evaluate(
    (element) => getComputedStyle(element).transitionProperty,
  )
  expect(transitionProperty).toBe('none')

  await page.evaluate(() => window.scrollTo(0, 400))
  await expect(navigation).toHaveAttribute('data-compact', '')
})

test('Traditional Chinese homepage uses the Desk System entry flow', async ({
  page,
}) => {
  const runtimeObservation = observeHomepageRuntime(page)
  await page.goto('/zh-Hant/')

  await expect(page).toHaveTitle(
    'OpenGrid 客製化產生器｜Shape Shortcut 瀏覽器 CAD',
  )
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    '在瀏覽器調整 OpenGrid 桌面與牆面收納模型：即時 3D 預覽、下載 STL，模型下載永久免費、運算全程在本機完成。',
  )
  await expect(
    page.getByRole('heading', {
      name: /把 3D 列印收納模型\s*集中在同一個地方/,
    }),
  ).toBeVisible()
  await expect(
    page.getByText('運算全程在你的瀏覽器完成，模型下載永久免費'),
  ).toBeVisible()
  await expect(page.getByText(/雙色 3MF 多色列印檔/)).toBeVisible()
  await expect(page.getByText('HSW')).toHaveCount(0)
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute(
    'content',
    /HSW/,
  )
  await expect(page.getByTestId('home-maker')).toContainText('Prototype')
  await expect(page.getByTestId('home-hero')).toBeVisible()
  await expect(page.getByTestId('home-desk-system')).toBeVisible()
  await expectHomepageExploreCards(page)
  await expect(page.getByRole('link', { name: '開始客製化' })).toHaveAttribute(
    'href',
    '/zh-Hant/models',
  )
  await expect(
    page.getByRole('link', { name: '從 Desk System 開始' }),
  ).toHaveAttribute('href', '/zh-Hant/cad/opengrid?system=desk')
  await expect(page.getByRole('link', { name: '閱讀文件 →' })).toHaveAttribute(
    'href',
    '/zh-Hant/docs/',
  )
  await expect(
    page.getByRole('link', { name: '探索牆面系統 →' }),
  ).toHaveAttribute('href', '/zh-Hant/cad/opengrid?system=wall')
  await expect(
    page.getByAltText('OpenGrid Desk System Board 底板預覽'),
  ).toBeVisible()
  await expectStaticHomepage(page, runtimeObservation)
})

test('English homepage uses localized promotional content and routes', async ({
  page,
}) => {
  const runtimeObservation = observeHomepageRuntime(page)
  await page.goto('/en/')

  await expect(page).toHaveTitle(
    'OpenGrid customizer | Shape Shortcut browser CAD',
  )
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Customize OpenGrid desk and wall storage models in your browser: live 3D preview, STL download, free downloads, all computed locally.',
  )
  await expect(
    page.getByRole('heading', {
      name: /Parametric 3D-printing storage models\s*in one browser tab/,
    }),
  ).toBeVisible()
  await expect(
    page.getByText(
      /all computation runs in your browser, and model downloads are free forever/,
    ),
  ).toBeVisible()
  await expect(
    page.getByText(/dual-color 3MF for multi-color printing/),
  ).toBeVisible()
  await expect(page.getByText('HSW')).toHaveCount(0)
  await expectHomepageExploreCards(page)
  await expect(
    page.getByRole('link', { name: 'Start customizing' }),
  ).toHaveAttribute('href', '/en/models')
  await expect(
    page.getByRole('link', { name: 'Start with Desk System' }),
  ).toHaveAttribute('href', '/en/cad/opengrid?system=desk')
  await expect(
    page.getByRole('link', { name: 'Read the docs →' }),
  ).toHaveAttribute('href', '/en/docs/')
  await expect(
    page.getByRole('link', { name: 'Explore the wall system →' }),
  ).toHaveAttribute('href', '/en/cad/opengrid?system=wall')
  await expect(
    page.getByAltText('OpenGrid Desk System Board preview'),
  ).toBeVisible()
  await expectStaticHomepage(page, runtimeObservation)
})

test('localized homepage keeps Desk and Wall explore cards aligned', async ({
  page,
}) => {
  const viewportCases = [
    { width: 1440, height: 900, stacked: true, split: false },
    { width: 900, height: 900, stacked: false, split: true },
    { width: 390, height: 844, stacked: true, split: false },
  ]

  for (const path of ['/zh-Hant/', '/en/']) {
    await page.goto(path)
    await expectHomepageExploreCards(page)

    for (const viewportCase of viewportCases) {
      await page.setViewportSize(viewportCase)
      const layouts = await readExploreCardLayouts(page)
      const first = layouts[0]
      const second = layouts[1]
      if (!first || !second) throw new Error('EXPLORE_CARD_COUNT_MISMATCH')

      expect(Math.abs(first.width - second.width)).toBeLessThan(1)
      expect(first.isStacked).toBe(viewportCase.stacked)
      expect(second.isStacked).toBe(viewportCase.stacked)
      expect(first.isSplit).toBe(viewportCase.split)
      expect(second.isSplit).toBe(viewportCase.split)
    }
  }
})

test('localized homepage final CTA remains readable in both color schemes', async ({
  page,
}) => {
  const homepageCtaCases = [
    {
      path: '/zh-Hant/',
      name: '開始選擇模型 →',
      href: '/zh-Hant/models',
    },
    {
      path: '/en/',
      name: 'Start choosing a model →',
      href: '/en/models',
    },
  ] as const

  await page.setViewportSize({ width: 1440, height: 900 })

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })

    for (const homepage of homepageCtaCases) {
      await page.goto(homepage.path)
      const cta = page.getByRole('link', { name: homepage.name, exact: true })

      await expect(cta).toBeVisible()
      await expect(cta).toHaveAttribute('href', homepage.href)
      await cta.focus()
      await expect(cta).toBeFocused()

      const normalColors = await readCtaColors(cta)
      expect(
        contrastRatio(normalColors.color, normalColors.backgroundColor),
      ).toBeGreaterThanOrEqual(4.5)

      await cta.hover()
      const hoverColors = await readCtaColors(cta)
      expect(
        contrastRatio(hoverColors.color, hoverColors.backgroundColor),
      ).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test('localized homepage secondary text remains readable in both color schemes', async ({
  page,
}) => {
  const homepagePaths = ['/zh-Hant/', '/en/']

  await page.setViewportSize({ width: 1440, height: 900 })

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })

    for (const homepagePath of homepagePaths) {
      await page.goto(homepagePath)
      const colors = await readHomepageSecondaryTextColors(page)

      expect(
        contrastRatio(colors.color, colors.backgroundColor),
      ).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test('model selection stacks all cards on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/models')

  const cards = page.getByTestId('model-selection').locator('[data-model-id]')
  const positions = await cards.evaluateAll((cardElements) =>
    cardElements.map((card) => {
      const bounds = card.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y }
    }),
  )
  expect(positions.length).toBeGreaterThan(0)
  const cardX = positions[0]?.x
  if (cardX === undefined) throw new Error('Expected narrow model cards')
  expect(positions.every((position) => Math.abs(position.x - cardX) < 1)).toBe(
    true,
  )
  expect(
    positions.every((position, index) => {
      const previous = positions[index - 1]
      return index === 0 || (previous !== undefined && position.y > previous.y)
    }),
  ).toBe(true)
})

test('model cards keep long localized names on one line', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/models')

  const heading = page.getByRole('heading', {
    name: 'Locating Post (定位柱)',
    exact: true,
  })
  await expect(heading).toBeVisible()

  const layout = await heading.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      fitsViewport: bounds.right <= document.documentElement.clientWidth,
      hasReadableHeight: bounds.height > 0,
    }
  })
  expect(layout.fitsViewport).toBe(true)
  expect(layout.hasReadableHeight).toBe(true)
})

test('shared navigation exposes the configured support choices', async ({
  page,
}) => {
  test.skip(
    configuredSupportProviders.length !== 2,
    'Set both PUBLIC_PORTALY_SUPPORT_URL and PUBLIC_KOFI_SUPPORT_URL to run the two-provider support checks.',
  )

  for (const path of ['/', '/docs/', '/about/', '/cad/box']) {
    await page.goto(path)
    if (path === '/cad/box') await dismissCadErrorToast(page)
    const trigger = supportTrigger(page)

    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await trigger.click()
    const dialog = supportDialog(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('[data-support-provider]')).toHaveCount(2)
    for (const provider of configuredSupportProviders) {
      await expect(
        dialog.locator(`[data-support-provider="${provider.id}"]`),
      ).toHaveAttribute('href', provider.url)
    }
    for (const option of await dialog
      .locator('[data-support-provider]')
      .all()) {
      await expect(option).toHaveAttribute('target', '_blank')
      await expect(option).toHaveAttribute('rel', 'noopener noreferrer')
    }
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  }

  await page.goto('/en/')
  await page.getByTestId('home-maker-support-trigger').click()
  await expect(supportDialog(page)).toBeVisible()
  await expect(
    supportDialog(page).locator('[data-support-provider]'),
  ).toHaveCount(2)
  await page.keyboard.press('Escape')
  await page.goto('/en/about/')
  await page.getByTestId('about-support-trigger').click()
  await expect(supportDialog(page)).toBeVisible()
  await expect(
    supportDialog(page).locator('[data-support-provider]'),
  ).toHaveCount(2)
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/')
  await expect(supportTrigger(page)).toBeVisible()
  await supportTrigger(page).click()
  await expect(supportDialog(page)).toBeVisible()
  await expect(
    supportDialog(page).locator('[data-support-provider]'),
  ).toHaveCount(2)
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBeTruthy()

  await page.keyboard.press('Escape')
  await page.goto('/')
  const linkCount = await page.locator('a').count()
  let supportTriggerFocused = false
  for (let index = 0; index < linkCount + 2; index += 1) {
    await page.keyboard.press('Tab')
    supportTriggerFocused = await supportTrigger(page).evaluate(
      (element) => element === document.activeElement,
    )
    if (supportTriggerFocused) break
  }
  expect(supportTriggerFocused).toBe(true)
  await expect(supportTrigger(page)).toBeFocused()
  const focusStyle = await supportTrigger(page).evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    }
  })
  expect(focusStyle.outlineStyle).not.toBe('none')
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0)

  await page.goto('/cad/box')
  await dismissCadErrorToast(page)
  const currentCadUrl = page.url()
  const portalyProvider = configuredSupportProviders.find(
    (provider) => provider.id === 'portaly',
  )
  if (!portalyProvider)
    throw new Error('Expected a configured Portaly provider')
  const supportOrigin = new URL(portalyProvider.url).origin
  await page.context().route(`${supportOrigin}/**`, async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Support fixture</title>',
    })
  })
  const popupPromise = page.waitForEvent('popup')
  await supportTrigger(page).click()
  await supportDialog(page).locator('[data-support-provider="portaly"]').click()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')
  await expect(popup).toHaveURL(portalyProvider.url)
  await expect(page).toHaveURL(currentCadUrl)
  await popup.close()
})

test('shared navigation exposes a single configured support choice', async ({
  page,
}) => {
  test.skip(
    configuredSupportProviders.length !== 1,
    'Set exactly one support URL to run the single-provider fallback check.',
  )

  const provider = configuredSupportProviders[0]
  if (!provider) throw new Error('Expected one configured support provider')

  await page.goto('/')
  await supportTrigger(page).click()
  const dialog = supportDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-support-provider]')).toHaveCount(1)
  await expect(
    dialog.locator(`[data-support-provider="${provider.id}"]`),
  ).toHaveAttribute('href', provider.url)
})

test('missing support configuration leaves primary routes usable', async ({
  page,
}) => {
  test.skip(
    configuredSupportProviders.length !== 0,
    'Run without either support URL to verify the missing-configuration fallback.',
  )

  for (const path of ['/', '/docs/', '/about/', '/cad/box']) {
    await page.goto(path)
    await expect(supportTrigger(page)).toHaveCount(0)
  }
  await page.goto('/en/')
  await expect(page.getByTestId('home-maker-support-trigger')).toHaveCount(0)
  await page.goto('/en/about/')
  await expect(page.getByTestId('about-support-trigger')).toHaveCount(0)
})

test('local development serves same-origin Vite HMR client', async ({
  page,
}) => {
  await page.goto('/')

  const response = await page.request.get('/@vite/client')
  expect(response.ok()).toBeTruthy()
  expect(await response.text()).not.toContain('local.blesscat.dev')
})

test('CAD root returns to the model selection page', async ({ page }) => {
  await page.goto('/cad/')
  await expect(page).toHaveURL('/zh-Hant/models')
  await expect(
    page.getByRole('heading', {
      name: '選擇 CAD 模型',
    }),
  ).toBeVisible()
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

test('unknown CAD model routes do not initialize the workspace', async ({
  page,
}) => {
  const response = await page.goto('/cad/unknown-model')
  expect(response?.status()).toBe(404)
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  const removedResponse = await page.goto('/cad/box-normal')
  expect(removedResponse?.status()).toBe(404)
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})
