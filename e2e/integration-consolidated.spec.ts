import { expect, test } from '@playwright/test';
import { prepareDemoSession } from './demo-session';
for (const path of [
  '/demonstracoes/cartoes-combustivel',
  '/demonstracoes/cartoes-combustivel/novo',
  '/demonstracoes/cartoes-combustivel/demo-1/editar',
]) {
  test(`cartões exigem JWT validado: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  });
}
for (const width of [1440, 768, 390]) {
  test(`UI: catálogo pendente e shell único em ${width}px`, async ({ page }, testInfo) => {
    await prepareDemoSession(page);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/demonstracoes');
    await expect(
      page.getByRole('heading', { name: 'Protótipos pendentes', exact: true }),
    ).toBeVisible();
    for (const path of ['cartoes-combustivel', 'atendimento-svo', 'recuperar-senha']) {
      await page.locator(`main a[href="/demonstracoes/${path}"]`).click();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByText(/Protótipos pendentes: dados simulados/)).toBeVisible();
      await expect(page.getByText('Clara Operações')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: testInfo.outputPath(`prototype-${path}-${width}.png`),
        fullPage: true,
      });
      await page.getByRole('link', { name: 'Todos os protótipos pendentes', exact: true }).click();
    }
    for (const [path, target] of [
      ['dashboard', '/dashboard'],
      ['dashboard-usuarios', '/dashboard'],
      ['cadastro-usuarios', '/usuarios/novo'],
      ['diretorio', '/usuarios'],
      ['frota/motoristas', '/motoristas'],
      ['frota/veiculos', '/veiculos'],
      ['solicitacoes', '/solicitacoes'],
      ['login', '/conta'],
      ['cadastro', '/usuarios/novo'],
      ['alterar-senha', '/conta'],
    ]) {
      await page.goto(`/demonstracoes/${path}`);
      await expect(page).toHaveURL(new RegExp(target + '$'));
      if (target.endsWith('/novo')) {
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
      }
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    }
    for (const path of [
      'dashboard',
      'veiculos',
      'motoristas',
      'solicitacoes',
      'usuarios',
      'atendimento-svo',
    ]) {
      await page.goto(`/${path}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole('progressbar')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath(`${path}-${width}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
