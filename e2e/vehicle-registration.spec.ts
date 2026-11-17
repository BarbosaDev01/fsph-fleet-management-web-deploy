import { expect, test } from '@playwright/test';
import { prepareDemoSession } from './demo-session';
test.beforeEach(async ({ page }) => prepareDemoSession(page));

for (const width of [1440, 768, 390]) {
  test(`UI: veículo cria, edita, recarrega e desativa em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demonstracoes/frota/veiculos/novo');
    await expect(page).toHaveURL(/\/veiculos\/novo$/);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (const [label, value] of Object.entries({
      Placa: 'XYZ9A12',
      Modelo: 'Van de teste',
      Capacidade: '8',
      'Tipo de uso': 'Coleta',
      'Quilometragem atual (km)': '100',
    }))
      await dialog.getByLabel(label, { exact: true }).fill(value);
    const create = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === '/api/v1/vehicles' && request.method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    expect((await create).postDataJSON()).toEqual({
      sectorId: null,
      plate: 'XYZ9A12',
      model: 'Van de teste',
      capacity: 8,
      usageType: 'Coleta',
      currentOdometerKm: 100,
    });
    const row = page.getByRole('row').filter({ hasText: 'XYZ9A12' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Modelo', { exact: true }).fill('Van atualizada');
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
    await expect(row).toContainText('Van atualizada');
    await page.reload();
    await expect(row).toContainText('Van atualizada');
    await row.getByRole('button', { name: 'Desativar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
    await expect(row).toContainText('Inativo');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
