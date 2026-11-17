import { expect, test } from '@playwright/test';
import { prepareDemoSession } from './demo-session';
test.beforeEach(async ({ page }) => prepareDemoSession(page));

for (const width of [1440, 768, 390]) {
  test(`UI: motorista vincula usuário sem veículo permanente em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demonstracoes/frota/motoristas/novo');
    await expect(page).toHaveURL(/\/motoristas\/novo$/);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Veículo')).toHaveCount(0);
    await dialog.getByRole('combobox', { name: 'Usuário motorista' }).click();
    await page.getByRole('option', { name: /Novo usuário motorista/ }).click();
    const created = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === '/api/v1/drivers' && request.method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    expect((await created).postDataJSON()).toEqual({ userId: 'new-driver-user' });
    const row = page.getByRole('row').filter({ hasText: 'Novo usuário motorista' });
    await expect(row).toBeVisible();
    await page.reload();
    await expect(row).toBeVisible();
    await row.getByRole('link', { name: 'Detalhes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Detalhes do motorista' })).toBeVisible();
    await expect(page.getByText('Identificador do usuário: new-driver-user')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
