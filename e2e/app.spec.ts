import { expect, test } from '@playwright/test';

test('exibe a tela de motoristas e veículos', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Motoristas e Veículos' })).toBeVisible();

  await expect(page.getByRole('tab', { name: 'Veículos' })).toBeVisible();

  await expect(page.getByRole('tab', { name: 'Motoristas' })).toBeVisible();

  await expect(page.getByText('Veículos cadastrados')).toBeVisible();

  await expect(page.getByRole('button', { name: /cadastrar veículo/i })).toBeVisible();

  await page.getByRole('tab', { name: 'Motoristas' }).click();

  await expect(page.getByText('Motoristas cadastrados')).toBeVisible();

  await expect(page.getByRole('button', { name: /cadastrar motorista/i })).toBeVisible();
});
