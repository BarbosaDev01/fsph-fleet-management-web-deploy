import { expect, test } from '@playwright/test';

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

test('dashboard se adapta aos viewports e mantém os filtros acessíveis', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/demonstracoes/dashboard');
    await expect(page.getByRole('heading', { name: 'Visão geral da frota' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Filtrar por setor' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Filtrar por período' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sidebar: document.querySelector('.dashboard-sidebar')?.getBoundingClientRect(),
      main: document.querySelector('.dashboard-main')?.getBoundingClientRect(),
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    if (viewport.width > 820) {
      expect(dimensions.sidebar!.right).toBeLessThanOrEqual(dimensions.main!.left + 1);
    } else {
      expect(dimensions.sidebar!.bottom).toBeLessThanOrEqual(dimensions.main!.top + 1);
    }
  }
});
import { prepareDemoSession } from './demo-session';

test.beforeEach(async ({ page }) => prepareDemoSession(page));
