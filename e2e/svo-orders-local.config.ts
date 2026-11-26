import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const webPort = Number(process.env.FSPH_SVO_WEB_PORT ?? 9194);
export default defineConfig({
  testDir: '.',
  testMatch: ['svo-orders-local.spec.ts', 'reports-real.spec.ts'],
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: '.deploy-validation/svo-local/browser-results.json' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: 'off',
    actionTimeout: 15000,
    screenshot: 'only-on-failure',
  },
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${webPort}`,
    url: `http://127.0.0.1:${webPort}`,
    reuseExistingServer: false,
    env: { VITE_APP_ENV: 'production', VITE_FUEL_CARDS_DEMO: 'false' },
  },
});
