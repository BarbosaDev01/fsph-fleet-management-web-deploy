import { expect, test } from '@playwright/test';
import { openNavigation, prepareDemoSession } from './demo-session';
test.beforeEach(async ({ page }) => prepareDemoSession(page));

test('UI: painel com fontes de API e navegação única em todos os tamanhos', async ({ page }) => {
  for (const width of [1920, 1440, 1366, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demonstracoes/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Painel da frota' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Veículos ativos' })).toBeVisible();
    await expect(page.getByText(/Indicadores históricos de consumo/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const nav = await openNavigation(page);
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Painel da frota' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await nav.getByRole('link', { name: 'Painel da frota' }).click();
    await expect(page.getByText('Ana Coordenadora')).toHaveCount(0);
  }
});
