import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'operations-real.spec.ts',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../.deploy-validation/api-integration/e2e-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'https://fsph-fleet-web-staging.vercel.app',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    timezoneId: 'America/Fortaleza',
  },
});
