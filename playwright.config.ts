import { defineConfig, devices } from '@playwright/test'

function getPlaywrightPort(): number {
  const configuredPort = process.env.PLAYWRIGHT_PORT

  if (!configuredPort) {
    return 3456
  }

  const parsedPort = Number(configuredPort)

  if (
    !Number.isInteger(parsedPort) ||
    parsedPort < 1024 ||
    parsedPort > 65535
  ) {
    throw new Error('PLAYWRIGHT_PORT must be an integer between 1024 and 65535')
  }

  return parsedPort
}

const playwrightPort = getPlaywrightPort()
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: playwrightBaseUrl,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `PLAYWRIGHT_E2E=1 pnpm dev --host 127.0.0.1 --port ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
})
