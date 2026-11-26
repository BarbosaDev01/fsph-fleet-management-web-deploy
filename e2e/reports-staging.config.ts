import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'reports-real.spec.ts',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../.deploy-validation/reports-real/results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.REPORTS_WEB_URL ?? 'https://fsph-fleet-web-staging.vercel.app',
    timezoneId: 'America/Fortaleza',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
