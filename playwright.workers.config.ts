import { defineConfig, devices } from '@playwright/test'

const localBaseURL = 'http://127.0.0.1:4179'
const remoteBaseURL = process.env.WORKERS_TEST_BASE_URL

const config = defineConfig({
  testDir: './tests/e2e-workers',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: remoteBaseURL || localBaseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})

if (!remoteBaseURL) {
  config.webServer = {
    command:
      'pnpm build && pnpm exec wrangler dev --local --ip 127.0.0.1 --port 4179',
    url: `${localBaseURL}/en/`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { WRANGLER_SEND_METRICS: 'false', BROWSER: 'none' },
  }
}

export default config
