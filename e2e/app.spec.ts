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

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
]) {
  test(`fluxos e teclado em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const search = page.getByRole('textbox', { name: 'Pesquisar' });
    await search.fill('Fiat');
    await page.getByRole('combobox', { name: 'Status', exact: true }).click();
    await page.getByRole('option', { name: 'Manutenção' }).click();
    await expect(page.getByRole('cell', { name: 'GHI-7J89', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ABC-1D23', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    const details = page.getByRole('button', { name: 'Detalhes do veículo ABC-1D23' });
    // Reach the details action using Tab, then activate it with Enter.
    await search.focus();
    for (
      let step = 0;
      step < 12 && !(await details.evaluate((element) => element === document.activeElement));
      step++
    ) {
      await page.keyboard.press('Tab');
    }
    await expect(details).toBeFocused();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Detalhes do veículo' });
    await expect(dialog.getByText('Modelo: Fiat Argo')).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`detalhes-${viewport.width}.png`),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(details).toBeFocused();
    await page.screenshot({
      path: test.info().outputPath(`veiculos-${viewport.width}.png`),
      fullPage: true,
    });

    await page.getByRole('tab', { name: 'Motoristas' }).click();
    await page.getByRole('combobox', { name: 'Setor', exact: true }).click();
    await page.getByRole('option', { name: 'Operações' }).click();
    await page.getByRole('combobox', { name: 'Status', exact: true }).click();
    await page.getByRole('option', { name: 'Em rota' }).click();
    await expect(page.getByText('Nenhum resultado para os filtros selecionados.')).toBeVisible();
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page.getByRole('cell', { name: 'Maria Santos' })).toBeVisible();
    for (const control of [
      search,
      page.getByRole('combobox', { name: 'Setor', exact: true }),
      page.getByRole('combobox', { name: 'Status', exact: true }),
      page.getByRole('button', { name: 'Limpar filtros' }),
    ]) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`motoristas-${viewport.width}.png`),
      fullPage: true,
    });

    await page.getByRole('button', { name: /cadastrar motorista/i }).click();
    const form = page.getByRole('dialog');
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(form.getByText('Preencha este campo.')).toHaveCount(3);
    await expect(form.getByRole('textbox', { name: /Nome completo/ })).toBeFocused();
    await form.getByRole('textbox', { name: /Nome completo/ }).fill('Teste E2E');
    await form.getByRole('textbox', { name: /Número da habilitação/ }).fill('99887766554');
    await form.getByRole('textbox', { name: /Setor/ }).fill('Operações');
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('cell', { name: 'Teste E2E' })).toBeVisible();
  });
}
