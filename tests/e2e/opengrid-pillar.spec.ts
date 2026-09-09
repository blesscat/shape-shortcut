import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

test('OpenGrid pillar is listed in its family and exposes locking and positioning modes', async ({
  page,
}) => {
  await page.goto('/models')

  const modelLink = page
    .getByRole('heading', { name: 'Locating Post (定位柱)', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 Locating Post (定位柱)', exact: true })
  await expect(modelLink).toHaveAttribute(
    'href',
    /\/cad\/opengrid-pillar(?:\?system=desk)?$/,
  )
  await modelLink.click()

  await expect(page).toHaveURL(/\/cad\/opengrid-pillar(?:\?system=desk)?$/)
  await expect(
    page.getByRole('heading', { name: '目前編輯：Locating Post (定位柱)' }),
  ).toBeVisible()

  const positioning = page.getByRole('radio', { name: '物件定位用' })
  const detachable = page.getByRole('radio', { name: '鎖定角座' })
  await expect(page.getByRole('radio')).toHaveCount(2)
  await expect(positioning).toBeVisible()
  await expect(detachable).toBeVisible()
  await expect(detachable).toBeChecked()
  await expect(positioning).not.toBeChecked()
  await expect(
    page.getByText(
      '搭配各元件的鎖定角座插槽使用，壓入後旋轉即可完成定位與鎖定。',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('slider', { name: 'X 偏移', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('slider', { name: 'Y 偏移', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByText(/請選擇支柱版本/)).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveCount(0)
  await expect(page.getByRole('slider', { name: /總長度/ })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: '連接底版用' })).toHaveCount(
    0,
  )
  await expect(
    page.getByRole('textbox', { name: /角座定位段長度/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: /角座定位段長度/ }),
  ).toHaveValue('3.8')
  const detachableOffsetSlider = page.getByRole('slider', {
    name: /XY 直徑增量/,
  })
  await expect(detachableOffsetSlider).toBeVisible()
  await expect(detachableOffsetSlider).toHaveAttribute('min', '-1')
  await expect(detachableOffsetSlider).toHaveAttribute('max', '1')
  await expect(detachableOffsetSlider).toHaveAttribute('step', '0.1')

  await positioning.check()
  await expect(positioning).toBeChecked()
  await expect(page.getByRole('textbox', { name: /總長度/ })).toBeVisible()
  await expect(page.getByRole('slider', { name: /總長度/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveValue('10')
  await expect(page.getByRole('slider', { name: /XY 直徑增量/ })).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: /角座定位段長度/ }),
  ).toHaveCount(0)
  await detachable.check()
  await expect(detachable).toBeChecked()
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveCount(0)
  await expect(page.getByRole('slider', { name: /總長度/ })).toHaveCount(0)
  await expect(
    page.getByRole('textbox', { name: /角座定位段長度/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: /角座定位段長度/ }),
  ).toHaveValue('3.8')
  await expect(page.getByRole('slider', { name: /XY 直徑增量/ })).toBeVisible()
})

test('OpenGrid pillar exports deterministic files for both pillar modes', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-pillar')
  await waitForCadReady(page)

  const detachable = page.getByRole('radio', { name: '鎖定角座' })
  const positioning = page.getByRole('radio', { name: '物件定位用' })

  const detachableStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const detachableStep = await detachableStepPromise
  expect(detachableStep.suggestedFilename()).toBe(
    'pillar-5.3-detachable-corner-seat.step',
  )
  expect((await detachableStep.createReadStream())?.readable).toBeTruthy()

  await positioning.check()
  await page.getByRole('textbox', { name: /總長度/ }).fill('25')
  await page.getByRole('textbox', { name: /XY 直徑增量/ }).fill('0.2')
  await waitForCadReady(page)
  const stlPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stl = await stlPromise
  expect(stl.suggestedFilename()).toBe('pillar-25-positioning-xy0.2.stl')
  expect(await readBinaryStlByteLength(stl)).toBeGreaterThan(84)

  const positioningStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const positioningStep = await positioningStepPromise
  expect(positioningStep.suggestedFilename()).toBe(
    'pillar-25-positioning-xy0.2.step',
  )

  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByRole('radio', { name: '物件定位用' })).toBeChecked()
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveValue('25')
  await expect(page.getByRole('textbox', { name: /XY 直徑增量/ })).toHaveValue(
    '0.2',
  )

  await detachable.check()
  await waitForCadReady(page)
  const detachableStepAgainPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const detachableStepAgain = await detachableStepAgainPromise
  expect(detachableStepAgain.suggestedFilename()).toBe(
    'pillar-5.3-detachable-corner-seat.step',
  )

  await page.getByRole('textbox', { name: /角座定位段長度/ }).fill('5')
  await page.getByRole('textbox', { name: /XY 直徑增量/ }).fill('0.1')
  await waitForCadReady(page)
  const parameterizedStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const parameterizedStep = await parameterizedStepPromise
  expect(parameterizedStep.suggestedFilename()).toBe(
    'pillar-6.5-detachable-corner-seat-z5-xy0.1.step',
  )

  await positioning.check()
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveValue('10')
  await expect(page.getByRole('textbox', { name: /XY 直徑增量/ })).toHaveValue(
    '0',
  )
  await detachable.check()
  await expect(
    page.getByRole('textbox', { name: /角座定位段長度/ }),
  ).toHaveValue('3.8')
  await expect(page.getByRole('textbox', { name: /XY 直徑增量/ })).toHaveValue(
    '0',
  )
})
