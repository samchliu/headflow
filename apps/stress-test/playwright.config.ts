import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.(spec|e2e)\.[jt]s$/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Use dev server — no build step required. For CI, set HEADFLOW_USE_PREVIEW=1
    // and run `pnpm build && pnpm preview` manually before running tests.
    command: process.env.HEADFLOW_USE_PREVIEW ? 'pnpm preview' : 'pnpm dev',
    port: 4200,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
