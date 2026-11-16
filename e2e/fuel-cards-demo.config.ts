import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
// Configuração somente da HU30, sem modificar o Playwright dos demais módulos.
process.env.HU30_DEMO_E2E = 'true';
export default defineConfig({
  testDir: '.',
  testMatch: 'fuel-cards-demo.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', ...devices['Desktop Chrome'] },
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    command:
      'node node_modules/vite/bin/vite.js build --outDir dist-fuel-demo && node node_modules/vite/bin/vite.js preview --outDir dist-fuel-demo --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: { VITE_APP_ENV: 'staging', VITE_FUEL_CARDS_DEMO: 'true' },
  },
});
