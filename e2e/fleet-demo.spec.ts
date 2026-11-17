import { expect, test } from '@playwright/test';
import { openNavigation, prepareDemoSession } from './demo-session';
test.beforeEach(async ({ page }) => prepareDemoSession(page));

test('UI: navegação dos cadastros mantém histórico e uma única sessão', async ({ page }) => {
  await page.goto('/demonstracoes/frota');
  await expect(page).toHaveURL(/\/motoristas$/);
  await expect(page.getByRole('heading', { name: 'Motoristas', exact: true })).toBeVisible();
  await (await openNavigation(page)).getByRole('link', { name: 'Veículos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Veículos', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/motoristas$/);
});
for (const width of [1440, 768, 390]) {
  test(`UI: filtros, detalhes e teclado em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/veiculos');
    const search = page.getByLabel('Buscar em veículos');
    await search.fill('inexistente');
    await expect(page.getByText('Nenhum registro encontrado.')).toBeVisible();
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await page.getByRole('combobox', { name: 'Situação' }).click();
    await page.getByRole('option', { name: 'Ativo', exact: true }).click();
    const row = page.getByRole('row').filter({ hasText: 'ABC1D23' });
    await expect(row).toBeVisible();
    await expect(page.getByRole('cell', { name: 'DEF4G56' })).toHaveCount(0);
    const details = row.getByRole('link', { name: 'Detalhes', exact: true });
    await details.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Detalhes do veículo' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Consultar documentos' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
