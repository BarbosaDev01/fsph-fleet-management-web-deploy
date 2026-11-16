import { defineConfig, devices } from '@playwright/test';

const node = `"${process.execPath}"`;
const vite = 'node_modules/vite/bin/vite.js';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/fuel-cards.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'production',
      testMatch: '**/fuel-cards.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  webServer: [
    {
      env: { VITE_APP_ENV: 'staging', VITE_FUEL_CARDS_DEMO: 'true' },
      command: `${node} ${vite} build && ${node} ${vite} preview --host 127.0.0.1`,
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
    {
      env: { VITE_APP_ENV: 'production', VITE_FUEL_CARDS_DEMO: 'true' },
      command: `${node} ${vite} build --outDir dist-production-e2e && ${node} ${vite} preview --outDir dist-production-e2e --host 127.0.0.1 --port 4174`,
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
    },
  ],
});
