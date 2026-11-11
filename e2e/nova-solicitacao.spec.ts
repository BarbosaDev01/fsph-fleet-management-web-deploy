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

test('Nova solicitação se adapta aos viewports sem overflow horizontal', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/solicitacoes/nova');

    await expect(page.getByRole('heading', { name: 'Nova solicitação' })).toBeVisible();
    await expect(page.getByLabel('Quantidade de passageiros *')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sidebar: document.querySelector('.dashboard-sidebar')?.getBoundingClientRect(),
      main: document.querySelector('.nova-main')?.getBoundingClientRect(),
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    expect(dimensions.sidebar).toBeTruthy();
    expect(dimensions.main).toBeTruthy();
    if (viewport.width > 820) {
      expect(dimensions.sidebar!.right).toBeLessThanOrEqual(dimensions.main!.left + 1);
    } else {
      expect(dimensions.sidebar!.bottom).toBeLessThanOrEqual(dimensions.main!.top + 1);
    }
  }
});
