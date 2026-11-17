import { expect, test } from '@playwright/test';
import { prepareDemoSession } from './demo-session';
test.beforeEach(async ({ page }) => prepareDemoSession(page));

test('UI: formulário canônico responsivo com retorno e finalidade', async ({ page }) => {
  for (const width of [1920, 1440, 1366, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demonstracoes/solicitacoes/nova');
    await expect(page).toHaveURL(/\/solicitacoes\/nova$/);
    const dialog = page.getByRole('dialog', { name: 'Nova solicitação de viagem' });
    await expect(dialog.getByLabel('Retorno previsto')).toBeVisible();
    await expect(dialog.getByLabel('Finalidade')).toBeVisible();
    await expect(dialog.getByLabel('Número de passageiros')).toHaveAttribute(
      'aria-required',
      'true',
    );
    await expect(page.getByRole('radio', { name: /rota/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
  }
});
