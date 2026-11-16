import { expect, test } from '@playwright/test';
import { prepareDemoSession } from './demo-session';

for (const path of [
  '/demonstracoes/cartoes-combustivel',
  '/demonstracoes/cartoes-combustivel/novo',
  '/demonstracoes/cartoes-combustivel/demo-1/editar',
]) {
  test(`cartões exigem sessão real: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
    await expect(page.getByText('•••• 1042', { exact: true })).toHaveCount(0);
  });
}

for (const width of [1440, 390]) {
  test(`catálogo integrado e CSS entre módulos em ${width}px`, async ({ page }, testInfo) => {
    await prepareDemoSession(page);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/demonstracoes');
    for (const path of [
      'dashboard',
      'dashboard-usuarios',
      'atendimento-svo',
      'cartoes-combustivel',
      'frota/motoristas',
      'frota/veiculos',
      'solicitacoes',
      'solicitacoes/nova',
      'cadastro-usuarios',
      'diretorio',
      'login',
      'cadastro',
      'recuperar-senha',
      'alterar-senha',
    ]) {
      await page.locator(`main a[href="/demonstracoes/${path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/demonstracoes/${path}$`));
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      if (path === 'dashboard-usuarios') {
        await expect(page.getByRole('table', { name: 'Rotas ativas' })).toBeVisible();
      }
      await expect(
        page.getByText(/Demonstração de interface: estas telas usam dados simulados/),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (
        ['dashboard', 'dashboard-usuarios', 'atendimento-svo', 'cartoes-combustivel'].includes(path)
      ) {
        await page.screenshot({ path: testInfo.outputPath(`${path}.png`), fullPage: true });
      }
      await page.getByRole('link', { name: 'Todas as novas telas', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Novas telas integradas' })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
