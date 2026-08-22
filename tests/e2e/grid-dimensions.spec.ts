import { expect, test, type Locator } from '@playwright/test'

async function expectSameRow(first: Locator, second: Locator): Promise<void> {
  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThanOrEqual(1)
}

test('grid dimension calculators apply counts and preserve manual controls', async ({
  page,
}) => {
  const fixtures = [
    {
      path: '/cad/modular-grid-base',
      targetX: '59',
      targetY: '41',
      expectedColumns: '2',
      expectedRows: '2',
      expectedDimensions: 'X 40 mm、Y 40 mm',
      invalidX: '19',
      invalidMessage: '20 mm',
    },
    {
      path: '/cad/hsw-cell',
      targetX: '47.7',
      targetY: '59.1',
      expectedColumns: '2',
      expectedRows: '2',
      expectedDimensions: 'X 47.69 mm、Y 59 mm',
      invalidX: '20',
      invalidMessage: 'HSW',
    },
  ]

  for (const fixture of fixtures) {
    await page.goto(fixture.path)
    const calculator = page.getByTestId('grid-dimension-calculator')
    const targetX = calculator.getByRole('textbox', {
      name: 'X（mm）',
    })
    const targetY = calculator.getByRole('textbox', {
      name: 'Y（mm）',
    })
    const calculateButton = calculator.getByRole('button', {
      name: '計算格數',
    })

    await expect(targetX).toBeVisible()
    await expect(targetY).toBeVisible()
    await targetX.fill(fixture.targetX)
    await targetY.fill(fixture.targetY)
    await expect(calculator.getByRole('button', { name: /^復原/ })).toHaveCount(
      0,
    )
    await calculateButton.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('slider', { name: 'X' })).toHaveValue(
      fixture.expectedColumns,
    )
    await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue(
      fixture.expectedRows,
    )
    await expect(page.getByTestId('grid-dimension-result')).toContainText(
      fixture.expectedDimensions,
    )

    const calculateButtonBottomBeforeError = await calculateButton.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    await targetX.fill(fixture.invalidX)
    await calculateButton.click()
    await expect(targetX).toHaveAttribute('aria-invalid', 'true')
    await expect(targetX).toHaveAttribute(
      'aria-describedby',
      'grid-dimension-x-error',
    )
    await expect(calculator.getByRole('alert')).toContainText(
      fixture.invalidMessage,
    )
    const calculateButtonBottomAfterError = await calculateButton.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    expect(
      Math.abs(
        calculateButtonBottomAfterError - calculateButtonBottomBeforeError,
      ),
    ).toBeLessThanOrEqual(1)
    await expect(page.getByRole('slider', { name: 'X' })).toHaveValue(
      fixture.expectedColumns,
    )
    await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue(
      fixture.expectedRows,
    )
  }
})

test('OpenGrid print planner applies the practical primary piece and preserves half-cells', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')
  await page
    .getByRole('combobox', { name: 'OpenGrid X 半格方向' })
    .selectOption('right')
  await page
    .getByRole('combobox', { name: 'OpenGrid Y 半格方向' })
    .selectOption('top')
  await page.getByRole('checkbox', { name: 'OpenGrid 正中心螺絲孔' }).check()
  await page
    .getByRole('combobox', { name: 'OpenGrid 螺絲孔模式' })
    .selectOption('custom')
  await page.getByRole('button', { name: '內部交界第 1 行第 1 列' }).click()
  await expect(page.getByText('已選 1 孔')).toBeVisible()

  const calculator = page.getByTestId('grid-dimension-calculator')
  await calculator.getByRole('textbox', { name: '目標 X（mm）' }).fill('1000')
  await calculator.getByRole('textbox', { name: '目標 Y（mm）' }).fill('1000')
  await calculator.getByRole('textbox', { name: '列印機 X（mm）' }).fill('256')
  await calculator.getByRole('textbox', { name: '列印機 Y（mm）' }).fill('256')
  await calculator.getByRole('button', { name: '計算列印分片' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('7.5')
  await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue('7.5')
  await expect(
    page.getByRole('combobox', { name: 'OpenGrid X 半格方向' }),
  ).toHaveValue('right')
  await expect(
    page.getByRole('combobox', { name: 'OpenGrid Y 半格方向' }),
  ).toHaveValue('top')
  await expect(
    page.getByRole('checkbox', { name: 'OpenGrid 正中心螺絲孔' }),
  ).toBeChecked()
  await expect(
    page.getByRole('combobox', { name: 'OpenGrid 螺絲孔模式' }),
  ).toHaveValue('custom')
  await expect(page.getByText('已選 1 孔')).toBeVisible()

  const result = page.getByTestId('grid-print-plan-result')
  await expect(result).toContainText('目標：35 × 35 格')
  await expect(result).toContainText('完整格數')
  await expect(result).toContainText('列印機上限：9 × 9 格')
  await expect(result).toContainText('主要片：7 × 7 格')
  await expect(result).toContainText('共 25 片')

  const xSlider = page.getByRole('slider', { name: 'X' })
  await xSlider.fill('8.5')
  await expect(xSlider).toHaveValue('8.5')

  await calculator.getByRole('textbox', { name: '目標 X（mm）' }).fill('27')
  await calculator.getByRole('button', { name: '計算列印分片' }).click()
  const invalidTarget = calculator.getByRole('textbox', {
    name: '目標 X（mm）',
  })
  await expect(invalidTarget).toHaveAttribute('aria-invalid', 'true')
  await expect(invalidTarget).toHaveAttribute(
    'aria-describedby',
    'opengrid-print-plan-target-x-error',
  )
  await expect(calculator.getByRole('alert')).toContainText('28 mm')
  await expect(xSlider).toHaveValue('8.5')
  await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue('7.5')

  await calculator.getByRole('textbox', { name: '目標 X（mm）' }).fill('1000')
  await calculator.getByRole('textbox', { name: '列印機 X（mm）' }).fill('27')
  await calculator.getByRole('button', { name: '計算列印分片' }).click()
  const invalidPrinter = calculator.getByRole('textbox', {
    name: '列印機 X（mm）',
  })
  await expect(invalidPrinter).toHaveAttribute('aria-invalid', 'true')
  await expect(invalidPrinter).toHaveAttribute(
    'aria-describedby',
    'opengrid-print-plan-printer-x-error',
  )
  await expect(calculator.getByRole('alert')).toContainText('28 mm')
  await expect(xSlider).toHaveValue('8.5')
  await expect(
    page.getByRole('checkbox', { name: 'OpenGrid 正中心螺絲孔' }),
  ).toBeChecked()
  await expect(page.getByText('已選 1 孔')).toBeVisible()
})

test('OpenGrid fills a calculated remainder with a persisted centered frame', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')
  await page
    .getByRole('combobox', { name: 'OpenGrid X 半格方向' })
    .selectOption('right')
  await page.getByRole('slider', { name: 'X' }).press('ArrowRight')

  const calculator = page.getByTestId('opengrid-target-dimension-calculator')
  await calculator.getByRole('textbox', { name: 'X（mm）' }).fill('100')
  await calculator.getByRole('textbox', { name: 'Y（mm）' }).fill('58')
  await calculator.getByRole('button', { name: '計算格數' }).click()

  const fitToTarget = page.getByRole('checkbox', {
    name: '用實體邊框補足目標尺寸',
  })
  await expect(fitToTarget).toBeEnabled()
  await fitToTarget.check()
  await expect(page.getByText('尺寸：100 × 58 × 4 mm')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('opengrid-panel')).toBeVisible()
  const restoredCalculator = page.getByTestId(
    'opengrid-target-dimension-calculator',
  )
  await expect(
    restoredCalculator.getByRole('textbox', { name: 'X（mm）' }),
  ).toHaveValue('100')
  await expect(
    restoredCalculator.getByRole('textbox', { name: 'Y（mm）' }),
  ).toHaveValue('58')
  await expect(
    page.getByRole('checkbox', { name: '用實體邊框補足目標尺寸' }),
  ).toBeChecked()
})

test('OpenGrid generates a centered frame for a 100 mm target from a 3 by 3 grid', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')
  await page.getByRole('slider', { name: 'X' }).fill('3')
  await page.getByRole('slider', { name: 'Y' }).fill('3')

  const calculator = page.getByTestId('opengrid-target-dimension-calculator')
  await calculator.getByRole('textbox', { name: 'X（mm）' }).fill('100')
  await calculator.getByRole('textbox', { name: 'Y（mm）' }).fill('100')
  await calculator.getByRole('button', { name: '計算格數' }).click()

  const fitToTarget = page.getByRole('checkbox', {
    name: '用實體邊框補足目標尺寸',
  })
  await fitToTarget.check()
  await expect(page.getByText('尺寸：100 × 100 × 4 mm')).toBeVisible()
  await expect(page.getByTestId('cad-error-toast')).toHaveCount(0)
  await expect(page.getByTestId('cad-viewport').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
})

test('OpenGrid print planning clears single-board target fitting', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')
  await page
    .getByRole('combobox', { name: 'OpenGrid X 半格方向' })
    .selectOption('right')

  const targetCalculator = page.getByTestId(
    'opengrid-target-dimension-calculator',
  )
  await targetCalculator.getByRole('textbox', { name: 'X（mm）' }).fill('100')
  await targetCalculator.getByRole('textbox', { name: 'Y（mm）' }).fill('58')
  await targetCalculator.getByRole('button', { name: '計算格數' }).click()

  const fitToTarget = page.getByRole('checkbox', {
    name: '用實體邊框補足目標尺寸',
  })
  await fitToTarget.check()

  const printPlanner = page.getByTestId('grid-dimension-calculator')
  await printPlanner.getByRole('textbox', { name: '目標 X（mm）' }).fill('1000')
  await printPlanner.getByRole('textbox', { name: '目標 Y（mm）' }).fill('1000')
  await printPlanner
    .getByRole('textbox', { name: '列印機 X（mm）' })
    .fill('256')
  await printPlanner
    .getByRole('textbox', { name: '列印機 Y（mm）' })
    .fill('256')
  await printPlanner.getByRole('button', { name: '計算列印分片' }).click()

  await expect(
    printPlanner.getByTestId('grid-print-plan-result'),
  ).toContainText('共 25 片')
  await expect(fitToTarget).not.toBeChecked()
})

test('grid dimension calculators remain usable on narrow viewports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })

  for (const path of ['/cad/modular-grid-base', '/cad/hsw-cell']) {
    await page.goto(path)
    const calculator = page.getByTestId('grid-dimension-calculator')
    await expect(calculator).toBeVisible()
    await expect(
      calculator.getByRole('textbox', { name: 'X（mm）' }),
    ).toBeVisible()
    await expect(
      calculator.getByRole('textbox', { name: 'Y（mm）' }),
    ).toBeVisible()
    await expect(
      calculator.getByRole('button', { name: '計算格數' }),
    ).toBeVisible()
    const targetX = calculator.getByRole('textbox', { name: 'X（mm）' })
    const calculateButton = calculator.getByRole('button', {
      name: '計算格數',
    })
    const targetXBottom = await targetX.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    const calculateButtonBottom = await calculateButton.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    expect(Math.abs(calculateButtonBottom - targetXBottom)).toBeLessThanOrEqual(
      1,
    )
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBeTruthy()
  }

  await page.goto('/cad/opengrid')
  const openGridCalculator = page.getByTestId('grid-dimension-calculator')
  for (const label of [
    '目標 X（mm）',
    '目標 Y（mm）',
    '列印機 X（mm）',
    '列印機 Y（mm）',
  ]) {
    await expect(
      openGridCalculator.getByRole('textbox', { name: label }),
    ).toBeVisible()
  }
  await expect(
    openGridCalculator.getByRole('button', { name: '計算列印分片' }),
  ).toBeVisible()
  const openGridTargetX = openGridCalculator.getByRole('textbox', {
    name: '目標 X（mm）',
  })
  const openGridTargetY = openGridCalculator.getByRole('textbox', {
    name: '目標 Y（mm）',
  })
  const openGridPrinterX = openGridCalculator.getByRole('textbox', {
    name: '列印機 X（mm）',
  })
  const openGridPrinterY = openGridCalculator.getByRole('textbox', {
    name: '列印機 Y（mm）',
  })
  await expect(openGridTargetX).toBeVisible()
  await expectSameRow(openGridTargetX, openGridTargetY)
  await expectSameRow(openGridPrinterX, openGridPrinterY)
  await openGridTargetX.fill('1000')
  await openGridCalculator
    .getByRole('textbox', { name: '目標 Y（mm）' })
    .fill('1000')
  await openGridCalculator
    .getByRole('textbox', { name: '列印機 X（mm）' })
    .fill('256')
  await openGridCalculator
    .getByRole('textbox', { name: '列印機 Y（mm）' })
    .fill('256')
  await openGridCalculator.getByRole('button', { name: '計算列印分片' }).click()
  await expect(
    openGridCalculator.getByTestId('grid-print-plan-result'),
  ).toContainText('共 25 片')
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBeTruthy()
})
