import type { Page } from '@playwright/test';

export async function prepareDemoSession(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem('fsph-fleet-management.access-token', 'demo-e2e-token'),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      json: {
        id: 'demo-e2e',
        name: 'Demo de interface',
        email: 'e2e@example.test',
        sectorId: null,
        role: 'ADMIN',
      },
    }),
  );
}
