import { expect, test } from '@playwright/test';

test('Solicitações abre Nova solicitação pelo botão da listagem e navega pelas telas existentes', async ({
  page,
}) => {
  await page.goto('/demonstracoes/solicitacoes');
  await expect(page.getByRole('heading', { name: 'Solicitações' })).toBeVisible();
  await page.getByRole('link', { name: 'Nova solicitação' }).click();
  await expect(page).toHaveURL(/\/solicitacoes\/nova$/);
  await expect(page.getByRole('heading', { name: 'Nova solicitação' })).toBeVisible();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'Atendimento SVO' }).click();
  await expect(page).toHaveURL(/\/atendimento-svo$/);
  await page.getByRole('link', { name: 'Solicitações' }).click();
  await expect(page).toHaveURL(/\/solicitacoes$/);
});

test('listagem de solicitações se adapta aos principais tamanhos de viewport', async ({ page }) => {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/demonstracoes/solicitacoes');
    await expect(page.getByRole('heading', { name: 'Solicitações' })).toBeVisible();
    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sidebar: document.querySelector('.dashboard-sidebar')?.getBoundingClientRect(),
      main: document.querySelector('.solicitacoes-main')?.getBoundingClientRect(),
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
    if (viewport.width <= 820) {
      expect(layout.sidebar!.width).toBeCloseTo(layout.clientWidth, 0);
      expect(layout.sidebar!.bottom).toBeLessThanOrEqual(layout.main!.top + 1);
    } else {
      expect(layout.sidebar!.right).toBeLessThanOrEqual(layout.main!.left + 1);
    }
  }
});
import { prepareDemoSession } from './demo-session';

test.beforeEach(async ({ page }) => prepareDemoSession(page));
