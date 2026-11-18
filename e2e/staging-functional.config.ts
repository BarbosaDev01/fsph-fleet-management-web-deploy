import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const node = `"${process.execPath}"`;
const output = '.deploy-validation/staging-artifact';
export default defineConfig({
  testDir: '.',
  testMatch: 'staging-functional.spec.ts',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../.deploy-validation/staging-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'https://fsph-fleet-web-staging.vercel.app',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    timezoneId: 'America/Fortaleza',
  },
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { VITE_APP_ENV: 'staging', VITE_API_URL: 'https://fsph-fleet-api-staging.onrender.com' },
    command: `${node} node_modules/vite/bin/vite.js build --outDir ${output} && ${node} node_modules/vite/bin/vite.js preview --outDir ${output} --host 127.0.0.1 --port 4181`,
    url: 'http://127.0.0.1:4181',
    reuseExistingServer: false,
  },
});
