import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: '.',
  testMatch: ['profiles-local.spec.ts', 'user-assignment-local.spec.ts'],
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: fileURLToPath(
          new URL('../.deploy-validation/perfis-local/results.json', import.meta.url),
        ),
      },
    ],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5183',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5183`,
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
    env: { VITE_APP_ENV: 'production', VITE_FUEL_CARDS_DEMO: 'false' },
  },
});
