import { expect, test, type Page } from '@playwright/test'
import {
  boundsForGameBox,
  cardBoxInteriorWidth,
  GAME_BOX_CONFIGURATION,
  gameBoxLayout,
  type GameBoxParameters,
} from '../../src/cad-contract/units'
import { skipHeadlessFirefoxWithoutWebGL } from './helpers'

const MODULE_LIMIT = 6

const DEFAULTS = GAME_BOX_CONFIGURATION.defaultParameters
const DEFAULT_CARD_WIDTH = GAME_BOX_CONFIGURATION.defaults.cardWidth
const DEFAULT_CARD_HEIGHT = GAME_BOX_CONFIGURATION.defaults.cardHeight
const DEFAULT_LAYOUT = gameBoxLayout(DEFAULTS)
const DICE_LAYOUT = gameBoxLayout({ ...DEFAULTS, module2Type: 'dice' })
const CARD_DEPTH_30_LAYOUT = gameBoxLayout({
  ...DEFAULTS,
  module1CardDepth: 30,
})
/** A card module, a dice module and a card module of 20 mm. */
const CARD_DICE_CARD_LAYOUT = gameBoxLayout({
  ...DEFAULTS,
  module1CardDepth: 30,
  module2Type: 'dice',
  module3Type: 'cards',
  module3CardDepth: 20,
})
/** The same list without the dice module: two card modules side by side. */
const TWO_CARD_MODULES_LAYOUT = gameBoxLayout({
  ...DEFAULTS,
  module1CardDepth: 30,
  module2Type: 'cards',
  module2CardDepth: 20,
})

/** The panel shows a length rounded to two decimals, without trailing zeros. */
function shownLength(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function interiorSizeText(layout: typeof DEFAULT_LAYOUT): string {
  return `${shownLength(cardBoxInteriorWidth(DEFAULT_CARD_WIDTH))} × ${shownLength(layout.storageDepth)} × ${shownLength(DEFAULT_CARD_HEIGHT)} mm`
}

/**
 * The outer size describes the whole product: the box body with the sliding
 * lid on top, measured in the assembled frame.
 */
function outerSizeText(parameters: Partial<GameBoxParameters>): string {
  const bounds = boundsForGameBox({
    ...DEFAULTS,
    ...parameters,
    part: 'assembly',
  })
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[1] - bounds.min[1]
  const height = bounds.max[2] - bounds.min[2]
  return `${shownLength(width)} × ${shownLength(depth)} × ${shownLength(height)} mm`
}

async function openGameBox(page: Page): Promise<void> {
  await page.goto('/zh-Hant/cad/game-box')
  await expect(page.getByTestId('game-box-modules')).toBeVisible()
}

async function addModule(page: Page, type: 'cards' | 'dice'): Promise<void> {
  await page.getByTestId('game-box-add').click()
  await page.getByTestId(`game-box-add-${type}`).click()
}

test.describe('game-box', () => {
  test('adds modules, keeps the derived sizes in sync and stops at six', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    // The default list is a single card module; the derived depth follows it.
    await expect(page.getByTestId('game-box-module-1')).toBeVisible()
    await expect(page.getByTestId('game-box-module-2')).toHaveCount(0)
    await expect(page.getByTestId('game-box-storage-depth')).toHaveText(
      `${shownLength(DEFAULT_LAYOUT.storageDepth)} mm`,
    )
    await expect(page.getByTestId('game-box-interior-size')).toHaveText(
      interiorSizeText(DEFAULT_LAYOUT),
    )
    await expect(page.getByTestId('game-box-outer-size')).toHaveText(
      outerSizeText({}),
    )
    await expect(page.getByTestId('game-box-module-1')).toContainText(
      '佔用長度',
    )
    await expect(page.getByTestId('game-box-module-1-length')).toHaveText(
      `${shownLength(DEFAULT_LAYOUT.modules[0]?.length ?? Number.NaN)} mm`,
    )

    // A dice module adds its own length to the storage depth.
    await addModule(page, 'dice')
    await expect(page.getByTestId('game-box-module-2')).toBeVisible()
    await expect(page.getByTestId('game-box-module-2')).toContainText('骰子匣')
    await expect(page.getByTestId('game-box-module-2-length')).toHaveText(
      `${shownLength(DICE_LAYOUT.modules[1]?.length ?? Number.NaN)} mm`,
    )
    await expect(page.getByTestId('game-box-storage-depth')).toHaveText(
      `${shownLength(DICE_LAYOUT.storageDepth)} mm`,
    )
    await expect(page.getByTestId('game-box-interior-size')).toHaveText(
      interiorSizeText(DICE_LAYOUT),
    )
    // The outer size follows the storage depth of the module list.
    await expect(page.getByTestId('game-box-outer-size')).toHaveText(
      outerSizeText({ module2Type: 'dice' }),
    )

    // The list never grows past six modules.
    for (let index = 0; index < MODULE_LIMIT - 2; index += 1) {
      await addModule(page, 'cards')
    }
    await expect(page.getByTestId('game-box-module-6')).toBeVisible()
    await expect(page.getByTestId('game-box-add')).toBeDisabled()
    await expect(page.getByTestId('game-box-module-limit')).toBeVisible()
  })

  test('keeps the default card depth of the first module and never shows a broken size', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    const module1 = page.getByTestId('game-box-module-1')
    const depthField = module1.getByRole('textbox', { name: '卡片區厚度' })
    const restore = module1.getByRole('button', { name: '復原卡片區厚度' })

    // The default of the first module is not an edit.
    await expect(restore).toHaveCount(0)

    await depthField.fill('30')
    await expect(restore).toBeVisible()
    await restore.click()
    await expect(depthField).toHaveValue(
      String(GAME_BOX_CONFIGURATION.defaults.firstModuleCardDepth),
    )

    // An unfinished field never breaks the derived sizes.
    await depthField.fill('')
    for (const testId of [
      'game-box-interior-size',
      'game-box-outer-size',
      'game-box-storage-depth',
      'game-box-module-1-length',
    ]) {
      await expect(page.getByTestId(testId)).not.toContainText('NaN')
    }
  })

  test('labels the die count in dice in both locales', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)

    const cases = [
      { locale: 'zh-Hant', label: '骰子顆數', unit: '顆' },
      { locale: 'en', label: 'Die count', unit: 'dice' },
    ]

    for (const { locale, label, unit } of cases) {
      await page.goto(`/${locale}/cad/game-box`)
      // Every locale starts from the default module list.
      await page.evaluate(() => window.localStorage.clear())
      await page.reload()
      await expect(page.getByTestId('game-box-modules')).toBeVisible()
      await addModule(page, 'dice')

      // The unit stands next to the value of the die count.
      const row = page
        .getByTestId('game-box-module-2')
        .getByRole('textbox', { name: label })
        .locator('..')
      await expect(row).toContainText(unit)
      await expect(row).not.toContainText('mm')
      await expect(row).not.toContainText('columns')
    }
  })

  test('deletes a middle module and keeps the remaining depth', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await page
      .getByTestId('game-box-module-1')
      .getByRole('textbox', { name: '卡片區厚度' })
      .fill('30')
    // The derived depth follows the module thickness.
    await expect(page.getByTestId('game-box-module-1-length')).toHaveText(
      `${shownLength(CARD_DEPTH_30_LAYOUT.modules[0]?.length ?? Number.NaN)} mm`,
    )
    await expect(page.getByTestId('game-box-storage-depth')).toHaveText(
      `${shownLength(CARD_DEPTH_30_LAYOUT.storageDepth)} mm`,
    )

    await addModule(page, 'dice')
    await addModule(page, 'cards')
    await page
      .getByTestId('game-box-module-3')
      .getByRole('textbox', { name: '卡片區厚度' })
      .fill('20')
    await expect(page.getByTestId('game-box-module-3-length')).toHaveText(
      `${shownLength(CARD_DICE_CARD_LAYOUT.modules[2]?.length ?? Number.NaN)} mm`,
    )

    // Removing the middle module closes the gap: the third module keeps its
    // own depth and moves into the second slot.
    await page.getByTestId('game-box-module-2-delete').click()
    await expect(page.getByTestId('game-box-module-3')).toHaveCount(0)
    await expect(page.getByTestId('game-box-module-2')).toContainText('卡片區')
    await expect(
      page
        .getByTestId('game-box-module-2')
        .getByRole('textbox', { name: '卡片區厚度' }),
    ).toHaveValue('20')
    await expect(page.getByTestId('game-box-module-2-length')).toHaveText(
      `${shownLength(TWO_CARD_MODULES_LAYOUT.modules[1]?.length ?? Number.NaN)} mm`,
    )
  })

  test('reorders the modules and swaps their fields', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await addModule(page, 'dice')
    await addModule(page, 'cards')
    await expect(page.getByTestId('game-box-module-1')).toContainText('卡片區')
    await expect(page.getByTestId('game-box-module-2')).toContainText('骰子匣')

    await page.getByTestId('game-box-module-2-move-earlier').click()
    await expect(page.getByTestId('game-box-module-1')).toContainText('骰子匣')
    await expect(page.getByTestId('game-box-module-2')).toContainText('卡片區')
    await expect(
      page
        .getByTestId('game-box-module-1')
        .getByRole('textbox', { name: '骰子邊長' }),
    ).toHaveValue('16')
    await expect(
      page
        .getByTestId('game-box-module-2')
        .getByRole('textbox', { name: '卡片區厚度' }),
    ).toHaveValue('60')

    await page.getByTestId('game-box-module-1-move-later').click()
    await expect(page.getByTestId('game-box-module-1')).toContainText('卡片區')
    await expect(page.getByTestId('game-box-module-2')).toContainText('骰子匣')
    // The last module cannot move any further.
    await expect(
      page.getByTestId('game-box-module-3-move-later'),
    ).toBeDisabled()
  })

  test('keeps the last module and disables the delete action', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await expect(page.getByTestId('game-box-module-1-delete')).toBeDisabled()
    await addModule(page, 'dice')
    await expect(page.getByTestId('game-box-module-1-delete')).toBeEnabled()
    await expect(page.getByTestId('game-box-module-2-delete')).toBeEnabled()

    await page.getByTestId('game-box-module-2-delete').click()
    await expect(page.getByTestId('game-box-module-2')).toHaveCount(0)
    await expect(page.getByTestId('game-box-module-1-delete')).toBeDisabled()
  })

  test('offers the parts of the current module list and resets a stale selection', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await addModule(page, 'dice')
    await addModule(page, 'cards')
    const part = page.getByTestId('game-box-part')
    // The dice module sits between the two card modules, so no two card
    // modules touch: the holder is its own divider and no divider plate is
    // printed.
    await expect(part.locator('option')).toHaveText([
      '組裝',
      '盒體',
      '滑蓋',
      '封面片',
      '骰子匣（模組 2）',
    ])

    await part.selectOption('module2')
    await expect(part).toHaveValue('module2')

    // Deleting the dice module removes its part, so the selection falls back
    // to the assembly in the same snapshot.
    await page.getByTestId('game-box-module-2-delete').click()
    await expect(part).toHaveValue('assembly')
    await expect(part.locator('option')).toHaveText([
      '組裝',
      '盒體',
      '滑蓋',
      '封面片',
      '分隔卡 1',
    ])
  })

  test('gates the downloads while the assembly is selected', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await expect(page.getByTestId('cad-download-hint')).toBeVisible()
    await expect(page.getByTestId('cad-download-hint')).toHaveText(
      '請選擇零件以下載',
    )
    await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '下載 3MF' })).toHaveCount(0)
  })

  test('shows the card size presets and applies the chosen card size', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    // The preset row shows the restore button followed by the seven presets.
    const labels = await page
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons
          .filter((button) =>
            button.matches(
              '[data-testid^="cad-preset-"], [aria-label="全部恢復預設"]',
            ),
          )
          .map((button) => button.getAttribute('aria-label')),
      )
    expect(labels).toEqual([
      '全部恢復預設',
      '塔羅 70×120',
      '標準 TCG 63×88',
      '標準 TCG 含套 66×91',
      '日版小型 59×86',
      '日版小型 含套 62×89',
      '美式迷你 41×63',
      '歐版迷你 44×68',
    ])

    const viewport = page.getByTestId('cad-viewport')
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
    const revision = await viewport.getAttribute('data-model-revision')

    await page.getByTestId('cad-preset-standard-tcg-63x88').click()
    await expect(
      page.getByRole('textbox', { name: '卡片寬（X）' }),
    ).toHaveValue('63')
    await expect(
      page.getByRole('textbox', { name: '卡片高（Z）' }),
    ).toHaveValue('88')
    // The default module list is unchanged, so the derived depth stays the
    // default depth (derived from the module list, not a preset constant).
    await expect(page.getByTestId('game-box-storage-depth')).toHaveText(
      `${shownLength(DEFAULT_LAYOUT.storageDepth)} mm`,
    )
    // The model is rebuilt with the new card size.
    await expect(viewport).not.toHaveAttribute(
      'data-model-revision',
      revision!,
      { timeout: 120_000 },
    )
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
  })

  test('keeps the module list when a card size preset is applied', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    // A module the user built up must survive the preset.
    await addModule(page, 'dice')
    await expect(page.getByTestId('game-box-module-2')).toBeVisible()

    await page.getByTestId('cad-preset-standard-tcg-63x88').click()
    await expect(
      page.getByRole('textbox', { name: '卡片寬（X）' }),
    ).toHaveValue('63')
    await expect(
      page.getByRole('textbox', { name: '卡片高（Z）' }),
    ).toHaveValue('88')
    await expect(page.getByTestId('game-box-module-2')).toContainText('骰子匣')
    await expect(page.getByTestId('game-box-module-3')).toHaveCount(0)
  })

  test('does not apply a card size preset that does not fit the modules', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await addModule(page, 'dice')
    await expect(page.getByTestId('game-box-module-2')).toBeVisible()

    // Nine dice of 16 mm do not fit a 41 × 63 mm card, so the preset is not
    // applied and the parameters stay as they are.
    await page.getByTestId('cad-preset-mini-american-41x63').click()
    await expect(page.getByTestId('cad-preset-notice')).toBeVisible()
    await expect(page.getByTestId('cad-preset-notice')).toContainText('模組')
    await expect(
      page.getByRole('textbox', { name: '卡片寬（X）' }),
    ).toHaveValue('70')
    await expect(page.getByTestId('game-box-module-2')).toBeVisible()

    // Restoring the defaults writes new parameters, so the notice no longer
    // describes the current state and disappears.
    await page.getByRole('button', { name: '全部恢復預設' }).click()
    await expect(page.getByTestId('cad-preset-notice')).toHaveCount(0)
    await expect(page.getByTestId('game-box-module-2')).toHaveCount(0)
  })

  test('shows a module error inside its own module only', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await addModule(page, 'dice')
    await addModule(page, 'cards')
    await page
      .getByTestId('game-box-module-2')
      .getByRole('textbox', { name: '骰子邊長' })
      .fill('40')

    const error = page.locator('#module2DiceSize-error')
    await expect(error).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByTestId('game-box-module-1').locator('#module2DiceSize-error'),
    ).toHaveCount(0)
    await expect(
      page.getByTestId('game-box-module-3').locator('#module2DiceSize-error'),
    ).toHaveCount(0)
  })

  test('restores the module list after reopening and falls back to the defaults', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await addModule(page, 'dice')
    await addModule(page, 'cards')
    await expect(page.getByTestId('game-box-module-3')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('game-box-module-3')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId('game-box-module-2')).toContainText('骰子匣')

    // A stored snapshot that breaks the module order is dropped, so the
    // component starts from the defaults again.
    await page.evaluate(() => {
      window.localStorage.setItem(
        'shape-shortcut.component-parameters',
        JSON.stringify({
          version: 2,
          values: {
            legacy: {
              'game-box': {
                part: 'assembly',
                cardWidth: 70,
                cardHeight: 120,
                module1Type: 'none',
                module1CardDepth: 60,
                module1DiceSize: 16,
                module1DiceCount: 9,
                module2Type: 'dice',
                module2CardDepth: 30,
                module2DiceSize: 16,
                module2DiceCount: 9,
                module3Type: 'none',
                module3CardDepth: 30,
                module3DiceSize: 16,
                module3DiceCount: 9,
                module4Type: 'none',
                module4CardDepth: 30,
                module4DiceSize: 16,
                module4DiceCount: 9,
                module5Type: 'none',
                module5CardDepth: 30,
                module5DiceSize: 16,
                module5DiceCount: 9,
                module6Type: 'none',
                module6CardDepth: 30,
                module6DiceSize: 16,
                module6DiceCount: 9,
              },
            },
          },
        }),
      )
    })
    await page.reload()
    await expect(page.getByTestId('game-box-module-1')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId('game-box-module-2')).toHaveCount(0)
    await expect(page.getByTestId('game-box-storage-depth')).toHaveText(
      `${shownLength(DEFAULT_LAYOUT.storageDepth)} mm`,
    )
  })

  test('enables the downloads for a single part once the revision is built', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    await page.getByTestId('game-box-part').selectOption('box')
    await expect(page.getByTestId('cad-download-hint')).toBeHidden()
    await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
      timeout: 120_000,
    })
    await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled({
      timeout: 120_000,
    })
  })

  test('regenerates the model after a list change', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)

    const viewport = page.getByTestId('cad-viewport')
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
    const revision = await viewport.getAttribute('data-model-revision')

    await addModule(page, 'dice')
    await expect(viewport).not.toHaveAttribute(
      'data-model-revision',
      revision!,
      {
        timeout: 120_000,
      },
    )
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
  })

  test('shows no raw message keys in either locale', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)

    for (const locale of ['zh-Hant', 'en']) {
      await page.goto(`/${locale}/cad/game-box`)
      await expect(page.getByTestId('game-box-modules')).toBeVisible()
      await expect(page.getByTestId('game-box-part')).toBeVisible()
      await expect(page.locator('body')).not.toContainText('⟦')
    }
  })

  test('edits a divider label and shows its field error only on that divider', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)
    // Three modules give the two boundaries divider1 and divider2.
    await addModule(page, 'cards')
    await addModule(page, 'cards')

    // A 21-character label fails the contract cap. The input clamps typing
    // and even fill at the cap, so the value is set directly: validation
    // owns the rejection and renders the field error inside divider 2's
    // item only.
    await page
      .getByTestId('game-box-divider-2-text')
      .evaluate((element, value) => {
        const input = element as HTMLInputElement
        input.removeAttribute('maxlength')
        input.value = value
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }, 'W'.repeat(21))
    await expect(page.locator('#divider2Text-error')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.locator('#divider1Text-error')).toHaveCount(0)

    // Back under the cap: the error clears and the model regenerates.
    const viewport = page.getByTestId('cad-viewport')
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
    await page.getByTestId('game-box-divider-2-text').fill('SPELLS')
    await expect(page.locator('#divider2Text-error')).toHaveCount(0)
    await expect(page.getByTestId('game-box-divider-2-text')).toHaveValue(
      'SPELLS',
    )
  })

  test('chooses a divider card and the cover part and regenerates', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)
    // Four card modules give the three cards pairs divider1..divider3.
    await addModule(page, 'cards')
    await addModule(page, 'cards')
    await addModule(page, 'cards')
    // The compartments shrink to 24 mm so the depth stays inside the range.
    for (let position = 1; position <= 4; position += 1) {
      await page
        .getByTestId(`game-box-module-${position}`)
        .getByRole('textbox', { name: '卡片區厚度' })
        .fill('24')
    }

    const viewport = page.getByTestId('cad-viewport')
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
    const revision = await viewport.getAttribute('data-model-revision')

    const part = page.getByTestId('game-box-part')
    await part.selectOption('divider3')
    await expect(viewport).not.toHaveAttribute(
      'data-model-revision',
      revision!,
      {
        timeout: 120_000,
      },
    )
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
    const dividerRevision = await viewport.getAttribute('data-model-revision')

    await part.selectOption('cover')
    await expect(viewport).not.toHaveAttribute(
      'data-model-revision',
      dividerRevision!,
      { timeout: 120_000 },
    )
    await expect(viewport).toHaveAttribute('data-model-revision', /.+/, {
      timeout: 120_000,
    })
  })

  test('keeps the divider and cover settings across list operations', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)
    // The default list is one cards module; adding a second one creates
    // the first cards pair and its divider card.
    await addModule(page, 'cards')

    await page.getByTestId('game-box-divider-1-text').fill('RED')
    await page.getByTestId('game-box-part').selectOption('cover')
    await page.getByLabel('標題', { exact: true }).fill('GO FISH')

    // Adding a dice module leaves the cards pair alone, so divider 1 keeps
    // its settings.
    await addModule(page, 'dice')
    await expect(page.getByTestId('game-box-divider-1-text')).toHaveValue('RED')
    await expect(page.getByTestId('game-box-divider-2-text')).toHaveCount(0)

    // Moving a module swaps only the module contents: every divider card
    // keeps its settings (調整順序不改變分隔卡).
    await page.getByTestId('game-box-module-1-move-later').click()
    await expect(page.getByTestId('game-box-divider-1-text')).toHaveValue('RED')

    // Deleting the dice module keeps the cards pair, so divider 1 stays.
    await page.getByTestId('game-box-module-3-delete').click()
    await expect(page.getByTestId('game-box-divider-1-text')).toHaveValue('RED')
    await page.getByTestId('game-box-part').selectOption('cover')
    await expect(page.getByLabel('標題', { exact: true })).toHaveValue(
      'GO FISH',
    )
  })

  test('a cover too tall for the card shows the localized reason', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)
    await page.getByTestId('game-box-part').selectOption('cover')

    // Import a tall SVG (aspect 2) at width 25: at card height 63 the art
    // stacks 50 mm past the 49 mm safe area, so validation names the SVG
    // width field and shows the localized reason as text.
    await page
      .getByTestId('game-box-svg-import')
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'tall.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from(
          [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200">',
            '  <rect x="40" y="10" width="20" height="180" fill="#00ff00"/>',
            '</svg>',
          ].join('\n'),
        ),
      })
    await expect(
      page
        .getByTestId('game-box-svg-import')
        .getByText('封面圖稿已保存', { exact: false }),
    ).toBeVisible({ timeout: 30_000 })

    await page.getByRole('textbox', { name: '卡片高（Z）' }).fill('63')
    await expect(page.locator('#coverSvgWidth-error')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.locator('#coverSvgWidth-error')).toContainText('堆疊高度')
    await expect(page.locator('#coverSvgWidth-error')).not.toContainText('⟦')
  })

  test('a too-long divider label names its plate in the error', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)
    await addModule(page, 'cards')
    await addModule(page, 'cards')

    // A 20-character W label cannot fit the tab: the build fails and the
    // localized error names divider 2 with no unresolved placeholder.
    await page.getByTestId('game-box-divider-2-text').fill('W'.repeat(20))
    const alert = page.getByRole('alert').filter({ hasText: '分隔卡' })
    await expect(alert).toBeVisible({ timeout: 120_000 })
    await expect(alert).toContainText('分隔卡 2')
    await expect(alert).not.toContainText('⟦')
  })

  test('a list operation that creates a pair starts it from the defaults', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)
    await addModule(page, 'cards')
    await addModule(page, 'dice')

    // The pair between modules 1|2 carries the user's label.
    await page.getByTestId('game-box-divider-1-text').fill('RED')

    // Moving the dice behind the cards pair removes that pair: the ordinal
    // resets, so the input disappears from the panel.
    await page.getByTestId('game-box-module-2-move-later').click()
    await expect(page.getByTestId('game-box-divider-1-text')).toHaveCount(0)

    // Adding a cards module creates a brand-new pair: it must start from
    // the defaults, not resurrect the old label.
    await addModule(page, 'cards')
    await expect(page.getByTestId('game-box-divider-1-text')).toHaveValue('', {
      timeout: 5_000,
    })
  })

  test('gates the two-color 3MF to the parts that carry art', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)
    await addModule(page, 'cards')

    const part = page.getByTestId('game-box-part')
    const threeMfButton = page.getByRole('button', { name: '下載 3MF' })

    // A blank divider plate is STEP/STL only.
    await part.selectOption('divider1')
    await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
      timeout: 120_000,
    })
    await expect(threeMfButton).toHaveCount(0)

    // The labelled divider gains the two-color 3MF.
    await page.getByTestId('game-box-divider-1-text').fill('RED')
    await expect(threeMfButton).toBeEnabled({ timeout: 120_000 })

    // The default cover has the GAME title, so it ships a 3MF; a blank
    // cover loses it.
    await part.selectOption('cover')
    await expect(threeMfButton).toBeEnabled({ timeout: 120_000 })
    await page.getByLabel('標題', { exact: true }).fill('')
    await expect(threeMfButton).toBeHidden({ timeout: 120_000 })

    // The box part never offers a 3MF.
    await part.selectOption('box')
    await expect(threeMfButton).toHaveCount(0)
  })

  test('imports a cover SVG behind the Beta badge and falls back when the data is lost', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240_000)
    skipHeadlessFirefoxWithoutWebGL(browserName)
    await openGameBox(page)
    await page.getByTestId('game-box-part').selectOption('cover')

    const svgImport = page.getByTestId('game-box-svg-import')
    await expect(svgImport).toBeVisible()
    await expect(svgImport.getByText('Beta', { exact: true })).toBeVisible()

    await svgImport.locator('input[type="file"]').setInputFiles({
      name: 'cover.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">',
          '  <rect x="10" y="5" width="30" height="20" fill="#ff0000"/>',
          '</svg>',
        ].join('\n'),
      ),
    })
    await expect(
      svgImport.getByText('封面圖稿已保存', { exact: false }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('game-box-svg-clear')).toBeVisible()

    // Losing the stored outlines falls back to the text-only layout with a
    // notice, and the SVG flag resets so the export gating matches what the
    // worker can build.
    await page.evaluate(() => {
      window.localStorage.setItem(
        'shape-shortcut:game-box-cover-svg:v1',
        'not json',
      )
    })
    await page.reload()
    await expect(page.getByTestId('game-box-part')).toHaveValue('cover', {
      timeout: 30_000,
    })
    await expect(
      page
        .getByTestId('game-box-svg-import')
        .getByText('封面圖稿遺失或無法讀取', { exact: false }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('game-box-svg-clear')).toHaveCount(0)
  })
})
