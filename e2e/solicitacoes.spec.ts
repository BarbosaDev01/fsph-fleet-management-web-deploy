import { expect, test } from '@playwright/test';
import { openNavigation, prepareDemoSession } from './demo-session';
test.beforeEach(async ({ page }) => prepareDemoSession(page));

test('UI: aliases incorporados navegam entre módulos reais', async ({ page }) => {
  await page.goto('/demonstracoes/solicitacoes');
  await expect(page.getByRole('heading', { name: 'Solicitações de viagem' })).toBeVisible();
  await page.getByRole('link', { name: 'Nova solicitação', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Nova solicitação de viagem' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const nav = await openNavigation(page);
  await nav.getByRole('link', { name: 'Atendimento e agendamento' }).click();
  await expect(page).toHaveURL(/\/atendimento-svo$/);
  await expect(page.getByRole('heading', { name: 'Atendimento e agendamento' })).toBeVisible();
});

test('UI: listagem responsiva distingue filtros e vazio', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/solicitacoes');
    await expect(page.getByRole('cell', { name: 'Hospital', exact: true })).toBeVisible();
    await page.getByLabel('Buscar solicitação').fill('inexistente');
    await expect(page.getByText('Nenhum registro encontrado.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
