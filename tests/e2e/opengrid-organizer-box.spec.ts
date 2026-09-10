import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid organizer-box is listed and exposes the cavity controls', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/models')

  const card = page
    .getByRole('heading', {
      name: 'Organizer Box (收納方盒)',
      exact: true,
    })
    .locator('..')
  await expect(
    card.getByRole('link', {
      name: '編輯 Organizer Box (收納方盒)',
      exact: true,
    }),
  ).toHaveAttribute('href', '/zh-Hant/cad/opengrid-organizer-box?system=desk')

  await page.goto('/zh-Hant/cad/opengrid-organizer-box')
  await waitForCadReady(page)

  await expect(
    page.getByRole('heading', {
      name: '目前編輯：OpenGrid Organizer Box (收納方盒)',
    }),
  ).toBeVisible()
  await expect(
    page.getByTestId('opengrid-organizer-box-seat-mode').getByRole('radio'),
  ).toHaveCount(3)
  await expect(
    page.getByTestId('opengrid-organizer-box-body-mode').getByRole('radio'),
  ).toHaveCount(2)
  await expect(
    page.getByTestId('opengrid-organizer-box-spacing-mode').getByRole('radio'),
  ).toHaveCount(2)
  await expect(
    page.getByRole('textbox', { name: '孔外圍間距（Y）' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('textbox', { name: '堆疊淨空（Z）' }),
  ).toHaveCount(0)

  const controlOrder = await page
    .locator(
      '[data-testid="opengrid-organizer-box-seat-mode"], [data-testid="opengrid-organizer-box-body-mode"], [data-testid="opengrid-organizer-box-hole-counts"]',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-testid')),
    )
  expect(controlOrder).toEqual([
    'opengrid-organizer-box-seat-mode',
    'opengrid-organizer-box-body-mode',
    'opengrid-organizer-box-hole-counts',
  ])
  const viewport = page.getByTestId('cad-viewport')
  const initialRevision = await viewport.getAttribute('data-model-revision')
  expect(initialRevision).toBeTruthy()
  await expect(
    page.getByTestId('opengrid-organizer-box-layout-summary'),
  ).toContainText('X 2 格 × Y 2 格')

  await page.getByRole('textbox', { name: '孔外圍間距（X）' }).fill('3')
  await page.getByRole('radio', { name: '分開' }).check()
  await expect(
    page.getByRole('textbox', { name: '孔外圍間距（Y）' }),
  ).toHaveValue('3')
  await expect(
    page.getByTestId('opengrid-organizer-box-layout-summary'),
  ).toContainText('X 2 格 × Y 2 格')

  const wallInput = page.getByRole('textbox', { name: '壁厚' })
  await expect(wallInput).toHaveValue('2')
  await wallInput.fill('8')
  await expect(
    page.getByTestId('opengrid-organizer-box-layout-summary'),
  ).toContainText('X 2.5 格 × Y 2.5 格')
  await wallInput.fill('2')
  await expect(
    page.getByTestId('opengrid-organizer-box-layout-summary'),
  ).toContainText('X 2 格 × Y 2 格')

  const shapes = page.getByRole('combobox', { name: '孔形狀' })
  await expect(shapes).toHaveValue('circle')
  await shapes.selectOption('hexagon')
  await expect(shapes).toHaveValue('hexagon')
  await waitForCadReady(page, 90_000)

  const seatMode = page.getByTestId('opengrid-organizer-box-seat-mode')
  const bodyMode = page.getByTestId('opengrid-organizer-box-body-mode')
  const lockingCornerSeat = seatMode.getByRole('radio', {
    name: '鎖定角座',
  })
  await expect(lockingCornerSeat).toBeChecked()
  await expect(bodyMode.getByRole('radio', { name: '普通模式' })).toBeChecked()

  for (const bodyLabel of ['普通模式', '堆疊模式']) {
    await bodyMode.getByRole('radio', { name: bodyLabel }).check()
    for (const seatLabel of ['無角座', '鎖定角座', '內建角座']) {
      await seatMode.getByRole('radio', { name: seatLabel }).check()
      await expect(
        bodyMode.getByRole('radio', { name: bodyLabel }),
      ).toBeChecked()
      await expect(
        seatMode.getByRole('radio', { name: seatLabel }),
      ).toBeChecked()
    }
  }
  await bodyMode.getByRole('radio', { name: '普通模式' }).check()
  await lockingCornerSeat.check()
  await waitForCadReady(page, 90_000)

  const revisionBeforeCornerSeat = await viewport.getAttribute(
    'data-model-revision',
  )
  await seatMode.getByRole('radio', { name: '內建角座' }).check()
  await expect(seatMode.getByRole('radio', { name: '內建角座' })).toBeChecked()
  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    revisionBeforeCornerSeat ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)

  const revisionBeforeLockingCornerSeat = await viewport.getAttribute(
    'data-model-revision',
  )
  await lockingCornerSeat.check()
  await expect(lockingCornerSeat).toBeChecked()
  await expect(
    seatMode.getByRole('radio', { name: '內建角座' }),
  ).not.toBeChecked()
  await expect(bodyMode.getByRole('radio', { name: '普通模式' })).toBeChecked()
  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    revisionBeforeLockingCornerSeat ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)

  const revisionBeforeStackable = await viewport.getAttribute(
    'data-model-revision',
  )
  await bodyMode.getByRole('radio', { name: '堆疊模式' }).check()
  await expect(bodyMode.getByRole('radio', { name: '堆疊模式' })).toBeChecked()
  await expect(seatMode.getByRole('radio', { name: '鎖定角座' })).toBeChecked()

  const stackingZ = page.getByRole('textbox', { name: '堆疊淨空（Z）' })
  await expect(stackingZ).toHaveValue('3.5')
  await expect(wallInput).toHaveValue('3')
  await stackingZ.fill('4.5')
  await seatMode.getByRole('radio', { name: '內建角座' }).check()
  await expect(bodyMode.getByRole('radio', { name: '堆疊模式' })).toBeChecked()
  await bodyMode.getByRole('radio', { name: '普通模式' }).check()
  await expect(stackingZ).toHaveCount(0)
  await bodyMode.getByRole('radio', { name: '堆疊模式' }).check()
  await expect(stackingZ).toHaveValue('4.5')

  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    revisionBeforeStackable ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)
  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    initialRevision ?? '',
  )
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-organizer-box-2x2-hexagon-sm-independent-d20-sx3-sy3-h20-b1-seats-integrated-body-stackable-z4p5.step',
  )
})
