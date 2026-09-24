import { expect, test } from '@playwright/test'
import { localizedPathFor } from '../../src/i18n/routes'

test('downloads workspace settings and imports them into the playground', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto(localizedPathFor('zh-Hant', '/cad/box'))
  const downloadSettings = page.getByTestId('cad-download-settings')
  await expect(downloadSettings).toBeEnabled({ timeout: 90_000 })

  const settingsDownload = page.waitForEvent('download')
  await downloadSettings.click()
  const settingsFile = await settingsDownload
  expect(settingsFile.suggestedFilename()).toBe('box-settings.json')

  await page.goto(localizedPathFor('zh-Hant', '/cad/playground'))
  const path = await settingsFile.path()
  await page.getByTestId('playground-import-input').setInputFiles({
    name: 'box-settings.json',
    mimeType: 'application/json',
    buffer: await import('node:fs').then((fs) => fs.readFileSync(path!)),
  })

  await expect(page.getByTestId('playground-instance-inst-1')).toBeVisible()
})
