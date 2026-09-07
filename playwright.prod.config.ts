import { defineConfig, devices } from '@playwright/test'

// Production-build e2e: verifies behavior that only exists once
// import.meta.env.DEV is false (e.g. the hidden STEP download action).
// Run with `pnpm test:e2e:prod`; the default suite stays on `pnpm dev`.

const prodPort = 4178
const prodBaseUrl = `http://127.0.0.1:${prodPort}`

export default defineConfig({
  testDir: './tests/e2e-prod',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: prodBaseUrl,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${prodPort}`,
    url: prodBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
